var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var config = require('../config');
var User = require('../user');

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});

router.post('/login', function (req, res) {
  var user = new User({name: req.body.name});
  user.save(function (err, user) {
    if (err) res.send(500, err);

    var token = jwt.sign({
      _id: user._id,
    }, config.token.secret);

    res.send(200, {
      token: token,
    });
  });
});

module.exports = router;
