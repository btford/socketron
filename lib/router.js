var State = require('./state');
var socketIO = require('socket.io');

var Router = module.exports = function (io) {
  this.io = io; // || socketIO.listen(); // idk about this
  this.states = {};
};

// state factory
Router.prototype.state = function (name, config) {
  if (!config) {
    config = {};
  }
  config.name = name;
  config.router = this;

  return this.states[name] = new State(config);
};

// get state
Router.prototype.getState = function (stateName) {
  return this.states[stateName];
};
