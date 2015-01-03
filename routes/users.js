var _ = require('lodash');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var sign = require('jsonwebtoken').sign;
var jwt = require('express-jwt');
var config = require('../config');
var User = mongoose.model('User');

router.use(jwt({secret: config.secret}).unless({path: ['/login']}));

router.post('/login', function (req, res, next) {
});

router.post('/verify', function (req, res, next) {
  res.send({});
});

router.route('/me')
.get(function (req, res, next) {
  User.findById(req.user._id)
  .exec()
  .then(function (user) {
    if (!user) res.status(404).send();
    res.send(user.toObject());
  })
  .then(null, next);
})
.put(function (req, res, next) {
  User.update({_id: req.user._id}, req.body)
  .exec()
  .then(function () {
    res.send();
  })
  .then(null, next);
});

module.exports = router;
