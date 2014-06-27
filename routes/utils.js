
// CORS middleware
var cors = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // intercept OPTIONS method
  if ('OPTIONS' == req.method) {
    res.send(200);
  }
  else {
    next();
  }
};

// expiresNow middleware
var expiresNow = function(req, res, next) {
  res.set({
    'Expires': '-1',
    //'Cache-Control': 'no-cache',
  });
  next();
};

module.exports = {
  cors: cors,
  expiresNow: expiresNow,
};
