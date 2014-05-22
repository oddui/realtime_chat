var assert = require('assert');
var User = require('../user.js');
var Room = require('../room.js');
User.setup(Room);
Room.setup(User);

describe('Room', function(){
  var firstRoom;
  var firstUser;

  beforeEach(function (done) {
    firstUser = new User({name: 'Mr. 1'}, undefined);
    firstRoom = new Room({
      name: 'Seddon',
      lang: 'en',
      capacity: 2,
    });
    firstRoom.save(function () {
      firstUser.save(function () {
        done();
      });
    });
  });

  afterEach(function (done) {
    Room.deleteAll(function () {
      done();
    });
  });

  describe('::getById()', function(){
    it('should get the room', function (done) {
      Room.getById(firstRoom.id, function (err, room) {
        assert(room instanceof Room);
        assert.equal(room.id, firstRoom.id);
        done();
      });
    });
  });

  describe('::getAll()', function () {
    it('should get rooms array', function (done) {
      Room.getAll(function (err, rooms) {
        assert.equal(rooms.length, 1);
        assert.equal(rooms[0].name, firstRoom.name);
        rooms.forEach(function (room) {
          assert(room instanceof Room);
          done();
        });
      });
    });
  });

  describe('::getByName()', function(){
    it('should get an array of rooms of the name', function (done) {
      Room.getByName(firstRoom.name, function (err, rooms) {
        rooms.forEach(function (room) {
          assert(room instanceof Room);
          assert.equal(room.name, firstRoom.name);
        });
        done();
      });
    });
  });

  describe('::deleteById()', function(){
    it('should delete the room from data store', function (done) {
      Room.deleteById(firstRoom.id, function (err, numRemoved) {
        assert.equal(numRemoved, 1);
        done();
      });
    });
  });

  describe('::deleteAll()', function () {
    it('should delete all rooms from data store', function (done) {
      // save a new room
      (new Room({name: 'Kingsville'})).save(function () {
        Room.getAll(function (err, rooms) {
          // number of rooms in the data store
          var num = rooms.length;
          Room.deleteAll(function (err, numRemoved) {
            assert.equal(numRemoved, num);
            done();
          });
        });
      });
    });
  });

  describe('#save()', function(){
    describe('save a new room in the data store', function () {
      var room, doc;

      beforeEach(function (done) {
        room = firstRoom = new Room({
          name: 'Kingsville',
          lang: 'en',
          capacity: 2,
        });
        room.save(function (err, newDoc) {
          doc = newDoc;
          done();
        });
      });

      it('doc._id should to assigned to room.id', function () {
        assert(room.id, doc._id);
      });
      it('room should be saved in the data store', function (done) {
        Room.getById(room.id, function (err, r) {
          assert.equal(r.name, room.name);
          done();
        });
      });
    });

    it('should be able to update a room in the data store', function (done) {
      firstRoom.name = 'Kingsville';
      firstRoom.save(function (err, numUpdated) {
        assert.equal(numUpdated, 1);
        Room.getById(firstRoom.id, function (err, room) {
          assert.equal(room.name, firstRoom.name);
          done();
        });
      });
    });
  });

  describe('#destroy()', function () {
    it('should be able to delete itself', function (done) {
      firstRoom.destroy(function (err, numRemoved) {
        assert.equal(numRemoved, 1);
        done();
      });
    });
  });

  describe('#getUsers()', function () {
    beforeEach(function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.save(function () {
        done();
      });
    });

    it('should be able to get users in this room', function (done) {
      firstRoom.getUsers(function (err, users) {
        assert.equal(users.length, 1);
        var userNames = users.map(function (user) {
          return user.name;
        });
        assert(-1 !== userNames.indexOf(firstUser.name));
        done();
      });
    });
  });

  describe('#close()', function () {
    it('should be able to close an empty non-permanent room', function (done) {
      firstRoom.close(function (err, numRemoved) {
        assert.equal(numRemoved, 1);
        done();
      });
    });
    it('should not close a non-empty room', function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.save(function () {
        firstRoom.close(function (err, numRemoved) {
          assert.notEqual(numRemoved, 1);
          done();
        });
      });
    });
    it('should not close a permanent room', function (done) {
      firstRoom.permanent = true;
      firstRoom.close(function (err, numRemoved) {
        assert.notEqual(numRemoved, 0);
        done();
      });
    });
  });
});
