var debug = require('debug')('rtc:routes');
var express = require('express');
var router = express.Router();
var Room = require('../room');

/* GET rooms listing. */
router.get('/', function(req, res) {
  Room.getAll(function (err, rooms) {
    if (err) res.send(500, err);
    res.send(200, rooms);
  });
});

/* Create a new room */
router.post('/', function(req, res) {
  var room = new Room(req.body);
  room.save(function (err, room) {
    if (err) res.send(500, err);
    res.send(200);
  });
});

module.exports = router;
