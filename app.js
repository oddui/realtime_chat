var fs = require('fs');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('./config');
var debug = require('debug')('rtc:app');

// connect to mongodb
//
var connect = function () {
  mongoose.connect(config.db);
};
connect();
mongoose.connection.on('error', debug);
mongoose.connection.on('disconnected', connect);

// bootstrap models
//
fs.readdirSync(__dirname + '/models').forEach(function (file) {
  if (~file.indexOf('.js')) {
    require(__dirname + '/models/' + file);
    debug('loaded model: ' + file);
  }
});

// express settings
//
var routes = require('./routes/index');
var admin = require('./routes/admin');
var users = require('./routes/users');
var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// initialize passport
require('./config/passport')(passport, config);
app.use(passport.initialize());

app.use('/', routes);
app.use('/admin', admin);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});


module.exports = app;
