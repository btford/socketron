
var util = require('util');

var State = require('./state');

// Router is a state with a few extras

var Router = module.exports = function (config) {
  State.apply(this, arguments);

  this._io = config.io;

  var thisRouter = this;

  // TOTEST
  this._io.on('connection', function (ioSock) {
    thisRouter.enter(ioSock);
    ioSock.on('disconnect', function () {
      thisRouter.exit(ioSock);
    });
  });
};

util.inherits(Router, State);

// in the context of the Router, state and substate are the same thing
// state is just syntactic sugar
Router.prototype.state = function (config) {
  return this.substate(config);
};

Router.prototype.substate = function (config) {
  config = config || {};
  config._router = this;
  return State.prototype.substate.apply(this, arguments);
};
