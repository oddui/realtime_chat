var debug = require('debug')('rtc:user');
var util = require('util');
var async = require('async');
var config = require('./config');
var Datastore = require('nedb');
var Room;

// users data store
var users = new Datastore({
  filename: config.db.users,
  autoload: true,
});

// user object
var User = function (doc) {
  this.id = doc._id;
  this.name = doc.name;
  this.roomId = doc.roomId;
  this.socketId = doc.socketId;
  this.lastSeenAt = doc.lastSeenAt;
};

User.setup = function (dep) {
  // dependency injection
  // to avoid circular require calls
  Room = dep;
};

User.getById = function (id, fn) {
  users.findOne({_id: id}, function (err, doc) {
    if (err) return fn(err);

    if (doc) {
      // if a doc is found, convert to user, populate and pass to fn
      (new User(doc, undefined)).populate(function (err, user) {
        fn(err, user);
      });
    } else {
      fn(err);
    }
  });
};

User.get = function (fields, fn) {
  users.find(fields, function (err, docs) {
    if (err) return fn(err);

    // convert doc to user object
    var convert = function (doc, done) {
      var user = new User(doc, undefined);
      // populate
      user.populate(function (err, user) {
        done(err, user);
      });
    };

    // map docs to users
    async.map(docs, convert, function (err, users) {
      fn(err, users);
    });
  });
};

User.getAll = function (fn) {
  this.get({}, function (err, users) {
    if (err) return fn(err);
    fn(err, users);
  });
};

User.getByName = function (name, fn) {
  this.get({name: name}, function (err, users) {
    if (err) return fn(err);
    fn(err, users);
  });
};

User.deleteById = function(id, fn) {
  users.remove({_id: id}, {}, function (err, numRemoved) {
    if (err) return fn(err);
    debug('%d user(s) deleted', numRemoved);
    if (fn) fn(err, numRemoved);
  });
};

User.deleteAll = function(fn) {
  users.remove({}, {multi: true}, function (err, numRemoved) {
    if (err) return fn(err);
    debug('%d user(s) deleted', numRemoved);
    if (fn) fn(err, numRemoved);
  });
};

User.count = function(fields, fn) {
  if (typeof (fields) === 'function') {
    fn = fields;
    fields = {};
  }
  users.count(fields, function (err, count) {
    if (err) return fn(err);
    fn(err, count);
  });
};

// return doc that could be saved in data store
// eg. socket is circular structure and could
// not be stringified and saved
User.prototype.toDoc = function () {
  return {
    name: this.name,
    roomId: this.roomId,
    socketId: this.socket ? this.socket.id : undefined,
    lastSeenAt: new Date(),
  };
};

User.prototype.save = function (fn) {
  var self = this;

  if (!self.id) {
    // insert new document
    users.insert(self.toDoc(), function (err, doc) {
      if (err) return fn(err);
      debug('user %s saved', doc.name);

      self.id = doc._id;
      fn.call(self, err, doc);
    });

  } else {
    // update
    users.update({_id: self.id}, self.toDoc(), {}, function (err, numUpdated) {
      if (err) return fn(err);
      debug('user %s updated', self.name);

      fn.call(self, err, self.toDoc());
    });
  }

  return this;
};

// popolate room attribute as a room object
User.prototype.populate = function (fn) {
  var self = this;

  if (self.roomId && !(self.room instanceof Room)) {
    Room.getById(self.roomId, function (err, room) {
      if (err) return fn.call(self, err);
      // TODO: what about room not found
      //
      self.room = room;
      debug('%s populated, room name: %s', self.name, room.name);
      if (fn) fn.call(self, err, self);
    });
  } else {
    if (fn) process.nextTick(fn.bind(self, undefined, self));
  }
  return self;
};

User.prototype.destroy = function (fn) {
  if (this.id) {
    User.deleteById(this.id, fn);
  }
};

User.prototype.getRoom = function (fn) {
  if (!this.room) {
    this.populate(function (err, user) {
      fn(err, user.room);
    });
  } else {
    if (fn) process.nextTick(fn.bind(this, undefined, this.room));
  }
  return this;
};

User.prototype.connect = function (socket, fn) {
  var self = this;
  this.socket = socket;
  this.save(function (err) {
    if (err) {
      if (fn) fn.call(self, err);
      return;
    }

    debug('%s connected', self.name);
    if (fn) fn.call(self);
  });
  return this;
};

User.prototype.disconnect = function (fn) {
  return this.leave(function (err) {
    if (err) return fn.call(this, err);

    this.save(function () {
      if (err) return fn.call(this, err);

      debug('%s disconnected', this.name);
      if (fn) fn.call(this);
    });
  });
};

User.prototype.isConnected = function () {
  return !!this.socket;
};

User.prototype.echo = function (event, data) {
  if (!!this.socket) {
    this.socket.emit(event, data);
    debug('%s echo: %s', this.name, event);
    return this;
  }

  debug('%s echo failed: socket %s', this.name, this.socket);
  return this;
};

User.prototype.broadcast = function (event, data, to) {
  to = to || this.roomId;

  if (this.socket && to) {
    this.socket.broadcast.to(to).emit(event, data);
    debug('%s broadcast to %s: %s', this.name, to, event);
    return this;
  }

  debug('%s broadcast failed: socket %s, to %s', this.name, this.socket, to);
  this.echo('room_error', {
    message:'broadcast failed: room undefined',
  });
  return this;
};

User.prototype.join = function (room, fn) {
  // leave current room if possible
  return this.leave(function () {
    var self = this;
    this.socket.join(room.id, function () {

      self.roomId = room.id;
      self.room = room;
      self.save(function () {
        debug('%s joined room %s', self.name, self.room.name);
        if (fn) fn.call(self);
      });
    });
  });
};

User.prototype.leave = function (fn) {
  if (this.roomId) {
    var self = this;

    var leave = function () {
      self.socket.leave(self.roomId, function () {
        var room = self.room;

        self.roomId = undefined;
        self.room = undefined;
        self.save(function () {
          debug('%s left room %s', self.name, room.name);
          if (fn) fn.call(self);

          // close room if possible
          room.close();
        });
      });
    };

    // populate room object if possible
    this.populate(function (err) {
      if (err) return fn.call(self, err);

      leave();
    });

  } else {
    debug('leave failed, %s not in any room', this.name);
    // make sure fn is async
    if (fn) process.nextTick(fn.bind(this));
  }

  return this;
};

module.exports = User;
