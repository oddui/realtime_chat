var request = require('supertest');
var mongoose = require('mongoose');
var sign = require('jsonwebtoken').sign;
var config = require('../../config');
var expect = require('chai').expect;
var fixtures = require('../fixtures.json');
var app = require(config.root + '/app');

require(config.root + '/models/user');
var User = mongoose.model('User');

describe('users', function () {
  var headers = {
    'Accept': 'application/json',
  };

  before(function (done) {
    User.create(fixtures.users)
    .then(function (admin, owner, user) {
      var token = sign(user.toObject(), config.secret);
      headers['Authorization'] = 'Bearer '+token;
    })
    .then(done)
    .then(null, done);
  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });

  describe.skip('POST /users/login', function () {
  });
  describe('POST /users/verify', function () {
    it('should not be verified with a bad token', function (done) {
      request(app)
      .post('/users/verify')
      .set('Authorization', 'Bearer invalidtoken')
      .expect(401, done);
    });
    it('should be verified with a right token', function (done) {
      request(app)
      .post('/users/verify')
      .set(headers)
      .expect('Content-Type', /json/)
      .expect(200, done);
    });
  });
  describe('GET /users/me', function () {
    it('should return user', function (done) {
      request(app)
      .get('/users/me')
      .set(headers)
      .expect('Content-Type', /json/)
      .expect(200, done);
    });
  });
  describe('PUT /users/me', function () {
    it('should update user', function (done) {
      request(app)
      .put('/users/me')
      .set(headers)
      .send({
        name: 'Changed',
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function () {
        request(app)
        .get('/users/me')
        .set(headers)
        .expect(/Changed/, done);
      });
    });
  });
});
