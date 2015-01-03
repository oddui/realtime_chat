var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.send('respond with a resource');
});

router.post('/', function(req, res) {
  res.send('respond with a resource');
});

router.get('/:id', function(req, res) {
  res.send('respond with a resource');
});

router.put('/:id', function(req, res) {
  res.send('respond with a resource');
});

router.delete('/:id', function(req, res) {
  res.send('respond with a resource');
});

module.exports = router;
