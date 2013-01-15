
var assert = require('should');

var State = require('../lib/state');
var noop = function () {};

// TODO: this
var SocketMock = require('events').EventEmitter;

describe('State', function () {

  var s, root, sock;

  beforeEach(function () {
    root = new State();
  });

  // constructor
  // -----------

  describe('#new', function () {
    it('should allow you to register listeners with the "on" option', function(){

      var n = 0;

      s = new State({
        on: {
          whatever: function () {
            n += 1;
          }
        }
      });

      sock = new SocketMock();

      s.enter(sock);
      sock.emit('whatever');
      n.should.equal(1);
    });
  });

  // methods
  // -------

  describe('#on', function () {

    beforeEach(function () {
      s = root.substate();
      sock = new SocketMock();
    });

    it('should throw an error if a name is not provided', function () {
      (function () {
        s.on();
      }).should.throw();
    });

    it('should throw an error if a listener is not provided', function () {
      (function () {
        s.on('something');
      }).should.throw();
    });

    it('should be chainable', function () {
      s.on('whatever', noop).should.equal(s);
    });

    it('should be replace old listeners when two are bound to the same event name', function () {
      var n = 0;
      
      s.enter(sock);

      // the first "whatever" shouldn't run
      s.on('whatever', function () {
        n += 1;
      });
      s.on('whatever', noop);

      sock.emit('whatever');

      n.should.equal(0);
    });

    it('should allow you to || event names', function () {
      var n = 0;

      s.on('whatever || whoever', function () {
        n += 1;
      });

      s.enter(sock);

      sock.emit('whatever');
      sock.emit('whoever');

      n.should.equal(2);
    });
  });


  describe('#enter', function () {

    beforeEach(function () {
      s = new State();
      sock = new SocketMock();
      sock.id = 'test';
    });

    it('should throw an error if no socket is provided', function () {
      (function () {
        s.enter();
      }).should.throw();
    });

    it('should bind listeners to a socket when the socket enters', function () {
      var n = 0;
      s.on('whatever', function () {
        n += 1;
      });
      s.enter(sock);
      sock.emit('whatever');
      n.should.equal(1);
    });

    it('should bind listeners to a socket when a listener is added', function () {
      var n = 0;
      s.enter(sock);
      s.on('whatever', function () {
        n += 1;
      });
      sock.emit('whatever');
      n.should.equal(1);
    });

    it('should be chainable', function () {
      s.enter(sock).should.equal(s);
    });


    it('should not be able to be in two sibling states at once', function () {
      var n = 0;
      var bro1 = s.substate({
        on: {
          whatever: function () { // this should not be called
            n += 1;
          }
        }
      });

      var bro = s.substate({
        on: {
          whatever: function () { // this should be called
            n += 2;
          }
        }
      });

      sock = new SocketMock();

      s.enter(sock);
      bro.enter(sock);

      sock.emit('whatever');
      n.should.equal(2);
    });

    it('should enter defaults', function () {
      var s = root.substate({
        default: true
      });
      root.enter(sock);

      s._sockets[sock.id].should.be.ok;
    });

    it('should not enter non-default children', function () {
      var s = root.substate({
        default: false
      });
      root.enter(sock);

      assert(s._sockets[sock.id] === undefined);
    });

  });


  describe('#substate', function () {

    it('should enter all ancestor states', function () {
      var child = s.substate();
      child.enter(sock);

      //TODO: not sure how to test this without checking internal state
      // :(
      s._sockets[sock.id].should.be.ok;
    });

  });


  describe('#state', function () {

    beforeEach(function () {
      s = root.substate();
      sock = new SocketMock();
    });

    it('should return a new state', function () {
      s.state().should.be.an.instanceOf(State);
    });

    it('should be chainable', function () {
      assert(s.state().state().state().should.be.ok);
    });

    it('should allow passing of a config param', function () {
      var n = 0;
      s = s.state({
        on: {
          whatever: function () {
            n += 1;
          }
        }
      });

      sock = new SocketMock();

      s.enter(sock);
      sock.emit('whatever');
      n.should.equal(1);
    });

    it('should create a sibling state that does not affect its peers', function () {
      var n = 0;
      var c1 = s.substate({
        on: {
          whatever: function () { // this should not be called
            n += 1;
          }
        }
      });
      var c2 = c1.state({
        on: {
          whatever: function () { // this should be called
            n += 2;
          }
        }
      });

      sock = new SocketMock();

      c2.enter(sock);
      sock.emit('whatever');
      n.should.equal(2);
    });

  });

});
