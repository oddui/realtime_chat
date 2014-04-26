var assert = require('assert');
var http = require('http');
var ioserver = require('socket.io');
var ioclient = require('socket.io-client');
var config = require('../config');
var User = require('../user.js');
var Room = require('../room.js');

describe('User', function(){
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

  beforeEach(function () {
    firstUser = new User(socket, 'Mr. 1');
    firstRoom = new Room('Seddon', 'en', 2);
  });

  afterEach(function () {
    User.getAll().forEach(function (user) {
      user.leave();
    });
    User.getAll().length = 0;
    Room.getAll().length = 0;
  });

  describe('::getAll()', function(){
    it('should return users array', function(){
      assert.equal(1, User.getAll().length);
      assert.deepEqual([firstUser], User.getAll());
    });
  });

  describe('::getByName()', function(){
    it('should return the user of the name', function(){
      assert.equal(firstUser, User.getByName(firstUser.name));
    });
  });

  describe('#connect()', function(){
    it('should assign socket', function(){
      assert.equal(socket, firstUser.connect(socket).socket);
    });
  });

  describe('#broadcast()', function(){
    it('should ', function(){
      assert(true);
    });
  });

  describe('#join()', function(){
    it('should join a room', function(){
      firstUser.join(firstRoom);
      assert.equal(firstUser.room, firstRoom);
      assert.notEqual(-1, firstRoom.getUsers().indexOf(firstUser));
    });
    it('socket should join a room', function(done){
      firstUser.join(firstRoom, function () {
        assert.notEqual(-1, firstUser.socket.rooms.indexOf(firstRoom.name));
        done();
      });
    });
    it('should first leave the room if user already in a room', function(){
      firstUser.join(firstRoom);

      var anotherRoom = new Room('Kingsville');
      firstUser.join(anotherRoom);
      assert.equal(firstUser.room, anotherRoom);
      assert.notEqual(-1, anotherRoom.getUsers().indexOf(firstUser), 'user should in another room');
      assert.equal(-1, firstRoom.getUsers().indexOf(firstUser), 'user should not in first room');
    });
  });

  describe('#leave()', function(){
    it('should leave a room', function(){
      firstUser.join(firstRoom);

      firstUser.leave();
      assert.equal(firstUser.room, undefined);
      assert.equal(-1, firstRoom.getUsers().indexOf(firstUser));
    });
    it('socket should leave a room', function(done){
      firstUser.join(firstRoom, function () {
        assert.notEqual(-1, firstUser.socket.rooms.indexOf(firstRoom.name));

        firstUser.leave(function () {
          assert.equal(-1, firstUser.socket.rooms.indexOf(firstRoom.name));
          done();
        });
      });
    });
  });

  describe('#disconnect()', function(){
    it('should be removed from users data store', function(){
      firstUser.disconnect();
      assert.equal(-1, User.getAll().indexOf(firstUser));
    });
  });
});
