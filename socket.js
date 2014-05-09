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
      return next(error);
    }

    var options = {
    };

    jwt.verify(token, config.token.secret, options, function(err, decoded) {

      if (err) {
        error = new Error('invalid_token');
        return next(error);
      }

      socket.decoded_token = decoded;
      next();
    });
  });

  io.on('connect', function (socket) {

    var user;

    User.getById(socket.decoded_token._id, function (err, u) {
      if (err) return socket.emit('error', err);

      if (u) {
        user = u;
        user.connect(socket);
      }
    });

    socket.on('join', function (data) {
      if (user) {
        var room = Room.getById(data._id, function (err, room) {
          // if db err or room not exist
          if (err || !room) {
            return user.echo('join_response', {
              success: false,
              message: 'room does not exist'
            });
          }

          // join room
          user.join(room, function () {
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
        var to = user.room._id;

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
        if (user.room) var to = user.room._id;

        user.disconnect(function () {
          user.broadcast('user_left', {
            username: user.name,
          }, to);
        });
      }
    });
  });

};
