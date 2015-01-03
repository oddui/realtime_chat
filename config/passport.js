var mongoose = require('mongoose');
var User = mongoose.model('User');

var local = require('./passport/local');

module.exports = function (passport, config) {

  // use these strategies
  passport.use(local);
};
