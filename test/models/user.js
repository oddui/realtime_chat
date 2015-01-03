var _ = require('lodash');
var mongoose = require('mongoose');
var config = require('../../config');
var expect = require('chai').expect;

require(config.root + '/models/user');
var User = mongoose.model('User');

describe('User', function () {

  before(function (done) {
    // connect to mongodb
    mongoose.connect(config.db);
    mongoose.connection
    .on('error', console.error)
    .on('open', function () {
      // database fixtures
      var fixtures = require('../fixtures.json');

      User.create(fixtures.users)
      .then(function () {
        done();
      })
      .then(null, done);
    });
  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });

  describe('validations', function () {
    var user;
    beforeEach(function () {
      user = new User();
    });
    it('should save a valid user', function (done) {
      user.name = 'A User';
      user.role = 'user';
      user.provider = 'facebook';
      user.uuid = '1';
      user.save(done);
    });
    it('should not save an invalid role', function (done) {
      user.role = 'superuser';
      user.save(function (err) {
        expect(err.name).to.eql('ValidationError');
        done();
      });
    });
    it('should not save existing provider&uuid combinations', function (done) {
      User.findOne().where('uuid').exists(true)
      .exec()
      .then(function (user) {
        return User.create(_.omit(user.toObject(), '_id'));
      })
      .then(null, function (err) {
        expect(err.message).to.match(/provider&uuid/);
        done();
      });
    });
  });

  describe('statics', function () {
    describe('::f', function () {
      it('should ', function (done) {
        done();
      });
    });
  });

  describe('methods', function () {
    var user;
    beforeEach(function (done) {
      User.findOne().exec().then(function (u) {
        user = u;
        done();
      });
    });
    describe('#checkPassword', function () {
      it('should check password', function () {
        expect(user.checkPassword(user.password)).to.eql(true);
        expect(user.checkPassword('invalid password')).to.eql(false);
      });
    });
    describe.skip('#broadcast', function () {
      it('should ', function (done) {
        done();
      });
    });
  });
});
