var debug = require('debug')('rtc:routes');
var express = require('express');
var router = express.Router();
var Room = require('../room');

/* GET rooms listing. */
router.get('/', function(req, res) {
  var rooms = [];

  Room.getAll().forEach(function (room) {
    rooms.push({
      name: room.name,
      lang: room.lang,
      capacity: room.capacity,
      users: room.users.map(function (user) {
        return user.name;
      })
    });
  });

  res.json(rooms);
});

module.exports = router;
