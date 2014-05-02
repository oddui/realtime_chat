$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $messageForm = $('#messageForm');
  var $loginForm = $('#loginForm');
  var $createRoomForm = $('#createRoomForm'); // Input for username

  var $loginPage = $('.login.page'); // The login page
  var $roomsPage = $('.rooms.page'); // The rooms page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  // jwt
  var token;

  // socket.io client
  var socket;

  // TODO: user model
  var User = function (data) {
  };

  var Room = function (data) {
    var room = this;

    _(data).each(function (value, key) {
      room[key] = value;
    });
  };

  Room.prototype.enter = function () {
    socket.emit('join', this);
  };

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

  ko.applyBindings(roomsViewModel, $('ul#rooms')[0]);

  // Prevents input from having injected markup
  var cleanInput = function (input) {
    return $('<div/>').text(input).html() || input;
  };

  // log the user in
  var login = function (name) {
    // If the name is valid
    if (name) {
      var request = $.ajax('/users/login', {
        type: 'POST',
        data: {name: name},
      });
      request.done(function (data) {
        // store token
        token = data.token;
        $.ajaxSetup({
          headers: {
            'Authorization': 'Bearer ' + token,
          },
        });

        // connect socket
        socket = io({
          'query': 'token=' + token,
        });

        // Socket events

        socket.on('join_response', function (data) {
          if (data.success) {
            username = name;
            connected = true;

            // ui
            $roomsPage.fadeOut();
            $chatPage.show();

            // Display the welcome message
            var message = "Welcome to Realtime Chat &mdash; ";
            log(message, {
              prepend: true
            });
            addParticipantsMessage(data);
          } else {
            console.log(data);
          }
        });

        // Whenever the server emits 'user joined', log it in the chat body
        socket.on('user_joined', function (data) {
          log(data.username + ' joined');
          addParticipantsMessage(data);
        });

        // Whenever the server emits 'user left', log it in the chat body
        socket.on('user_left', function (data) {
          log(data.username + ' left');
          addParticipantsMessage(data);
          removeChatTyping(data);
        });

        // Whenever the server emits 'typing', show the typing message
        socket.on('typing', function (data) {
          addChatTyping(data);
        });

        // Whenever the server emits 'stop typing', kill the typing message
        socket.on('stop_typing', function (data) {
          removeChatTyping(data);
        });

        // Whenever the server emits 'new message', update the chat body
        socket.on('new_message', function (data) {
          addChatMessage(data);
        });

        socket.on('error', function (data) {
          console.log(data);
        });

        // ui
        $loginPage.fadeOut();
        $roomsPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();

        roomsViewModel.refresh();
      });
    }
  };

  var createRoom = function (room, fn) {
    var request = $.ajax('/rooms', {
      type: 'POST',
      data: room,
    });
    request.done(function (data) {
      if (fn) fn.call(data, data);
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

  // Sends a chat message
  var sendMessage = function (message) {
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new_message', message);

      socket.emit('stop_typing');
      typing = false;
    }
  };

  var addParticipantsMessage = function (data) {
    var message = '';
    if (data.numberOfUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there're " + data.numberOfUsers + " participants";
    }
    log(message);
  };

  // Log a message
  function log (message, options) {
    var el = '<li class="log">' + message + '</li>';
    addMessageElement(el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var colorStyle = 'style="color:' + getUsernameColor(data.username) + '"';
    var usernameDiv = '<span class="username"' + colorStyle + '>' +
      data.username + '</span>';
    var messageBodyDiv = '<span class="messageBody">' +
      data.message + '</span>';

    var typingClass = data.typing ? 'typing' : '';
    var messageDiv = '<li class="message ' + typingClass + '">' +
    usernameDiv + messageBodyDiv + '</li>';
    var $messageDiv = $(messageDiv).data('username', data.username);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop_typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // form events

  $messageForm.submit(function (e) {
    e.preventDefault();

    var $input = $(this).find('input');
    var message = cleanInput($input.val().trim());
    $input.val('');

    sendMessage(message);
  });

  $loginForm.submit(function (e) {
    e.preventDefault();

    var name = cleanInput($(this).find('input').val().trim());
    login(name);
  });

  $createRoomForm.submit(function (e) {
    e.preventDefault();

    var name = cleanInput($(this).find('input').val().trim());
    createRoom({
      name: name,
      lang: 'en',
      capacity: 2,
    });
  });

  // Keyboard events

  /*$window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop_typing');
        typing = false;
      } else {
        login();
      }
    }
  });*/

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

});
