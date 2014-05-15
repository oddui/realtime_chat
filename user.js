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
  this._id = doc._id;
  this.name = doc.name;
  this.room_id = doc.room_id;
  this.connected = doc.connected;
  this.lastSeenAt = doc.lastSeenAt;
};

User.setup = function (dep) {
  // dependency injection
  // to avoid circular require calls
  Room = dep;
};

User.getById = function (_id, fn) {
  users.findOne({ _id: _id}, function (err, doc) {
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

User.deleteById = function(_id, fn) {
  users.remove({_id: _id}, {}, function (err, numRemoved) {
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

User.count = function(fn) {
  users.count({}, function (err, count) {
    if (err) return fn(err);
    fn(err, count);
  });
};

// fn is called with err and doc/numUpdated(depending on whether it's an insert or update)
User.prototype.save = function (fn) {
  var self = this;

  if (!self._id) {
    // insert new document
    users.insert({
      name: self.name,
      room_id: self.room_id,
      connected: self.connected,
      lastSeenAt: new Date(),
    }, function (err, doc) {
      if (err) return fn(err);
      debug('user %s saved', doc.name);

      self._id = doc._id;
      fn(err, doc);
    });

  } else {
    // update
    users.update({_id: self._id}, {
      name: self.name,
      room_id: self.room_id,
      connected: self.connected,
      lastSeenAt: new Date(),
    }, {}, function (err, numUpdated) {
      if (err) return fn(err);
      debug('user %s updated', self.name);

      fn(err, numUpdated);
    });
  }

  return this;
};

// popolate room attribute as a room object
User.prototype.populate = function (fn) {
  var self = this;

  if (self.room_id && !(self.room instanceof Room)) {
    Room.getById(self.room_id, function (err, room) {
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
  if (this._id) {
    User.deleteById(this._id, fn);
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
  this.connected = true;
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

    this.connected = false;
    this.save(function () {
      if (err) return fn.call(this, err);

      debug('%s disconnected', this.name);
      if (fn) fn.call(this);
    });
  });
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
  to = to || this.room_id;

  if (this.socket || to) {
    this.socket.broadcast.to(to).emit(event, data);
    debug('%s broadcast to %s: %s', this.name, to, event);
    return this;
  }

  debug('%s broadcast failed: socket %s, to %s', this.name, this.socket, to);
  return this;
};

User.prototype.join = function (room, fn) {
  // leave current room if possible
  return this.leave(function () {
    var self = this;
    this.socket.join(room._id, function () {

      self.room_id = room._id;
      self.room = room;
      self.save(function () {
        debug('%s joined room %s', self.name, self.room.name);
        if (fn) fn.call(self);
      });
    });
  });
};

User.prototype.leave = function (fn) {
  if (this.room_id) {
    var self = this;

    var leave = function () {
      self.socket.leave(self.room_id, function () {
        var room = self.room;

        self.room_id = undefined;
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
