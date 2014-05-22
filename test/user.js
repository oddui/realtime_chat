var assert = require('assert');
var http = require('http');
var ioserver = require('socket.io');
var ioclient = require('socket.io-client');
var config = require('../config');
var User = require('../user.js');
var Room = require('../room.js');
User.setup(Room);
Room.setup(User);

describe('User', function() {
  var httpServer, server, client, socket;
  var firstUser, firstRoom;

  before(function (done) {
    httpServer = http.createServer();
    server = ioserver(httpServer);

    server.on('connection', function (s) {
      socket = s;
    });

    httpServer.listen(config.port, function () {
      client = ioclient('http://localhost:'+config.port);

      client.on('connect', function() {
        client.on('disconnect', function() {
          //console.log('socket disconnected...');
        });
        done();
      });
    });
  });

  after(function (done) {
    if(client.connected) {
      client.disconnect();
    } else {
      console.log('no connection to break...');
    }
    httpServer.close(done);
  });

  beforeEach(function (done) {
    firstUser = new User({
      name: 'Mr. 1',
    });
    firstRoom = new Room({
      name: 'Seddon',
      lang: 'en',
      capacity: 2,
    });
    firstUser.connect(socket, function () {
      firstRoom.save(function () {
        done();
      });
    });
  });

  afterEach(function (done) {
    User.deleteAll(function () {
      done();
    });
  });

  describe('::getById()', function(){
    it('should get the user', function (done) {
      User.getById(firstUser.id, function (err, user) {
        assert(user instanceof User);
        assert.equal(user.id, firstUser.id);
        done();
      });
    });
    it('user should be populated', function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.save(function () {
        User.getById(firstUser.id, function (err, user) {
          assert(user.room instanceof Room);
          done();
        });
      });
    });
  });

  describe('::get()', function(){
    it('should get queried users array', function (done) {
      // get firstUser
      User.get({name: firstUser.name}, function (err, users) {
        assert(users instanceof Array);
        assert.equal(users.length, 1);

        assert.equal(users[0].id, firstUser.id);
        users.forEach(function (user) {
          assert(user instanceof User);
        });
        done();
      });
    });
  });

  describe('::getAll()', function(){
    it('should get users array', function (done) {
      User.getAll(function (err, users) {
        assert.equal(users.length, 1);
        assert.equal(users[0].name, firstUser.name);
        users.forEach(function (user) {
          assert(user instanceof User);
        });
        done();
      });
    });
  });

  describe('::getByName()', function(){
    it('should get an array of users of the name', function (done) {
      User.getByName(firstUser.name, function (err, users) {
        users.forEach(function (user) {
          assert(user instanceof User);
          assert.equal(user.name, firstUser.name);
        });
        done();
      });
    });
  });

  describe('::deleteById()', function(){
    it('should delete the user from data store', function (done) {
      User.deleteById(firstUser.id, function (err, numRemoved) {
        assert.equal(numRemoved, 1);
        done();
      });
    });
  });

  describe('::deleteAll()', function(){
    it('should delete all users from data store', function (done) {
      // save a new user
      (new User({name: 'Mr. 2'}, undefined)).save(function () {
        User.getAll(function (err, users) {
          // number of users in the data store
          var num = users.length;
          User.deleteAll(function (err, numRemoved) {
            assert.equal(numRemoved, num);
            done();
          });
        });
      });
    });
  });

  describe('::count()', function(){
    it('should get number of users specified in fields', function (done) {
      User.count({socketId: {$exists: true}}, function (err, count) {
        assert.equal(count, 1);
        done();
      });
    });
    it('should get number of users specified in fields', function (done) {
      User.count({socketId: {$exists: false}}, function (err, count) {
        assert.equal(count, 0);
        done();
      });
    });
    it('should get number of all users if no fields options passed', function (done) {
      User.count(function (err, count) {
        assert.equal(count, 1);
        done();
      });
    });
  });

  describe('#toDoc()', function () {
    it('should return doc that could be save in data store', function () {
      assert.deepEqual(firstUser.toDoc(), {
        name: firstUser.name,
        roomId: firstUser.roomId,
        socketId: firstUser.socket.id,
        lastSeenAt: new Date(),
      });
    });
  });

  describe('#save()', function () {
    describe('save a new user in the data store', function () {
      var user, doc;

      beforeEach(function (done) {
        user = new User({name: 'Mr. 2'}, undefined);
        user.roomId = firstRoom.id;
        user.save(function (err, newDoc) {
          doc = newDoc;
          done();
        });
      });

      it('doc._id should to assigned to user.id', function () {
        assert(user.id, doc._id);
      });
      it('user should be saved in the data store', function (done) {
        User.getById(user.id, function (err, u) {
          assert.equal(u.name, user.name);
          assert.equal(u.room.id, firstRoom.id);
          done();
        });
      });
    });

    it('should be able to update a user in the data store', function (done) {
      firstUser.name = 'Ms. 1';
      firstUser.save(function (err, updated) {
        assert.deepEqual(updated, firstUser.toDoc());
        User.getById(firstUser.id, function (err, user) {
          assert.equal(user.name, firstUser.name);
          done();
        });
      });
    });
  });

  describe('#populate()', function () {
    it('should populate user.room as a room object', function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.populate(function (err, user) {
        assert(user.room instanceof Room);
        done();
      });
    });
    it('should do nothing if user.roomId is undefined', function (done) {
      firstUser.populate(function (err, user) {
        assert(!user.room);
        done();
      });
    });
    it('should set roomId to undefined if room does not exist', function (done) {
      firstUser.roomId = 'badid';
      firstUser.populate(function (err, user) {
        assert(!user.roomId);
        assert(!user.room);
        done();
      });
    });
  });

  describe('#destroy()', function () {
    it('should remove itself from the data store', function (done) {
      firstUser.destroy(function (err, numDestroyed) {
        assert.equal(numDestroyed, 1);
        done();
      });
    });
  });

  describe('#getRoom()', function () {
    it('should get room', function (done) {
      firstUser.room = firstRoom;
      firstUser.getRoom(function (err, room) {
        assert(room instanceof Room);
        assert(room.id, firstRoom.id);
        done();
      });
    });
    it('should first populated the room if not populated', function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.getRoom(function (err, room) {
        assert(room instanceof Room);
        assert(room.id, firstRoom.id);
        done();
      });
    });
  });

  describe('#connect()', function () {
    var fakeSocket, user;

    beforeEach(function (done) {
      fakeSocket = {id: '1'};
      firstUser.connect(fakeSocket, function () {
        User.getById(firstUser.id, function (err, u) {
          user = u;
          done();
        });
      });
    });

    it('should assign socket', function () {
      assert.deepEqual(firstUser.socket, fakeSocket);
    });
    it('should assign socket id', function () {
      assert.equal(user.socketId, fakeSocket.id);
    });
  });

  describe('#disconnect()', function () {
    beforeEach(function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.save(function () {
        firstUser.disconnect(function () {
          done();
        });
      });
    });

    it('should leave room', function (done) {
      assert.equal(firstUser.roomId, undefined);
      User.getById(firstUser.id, function (err, user) {
        assert.equal(user.roomId, undefined);
        done();
      });
    });

    it('should not be connected', function (done) {
      assert.equal(firstUser.socketID, undefined);
      User.getById(firstUser.id, function (err, user) {
        assert(!user.connected);
        done();
      });
    });
  });

  describe('#disconnect()', function () {
    it('should return true if user has socket connection', function () {
      assert(firstUser.isConnected());
    });
  });

  describe('#echo()', function () {
    it('should ', function () {
      // TODO
      assert(true);
    });
  });

  describe('#broadcast()', function () {
    it('should ', function () {
      // TODO
      assert(true);
    });
  });

  describe('#join()', function () {
    it('should join a room', function (done) {
      firstUser.join(firstRoom, function () {
        assert.equal(firstUser.room, firstRoom);
        assert.equal(firstUser.roomId, firstRoom.id);

        User.getById(firstUser.id, function (err, user) {
          assert.equal(user.roomId, firstRoom.id);
          done();
        });
      });
    });
    it('socket should join a room', function(done){
      firstUser.join(firstRoom, function () {
        assert.notEqual(-1, firstUser.socket.rooms.indexOf(firstRoom.id));
        done();
      });
    });
    it('should first leave the room if user already in a room', function(done){
      firstUser.join(firstRoom, function () {
        assert.notEqual(-1, firstUser.socket.rooms.indexOf(firstRoom.id));

        var anotherRoom = new Room('Kingsville');
        firstUser.join(anotherRoom, function () {
          assert.equal(-1, firstUser.socket.rooms.indexOf(firstRoom.id));

          assert.equal(firstUser.room, anotherRoom);
          done();
        });
      });
    });
  });

  describe('#leave()', function(){

    beforeEach(function (done) {
      firstUser.roomId = firstRoom.id;
      firstUser.save(function () {
        firstUser.socket.join(firstRoom.id, function () {
          done();
        });
      });
    });

    it('should leave a room', function (done) {
      firstUser.leave(function () {
        assert.equal(firstUser.roomId, undefined);
        assert.equal(firstUser.room, undefined);

        User.getById(firstUser.id, function (err, user) {
          assert.equal(user.roomId, undefined);
          done();
        });
      });
    });
    it('socket should leave a room', function (done) {
      assert.notEqual(-1, firstUser.socket.rooms.indexOf(firstRoom.id));

      firstUser.leave(function () {
        assert.equal(-1, firstUser.socket.rooms.indexOf(firstRoom.name));
        done();
      });
    });
  });
});
