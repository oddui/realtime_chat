var debug = require('debug')('rtc:user');
var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var config = require('../config');
var utils = require('./utils');
var User = require('../user');

router.use(utils.cors);
router.use(utils.expiresNow);

/* GET users listing. */
router.get('/', function(req, res) {
  User.getAll(function (err, users) {
    if (err) res.send(500, err);
    res.send(users);
  });
});

/* get number of users */
router.get('/count', function(req, res) {
  User.count({}, function (err, count) {
    if (err) res.send(500, err);
    res.send({count: count});
  });
});

/* get number of connected users */
router.get('/count/connected', function(req, res) {
  User.count({socketId: {$exists: true}}, function (err, count) {
    if (err) res.send(500, err);
    res.send({count: count});
  });
});

router.post('/login', function (req, res) {
  var user = new User({name: req.body.name});
  user.save(function (err, doc) {
    if (err) res.send(500, err);

    var token = jwt.sign({
      id: doc._id,
      name: doc.name,
    }, config.token.secret);

    res.send(200, {
      token: token,
    });
  });
});

router.post('/session', function (req, res) {
  var token = req.body.token;
  var options = {};

  jwt.verify(token, config.token.secret, options, function(err, decoded) {
    if (err) {
      var error = new Error('invalid_token');
      debug('session failed: %s', error.message);
      res.send(401, {
        message: error.message,
      });
    }

    User.getById(decoded.id, function (err, user) {
      if (err) res.send(500, error);

      if (!user) {
        debug('session: user id does not exist, creating new one');
        // create new user with token.name
        user = new User({name: decoded.name});
        user.save(function (err, doc) {
          if (err) res.send(500, err);

          var token = jwt.sign({
            id: doc._id,
            name: doc.name,
          }, config.token.secret);

          // send new token and new user to client
          res.send(200, {
            user: doc,
            token: token,
          });
        });
      } else {
        // all good
        res.send(200, {user: user});
      }
    });
  });
});

module.exports = router;
