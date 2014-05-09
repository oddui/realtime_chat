$(function() {
  var FADE_TIME = 150; // ms

  // Initialize varibles
  var $window = $(window);
  var $loginForm = $('#loginForm');
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $messageForm = $('#messageForm');
  var $messageInput = $('.messageInput'); // Input message input box
  var $createRoomForm = $('#createRoomForm'); // Input for username

  var $loginPage = $('.login.page'); // The login page
  var $roomsPage = $('.rooms.page'); // The rooms page
  var $chatPage = $('.chat.page'); // The chatroom page

  var $currentInput = $usernameInput.focus();

  var User = window.models.User;
  var Room = window.models.Room;
  var roomsViewModel = window.models.roomsViewModel;

  var user = new User();
  window.user = user;

  ko.applyBindings(roomsViewModel, $('ul#rooms')[0]);

  // Prevents input from having injected markup
  var cleanInput = function (input) {
    return $('<div/>').text(input).html() || input;
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
  var log = function (message, options) {
    var el = '<li class="log">' + message + '</li>';
    addMessageElement(el, options);
  };

  // Adds the visual chat message to the message list
  var addChatMessage = function (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var colorStyle = 'style="color:' + getNameColor(data.username) + '"';
    var usernameDiv = '<span class="username"' + colorStyle + '>' +
      data.username + '</span>';
    var messageBodyDiv = '<span class="messageBody">' +
      data.message + '</span>';

    var typingClass = data.typing ? 'typing' : '';
    var messageDiv = '<li class="message ' + typingClass + '">' +
    usernameDiv + messageBodyDiv + '</li>';
    var $messageDiv = $(messageDiv).data('username', data.username);

    addMessageElement($messageDiv, options);
  };

  // Adds the visual chat typing message
  var addChatTyping = function (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  };

  // Removes the visual chat typing message
  var removeChatTyping = function (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  };

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  var addMessageElement = function (el, options) {
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
  };

  // Gets the 'X is typing' messages of a user
  var getTypingMessages = function (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  };

  // Gets the color of a username through our hash function
  var getNameColor = (function () {
    var COLORS = [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    return function (name) {
      // Compute hash code
      var hash = 7;
      for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + (hash << 5) - hash;
      }
      // Calculate color
      var index = Math.abs(hash % COLORS.length);
      return COLORS[index];
    };
  })();

  // form events

  $messageForm.submit(function (e) {
    e.preventDefault();

    var $input = $(this).find('input');
    var message = cleanInput($input.val().trim());
    $input.val('');

    user.sendMessage(message);

    addChatMessage({
      username: user.name,
      message: message
    });
  });

  $loginForm.submit(function (e) {
    e.preventDefault();

    var name = cleanInput($(this).find('input').val().trim());

    user.name = name;

    user.login(function () {
      // ui
      $loginPage.fadeOut();
      $roomsPage.show();
      $loginPage.off('click');
      $currentInput = $messageInput.focus();
    },
    function (socket) {
      // Socket events
      socket.on('join_response', function (data) {
        if (data.success) {
          username = name;

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

    });
  });

  $createRoomForm.submit(function (e) {
    e.preventDefault();

    var name = cleanInput($(this).find('input').val().trim());
    user.createRoom({
      name: name,
      lang: 'en',
      capacity: 2,
    }, function () {
      roomsViewModel.refresh();
    });
  });

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
  });

  $messageInput.on('input', function() {
    user.updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $messageInput.click(function () {
    $(this).focus();
  });

});
