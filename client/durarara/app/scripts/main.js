$(function () {
  'use strict';

  //var $window = $(window);
  var $loginForm = $('.login.page #login');
  //var $createRoomForm = $('.createRoomForm');

  var User = window.models.User;
  //var Room = window.models.Room;
  //var roomsViewModel = window.models.roomsViewModel;

  var user = new User();
  window.user = user;
  //ko.applyBindings(roomsViewModel, $('ul#rooms')[0]);

  // Prevents input from having injected markup
  var cleanInput = function (input) {
    return $('<div/>').text(input).html() || input;
  };

  $loginForm.submit(function (e) {
    e.preventDefault();

    var name = cleanInput($(this).find('input').val().trim());

    user.name = name;

    user.login(function () {
      // ui
      /*$loginPage.fadeOut();
      $roomsPage.show();
      $loginPage.off('click');
      $currentInput = $messageInput.focus();*/
    },
    function (socket) {
      // Socket events
      socket.on('join_response', function (data) {
        if (data.success) {

          // ui
          /*$roomsPage.fadeOut();
          $chatPage.show();*/

        } else {
          console.log(data);
        }
      });

      // Whenever the server emits 'user joined', log it in the chat body
      socket.on('user_joined', function (data) {
      });

      // Whenever the server emits 'user left', log it in the chat body
      socket.on('user_left', function (data) {
      });

      // Whenever the server emits 'typing', show the typing message
      socket.on('typing', function (data) {
      });

      // Whenever the server emits 'stop typing', kill the typing message
      socket.on('stop_typing', function (data) {
      });

      // Whenever the server emits 'new message', update the chat body
      socket.on('new_message', function (data) {
      });

      socket.on('error', function (data) {
        console.log(data);
      });

    });
  });

  /*$createRoomForm.submit(function (e) {
    e.preventDefault();

    var name = cleanInput($(this).find('input').val().trim());
    user.createRoom({
      name: name,
      lang: 'en',
      capacity: 2,
    }, function () {
      roomsViewModel.refresh();
    });
  });*/

});
