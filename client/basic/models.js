(function() {

  // user model
  var User = function (data) {
    var user = this;

    _(data).each(function (value, key) {
      user[key] = value;
    });

    this.token = undefined;
    this.socket = undefined;


    this.TYPING_TIMER_LENGTH = 400; // ms
  };

  // fn is called synchronously
  User.prototype.connect = function (fn) {
    // connect socket
    this.socket = io({
      'query': 'token=' + this.token,
    });
    fn.call(this.socket, this.socket);
  };

  User.prototype.login = function (fn, fn2) {
    // If the name is valid
    if (this.name) {
      var self = this;

      var request = $.ajax('/users/login', {
        type: 'POST',
        data: {name: this.name},
      });
      request.done(function (data) {
        // store token
        self.token = data.token;
        $.ajaxSetup({
          headers: {
            'Authorization': 'Bearer ' + self.token,
          },
        });

        roomsViewModel.refresh();

        self.connect(fn2);

        if (fn) fn.call(self, self);
      });
    }
  };

  User.prototype.join = function (room) {
    this.socket.emit('join', room);
  };

  User.prototype.updateTyping =function () {
    var socket = this.socket;

    if (socket) {
      if (!this.typing) {
        this.typing = true;
        socket.emit('typing');
      }
      this.lastTypingTime = (new Date()).getTime();

      var self = this;
      setTimeout(function () {
        var timeDiff = (new Date()).getTime() - self.lastTypingTime;
        if (timeDiff >= self.TYPING_TIMER_LENGTH && self.typing) {
          self.typing = false;
          socket.emit('stop_typing');
        }
      }, this.TYPING_TIMER_LENGTH);
    }
  };

  User.prototype.sendMessage =function (message) {
    // if there is a non-empty message and a socket connection
    if (message && this.socket) {
      this.socket.emit('new_message', message);
      this.socket.emit('stop_typing');
      this.typing = false;
    }
  };

  User.prototype.f =function () {
  };

  // room model
  var Room = function (data) {
    var room = this;

    _(data).each(function (value, key) {
      room[key] = value;
    });
  };

  var getRooms = function (fn) {
    var request = $.ajax('/rooms', {
      type: 'GET'
    });
    request.done(function (data) {
      if (fn) fn.call(data, data);
    });
  };

  // rooms view model
  var roomsViewModel = (function () {
    var rooms = ko.observableArray();

    var add = function (room) {
      if (!(room instanceof Room)) room = new Room(room);
      rooms.push(room);
    };

    var remove = function (room) {
      rooms.remove(room);
    };

    var refresh = function () {
      getRooms(function (data) {
        rooms.removeAll();
        rooms(_(data).map(function (roomData) {
          return new Room(roomData);
        }));
      });
    };

    return {
      rooms: rooms,
      add: add,
      remove: remove,
      refresh: refresh,
    };
  })();

  window.models = {
    User: User,
    Room: Room,
    roomsViewModel: roomsViewModel,
  };

})();
