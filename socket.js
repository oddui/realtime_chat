var debug = require('debug')('rtc:socket');
var socketio = require('socket.io');
var User = require('./user.js');
var Room = require('./room.js');
var io;

module.exports = function (server) {

  io = socketio(server);

  // Chatroom

  io.on('connection', function (socket) {

    var user;
    var room = Room.getByName('A Room') || new Room('A Room');

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {

      try {
        user = new User(socket, username);
        user.join(room);
      } catch (e) {
        socket.emit('add user', {
          success: false,
          message: e.message
        });
      }
    });

    // when the client emits 'new message', we broadcast it to others
    socket.on('new message', function (data) {
      if (!!user) {
        user.broadcast('new message', {
          username: user.name,
          message: data
        });
      }
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
      if (!!user) {
        user.broadcast('typing', {
          username: socket.username
        });
      }
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
      if (!!user) {
        user.broadcast('stop typing', {
          username: socket.username
        });
      }
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
      if (!!user) {
        user.disconnect();
      }
    });
  });

};
