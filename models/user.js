var _ = require('lodash');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ROLES = ['user', 'owner', 'admin'];

// user schema
//
var userSchema = new Schema({
  provider: String,
  uuid:     String,
  name:     String,
  password: String,
  email: { type: String, trim: true },
  role:  { type: String, enum: ROLES, default: 'user' },
  rooms: [{ type: Schema.Types.ObjectId, ref: 'Room' }],
});

userSchema.path('name').required(true);

// validate provider and uuid uniqueness
userSchema.pre('save', function (next) {
  if (this.uuid === undefined) next();

  var User = mongoose.model('User');

  User.findOne(_.pick(this, 'provider', 'uuid'))
  .exec()
  .then(function (user) {
    if (user) {
      throw new Error('Validation failed, provider&uuid exists');
    }
  })
  .then(next)
  .then(null, next);
});

userSchema.methods.checkPassword = function (password) {
  return this.password === password;
};

userSchema.methods.broadcast = function () {
};

userSchema.statics.f = function () {
};

mongoose.model('User', userSchema);
