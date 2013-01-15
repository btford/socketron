var Router = require('./lib/router');
exports.init = function (io) {
  return new Router({
    io: io
  });
};
