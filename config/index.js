var path = require('path');
var env = process.env.NODE_ENV || 'development';
var config = require(path.join(__dirname,  (env + '.json')));

config.port = process.env.PORT || config.port || 3000;

config.client.name = config.client.name || 'basic';
config.client.path = path.join('client', config.client.name, config.client.path);

module.exports = config;
