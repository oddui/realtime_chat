var debug = require('debug')('rtc:socket');
var socketio = require('socket.io');
var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./user.js');
var Room = require('./room.js');
var io;

User.setup(Room);
Room.setup(User);

module.exports = function (server) {

  io = socketio(server);

  // authenticate
  io.use(function (socket, next) {
    var token = socket.request._query.token;

    if (!token) {
      error = new Error('credentials_required');
      debug('authentication failed: %s', error.message);
      return next(error);
    }

    var options = {
    };

    jwt.verify(token, config.token.secret, options, function(err, decoded) {
      if (err) {
        error = new Error('invalid_token');
        debug('authentication failed: %s', err.message);
        return next(error);
      }

      User.getById(decoded.id, function (err, user) {
        if (err) {
          debug('authentication failed: %s', err.message);
          return next(err);
        }
        if (!user) {
          error = new Error('user does not exist');
          debug('authentication failed: %s', error.message);
          return next(error);
        }
        if (user.socketId !== socket.id) {
          var oldSocket = io.sockets.connected[user.socketId];
          if (oldSocket) {
            oldSocket.emit('stale_socket');
            // client should disconnect the socket

            debug('found old socket %s', oldSocket.id);
          }
        }

        socket.user = user;
        next();
      });
    });
  });

  io.on('connect', function (socket) {

    var user = socket.user;
    user.connect(socket);

    // TODO: try joining last connected room

    socket.on('join', function (data) {
      if (user) {
        var room = Room.getById(data.id, function (err, room) {
          // if db err or room not exist
          if (err || !room) {
            return user.echo('join_response', {
              success: false,
              message: 'room does not exist'
            });
          }

          // join room
          user.join(room, function () {
            console.log(socket);
            user.echo('join_response', {
              success: true,
            });
            user.broadcast('user_joined', {
              username: user.name,
            });
          });
        });
      }
    });

    socket.on('leave', function () {
      if (user) {

        if (!user.room) {
          // usually caused by os sleep and socket disconnected
          // when os wakes up and the client could reconnect, it
          // reconnects to default socket.io room but not the real room
          user.echo('room_error', {
            message:'disconnected from room, please refresh page',
          });
          debug('leave failed, room is undefined');
          return;
        }

        var to = user.room.id;

        user.leave(function () {
          user.echo('leave_response', {
            success: true,
          });
          user.broadcast('user_left', {
            username: user.name,
          }, to);
        });
      }
    });

    // when the client emits 'new message', we broadcast it to others
    socket.on('new_message', function (data) {
      if (user) {
        user.broadcast('new_message', {
          username: user.name,
          message: data
        });
      }
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
      if (user) {
        user.broadcast('typing', {
          username: user.name
        });
      }
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop_typing', function () {
      if (user) {
        user.broadcast('stop_typing', {
          username: user.name
        });
      }
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
      if (user) {
        user.broadcast('user_left', {
          username: user.name,
        });

        user.disconnect(function () {
        });
      }
    });
  });

};
