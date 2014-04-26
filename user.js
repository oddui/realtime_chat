var debug = require('debug')('rtc:user');

// users data store
var users = [];

// user object
var User = function (socket, name) {
  // make sure user names are unique
  if (User.getByName(name)) {
    throw new Error('user name already exists');
  }

  this.name = name;
  this.room = undefined;
  this.connect(socket);

  users.push(this);
};

User.getAll = function () {
  return users;
};

User.getByName = function (name) {
  var result;
  users.forEach(function (user) {
    if (user.name === name) {
      result = user;
    }
  });
  return result;
};

User.prototype.connect = function (socket) {
  this.socket = socket;
  return this;
};

User.prototype.disconnect = function () {
  this.leave();

  this.socket = undefined;

  // remove this user from data store
  users.splice(users.indexOf(this), 1);

  return this;
};

User.prototype.broadcast = function (event, data) {
  if (!!this.socket && !!this.room) {
    this.socket.broadcast.to(this.room.name).emit(event, data);
    return this;
  }

  debug('broadcast failed: socket: %s, room: %s', this.socket, this.room);
  return this;
};

User.prototype.join = function (room, fn) {

  // leave current room if possible
  this.leave();

  // add this user to room's users list
  room.addUser(this);

  this.room = room;

  this.socket.join(room.name, fn);
  this.socket.emit('joined', {
    numberOfUsers: this.room.users.length
  });

  return this.broadcast('user joined', {
    username: this.name,
    numberOfUsers: this.room.users.length
  });
};

User.prototype.leave = function (fn) {
  if (!!this.room) {

    this.socket.leave(this.room.name, fn);

    // remove this user from room's users list
    this.room.removeUser(this);


    debug('%s left room %s', this.name, this.room.name);

    this.broadcast('user left', {
      username: this.name,
      numberOfUsers: this.room.users.length
    });

    this.room = undefined;
  }

  return this;
};

module.exports = User;
