var debug = require('debug')('rtc:room');
var Datastore = require('nedb');

// rooms data store
var rooms = new Datastore({
  filename: 'db/rooms.db',
  autoload: true,
});

// rooms data store
var rooms = [];

var Room = function (name, lang, capacity) {
  // make sure room names are unique
  if (Room.getByName(name)) {
    throw new Error('room already exists');
  }

  this.name = name;
  this.lang = lang || 'en';
  this.capacity = capacity || 5;
  this.users = [];

  rooms.push(this);

  debug('created new room: %s', this.name);
};

Room.getAll = function () {
  return rooms;
};

Room.getByName = function (name) {
  var result;
  rooms.forEach(function (room) {
    if (room.name === name) {
      result = room;
    }
  });
  return result;
};

Room.prototype.getUsers = function () {
  return this.users;
};

Room.prototype.addUser = function (user) {
  if (this.users.length < this.capacity) {
    this.users.push(user);
    debug('room %s added user %s, %d/%d', this.name, user.name, this.users.length, this.capacity);

    return this;
  }

  debug('room full');
  return this;
};

Room.prototype.removeUser = function (user) {
  this.users.splice(this.users.indexOf(user), 1);
  debug('room %s removed user %s, %d/%d', this.name, user.name, this.users.length, this.capacity);

  // close room if possible
  this.close();

  return this;
};

Room.prototype.close = function () {

  if (this.users.length === 0) {
    // remove this room from data store
    rooms.splice(rooms.indexOf(this), 1);
    return this;
  }

  debug('cannot close, room not empty');
  return this;
};

module.exports = Room;
