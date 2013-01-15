
var assert = require('should');

var Router = require('../lib/router');
var State = require('../lib/state');

var noop = function () {};

// TODO: this
var SocketMock = require('./mock/socket');
var SocketIOMock = require('events').EventEmitter;

describe('Router', function () {

  var s, root, sock;

  beforeEach(function () {
    root = new Router({
      io: new SocketIOMock()
    });
  });

  // constructor
  // -----------

  describe('#new', function () {
    it('should be an instance of state', function () {
      root.should.be.an.instanceOf(State);
    });
  });

  // methods
  // -------

  describe('#state', function () {
    it('should create a substate when called on a router', function () {
      var expected = root.substate();
      var actual = root.getSubstate(expected._name);
      actual.should.equal(expected);
    });
  });

});
