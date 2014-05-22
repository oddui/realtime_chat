var debug = require('debug')('rtc:room');
var util = require('util');
var async = require('async');
var config = require('./config');
var Datastore = require('nedb');
var User;

// rooms data store
var rooms = new Datastore({
  filename: config.db.rooms,
  autoload: true,
});

var Room = function (doc) {
  this.id = doc._id;
  this.name = doc.name;
  this.lang = doc.lang || 'en';
  this.capacity = doc.capacity || 5;
  this.permanent = doc.permanent || false;
};

Room.setup = function (dep) {
  // dependency injection
  // to avoid circular require calls
  User = dep;
};

Room.getById = function (id, fn) {
  rooms.findOne({ _id: id}, function (err, doc) {
    if (err) return fn(err);

    if (doc) {
      fn(err, new Room(doc));
    } else {
      fn(err);
    }
  });
};

Room.get = function (fields, fn) {
  rooms.find(fields, function (err, docs) {
    if (err) return fn(err);

    var rooms = docs.map(function (doc) {
      return new Room(doc);
    });
    fn(err, rooms);
  });
};

Room.getAll = function (fn) {
  this.get({}, function (err, rooms) {
    if (err) return fn(err);
    fn(err, rooms);
  });
};

Room.getByName = function (name, fn) {
  this.get({name: name}, function (err, rooms) {
    if (err) return fn(err);
    fn(err, rooms);
  });
};

Room.deleteById = function(id, fn) {
  rooms.remove({_id: id}, {}, function (err, numRemoved) {
    if (err) return fn(err);
    debug('%d room(s) deleted', numRemoved);
    if (fn) fn(err, numRemoved);
  });
};

Room.deleteAll = function(fn) {
  rooms.remove({}, {multi: true}, function (err, numRemoved) {
    if (err) return fn(err);
    debug('%d room(s) deleted', numRemoved);
    if (fn) fn(err, numRemoved);
  });
};

Room.prototype.save = function (fn) {
  var self = this;

  if (!self.id) {
    // insert
    rooms.insert(self, function (err, doc) {
      if (err) return fn(err);

      self.id = doc._id;
      debug('room %s saved', doc.name);
      fn(err, doc);
    });
  } else {
    // update
    rooms.update({_id: self.id}, self, {}, function (err, numUpdated) {
      if (err) return fn(err);
      debug('room %s updated', self.name);
      fn(err, numUpdated);
    });
  }

  return this;
};

Room.prototype.destroy = function (fn) {
  if (this.id) {
    Room.deleteById(this.id, fn);
  }
};

Room.prototype.getUsers = function (fn) {
  User.get({roomId: this.id}, fn.bind(this));
};

Room.prototype.close = function (fn) {
  var self = this;

  self.getUsers(function (err, users) {
    if (err) return fn(err);

    if (users.length === 0 && !self.permanent) {
      // destroy room if room is empty not permanent
      self.destroy(function (err, numRemoved) {
        debug('room closed');
        if (fn) fn(err, numRemoved);
      });
    } else {
      debug('cannot close, room not empty or is permanent');
      if (fn) process.nextTick(fn.bind(self));
    }
  });
};

module.exports = Room;
