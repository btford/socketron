var util = require('util');

// mock socket
var nextSockMockId = 1;

var SocketMock = module.exports = function () {
  require('events').EventEmitter.apply(this, arguments);
  this.id = nextSockMockId++;
};

util.inherits(SocketMock, require('events').EventEmitter);
