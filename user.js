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

User.prototype.echo = function (event, data) {
  if (!!this.socket) {
    this.socket.emit(event, data);
    debug('%s echo: %s', this.name, event);
    return this;
  }

  debug('echo failed: socket: %s', this.socket);
  return this;
};

User.prototype.broadcast = function (event, data, to) {
  to = to || this.room.name;

  if (!!this.socket || !!to) {
    this.socket.broadcast.to(to).emit(event, data);
    debug('%s broadcast to %s: %s', this.name, to, event);
    return this;
  }

  debug('broadcast failed: socket: %s, to: %s', this.socket, to);
  return this;
};

User.prototype.join = function (room, fn) {

  // leave current room if possible
  this.leave();

  // socket.join is async
  var user = this;
  this.socket.join(room.name, function () {

    user.room = room;
    room.addUser(user);

    debug('%s joined room %s', user.name, user.room.name);

    if (!!fn) fn.call(user);
  });

  return this;
};

User.prototype.leave = function (fn) {
  if (!!this.room) {

    // socket.leave is async
    var user = this;
    this.socket.leave(this.room.name, function () {

      var room = user.room;

      user.room.removeUser(user);
      user.room = undefined;

      debug('%s left room %s', user.name, room.name);

      if (!!fn) fn.call(user);
    });
  }

  return this;
};

module.exports = User;
