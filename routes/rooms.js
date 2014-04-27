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

/* Create a new room */
router.post('/', function(req, res) {
  try {
    new Room(req.body.name);
    res.send(200);
  } catch (e) {
    res.json(409, {
      message: e.message
    });
  }
});

module.exports = router;
