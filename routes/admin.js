var _ = require('lodash');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var passport = require('passport');
var sign = require('jsonwebtoken').sign;
var jwt = require('express-jwt');
var config = require('../config');
var User = mongoose.model('User');

var authorize = function(req, res, next) {
  User.findById(req.user._id)
  .exec()
  .then(function (user) {
    if (user.role === 'admin') {
      next();
    } else {
      var err = new Error('Unauthorized');
      err.status = 401;
      next(err);
    }
  });
};

router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) return next(err);

    if (user) {
      res.send({token: sign(user.toObject(), config.secret)});
    } else {
      var error = new Error('Unauthorized');
      error.status = 401;
      error.message = info.message;
      next(error);
    }
  })(req, res, next);
});

router.post('/verify', jwt({secret: config.secret}), authorize, function (req, res, next) {
  res.send({});
});

router.route('/users')
.all(jwt({secret: config.secret}))
.all(authorize)
.get(function (req, res, next) {
  User.find()
  .exec()
  .then(function (users) {
    return _.map(users, function (user) {
      return user.toObject();
    });
  })
  .then(function (users) {
    res.send(users);
  })
  .then(null, next);
})
.post(function (req, res, next) {
  User.create(req.body)
  .then(function (user) {
    res.status(201).send();
  })
  .then(null, next);
});

router.route('/users/:id')
.all(jwt({secret: config.secret}))
.all(authorize)
.get(function (req, res, next) {
  User.findById(req.params.id)
  .exec()
  .then(function (user) {
    if (!user) res.status(404).send();
    res.send(user.toObject());
  })
  .then(null, next);
})
.put(function (req, res, next) {
  User.update({_id: req.params.id}, req.body)
  .exec()
  .then(function () {
    res.send();
  })
  .then(null, next);
})
.delete(function (req, res, next) {
  User.remove({_id: req.params.id})
  .exec()
  .then(function () {
    res.send();
  })
  .then(null, next);
});

module.exports = router;
