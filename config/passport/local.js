var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var User = mongoose.model('User');

module.exports = new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {
    User.findOne({email: email})
    .exec()
    .then(function (user) {
      if (!user) done(null, false, { message: 'Unknown user' });

      if (user.checkPassword(password)) {
        done(null, user);
      } else {
        done(null, false, { message: 'Invalid password' });
      }
    })
    .then(null, done);
  }
);
