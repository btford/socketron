var Router = require('./lib/router');
var State = require('./lib/state');
exports.init = function (io) {
  return new Router({
    io: io
  });
};
exports.State = State;
