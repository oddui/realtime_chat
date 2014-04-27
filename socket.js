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

    // when the client emits 'add user', this listens and executes
    socket.on('new_user', function (username) {
      try {
        user = new User(socket, username);
        user.socket.emit('new_user_response', {
          success: true
        });
      } catch (e) {
        socket.emit('new_user_response', {
          success: false,
          message: e.message
        });
      }
    });

    socket.on('new_room', function (roomname) {
      if (!!user) {
        try {
          new Room(req.body.name);
          user.socket.emit('new_room_response', {
            success: true,
          });
        } catch (e) {
          user.socket.emit('new_room_response', {
            success: false,
            message: e.message
          });
        }
      }
    });

    socket.on('join', function (roomname) {
      if (!!user) {
        var room = Room.getByName(roomname);

        if (!!room) {
          user.join(room, function () {
            user.echo('join_response', {
              success: true,
              numberOfUsers: user.room.users.length
            });
            user.broadcast('user_joined', {
              username: user.name,
              numberOfUsers: user.room.users.length
            });
          });
        } else {
          user.echo('join_response', {
            success: false,
            message: 'room does not exist'
          });
        }
      }
    });

    socket.on('leave', function () {
      if (!!user) {
        var room = user.room;

        user.leave(function () {
          user.broadcast('user_left', {
            username: user.name
          }, room.name);
        });
      }
    });

    // when the client emits 'new message', we broadcast it to others
    socket.on('new_message', function (data) {
      if (!!user) {
        user.broadcast('new_message', {
          username: user.name,
          message: data
        });
      }
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
      if (!!user) {
        user.broadcast('typing', {
          username: user.name
        });
      }
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop_typing', function () {
      if (!!user) {
        user.broadcast('stop_typing', {
          username: user.name
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
