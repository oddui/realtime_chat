var request = require('supertest');
var mongoose = require('mongoose');
var sign = require('jsonwebtoken').sign;
var config = require('../../config');
var expect = require('chai').expect;
var fixtures = require('../fixtures.json');
var app = require(config.root + '/app');

require(config.root + '/models/user');
var User = mongoose.model('User');

describe('admin', function () {
  var userToken, adminToken, headers = {
    'Accept': 'application/json',
  };

  before(function (done) {
    User.create(fixtures.users)
    .then(function (users) {
      var admin = users[0],
      user = users[1];
      userToken = sign(user.toObject(), config.secret);
      adminToken = sign(admin.toObject(), config.secret);
      headers['Authorization'] = 'Bearer '+adminToken;
    })
    .then(done)
    .then(null, done);
  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });

  describe('authorization', function () {
    it('should not authorize using normal users tokne', function (done) {
      request(app)
      .post('/admin/verify')
      .set('Authorization', 'Bearer '+userToken)
      .expect(401, done);
    });
    it('should authorize with an admin token', function (done) {
      request(app)
      .post('/admin/verify')
      .set(headers)
      .expect(200, done);
    });
  });
  describe('POST /admin/login', function () {
    it('should log an admin in', function (done) {
      request(app)
      .post('/admin/login')
      .send({
        email: 'admin@durarara.me',
        password: 'password',
      })
      .expect(200)
      .expect(/token/, done);
    });
    it('should return 401 when passing invalid email & password combo', function (done) {
      request(app)
      .post('/admin/login')
      .send({
        email: 'invalid@durarara.me',
        password: 'invalid',
      })
      .expect(401)
      .expect(/error/, done);
    });
  });
  describe('GET /admin/users', function () {
    it('should return users', function (done) {
      request(app)
      .get('/admin/users')
      .set(headers)
      .expect('Content-Type', /json/)
      .expect(200, done);
    });
  });
  describe('POST /admin/users', function () {
    it('should create a user', function (done) {
      request(app)
      .post('/admin/users')
      .set(headers)
      .send({
        name: 'User',
        role: 'user',
      })
      .expect(201, done);
    });
  });
  describe('GET /admin/users/:id', function () {
    it('should return user', function (done) {
      User.findOne()
      .exec()
      .then(function (user) {
        return user.id;
      })
      .then(function (id) {
        request(app)
        .get('/admin/users/'+id)
        .set(headers)
        .expect('Content-Type', /json/)
        .expect(200, done);
      });
    });
    it('should return 404 when user not found', function (done) {
      request(app)
      .get('/admin/users/5468474c7846ee6e8e90c720')
      .set(headers)
      .expect(404, done);
    });
  });
  describe('PUT /admin/users/:id', function () {
    it('should update user', function (done) {
      User.findOne()
      .exec()
      .then(function (user) {
        return user.id;
      })
      .then(function (id) {
        request(app)
        .put('/admin/users/'+id)
        .set(headers)
        .send({
          name: 'Changed',
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function () {
          User.findById(id)
          .exec()
          .then(function (user) {
            expect(user.name).to.eql('Changed');
          })
          .then(done, done);
        });
      });
    });
  });
  describe('DELETE /admin/users/:id', function () {
    it('should delete user', function (done) {
      User.findOne()
      .exec()
      .then(function (user) {
        return user.id;
      })
      .then(function (id) {
        request(app)
        .delete('/admin/users/'+id)
        .set(headers)
        .expect(200)
        .end(function () {
          User.findById(id)
          .exec()
          .then(function (user) {
            expect(user).to.be.null();
          })
          .then(done, done);
        });
      });
    });
  });

});
