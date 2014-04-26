var assert = require('assert');
var Room = require('../room.js');
var User = require('../user.js');

describe('Room', function(){
  var firstRoom;
  var firstUser;

  beforeEach(function () {
    firstUser = new User(undefined, 'Mr. 1');
    firstRoom = new Room('Seddon', 'en', 2);
    firstRoom.addUser(firstUser);
  });

  afterEach(function () {
    Room.getAll().length = 0;
    User.getAll().length = 0;
  });

  describe('::getAll()', function(){
    it('should return rooms array', function(){
      assert.equal(1, Room.getAll().length);
      assert.deepEqual([firstRoom], Room.getAll());
    });
  });

  describe('::getByName()', function(){
    it('should return the room of the name', function(){
      assert.equal(firstRoom, Room.getByName(firstRoom.name));
    });
  });

  describe('#getUsers()', function(){
    it('should return an array of users', function(){
      assert.equal(1, firstRoom.getUsers().length);
      assert.deepEqual([firstUser], firstRoom.getUsers());
    });
  });

  describe('#addUser()', function(){
    it('should be able to add a user', function(){
      assert.equal(2, firstRoom.addUser(new User('','abc')).getUsers().length);
    });
    it('should not add a user when the room is full', function(){
      firstRoom.addUser(new User(undefined,'abc'));
      firstRoom.addUser(new User(undefined,'bcd'));
      assert.equal(2, firstRoom.getUsers().length);
    });
  });

  describe('#removeUser()', function(){
    it('should be able to remove a user', function(){
      firstRoom.addUser(new User(undefined,'abc'));
      assert.equal(1, firstRoom.removeUser(firstUser).getUsers().length);
      assert.equal(1, Room.getAll().length);
    });
    it('should close the room after removing the last user', function(){
      assert.equal(0, firstRoom.removeUser(firstUser).getUsers().length);
      assert.equal(0, Room.getAll().length);
    });
  });

  describe('#close()', function(){
    it('should be able to close an empty room', function(){
      firstRoom.removeUser(firstUser).close();
      assert.equal(-1, Room.getAll().indexOf(firstRoom));
    });
    it('should not be able to close a non-empty room', function(){
      firstRoom.close();
      assert.notEqual(-1, Room.getAll().indexOf(firstRoom));
    });
  });
});
