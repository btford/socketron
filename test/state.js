
var assert = require('should');

var State = require('../lib/state');
var noop = function () {};

var SocketMock = require('./mock/socket');
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

      s.add(sock);
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
      
      s.add(sock);

      // the first "whatever" shouldn't run
      s.on('whatever', function () {
        n += 1;
      });
      s.on('whatever', noop);

      sock.emit('whatever');

      n.should.equal(0);
    });

    it('should pass message, state, socket to the listener', function () {
      
      s.add(sock);

      s.on('whatever', function (message, state, socket) {
        message.should.equal('something');
        state.should.equal(s);
        socket.should.equal(sock);
      });

      sock.emit('whatever', 'something');
    });

    it('should allow you to || event names', function () {
      var n = 0;

      s.on('whatever || whoever', function () {
        n += 1;
      });

      s.add(sock);

      sock.emit('whatever');
      sock.emit('whoever');

      n.should.equal(2);
    });
  });


  describe('#add', function () {

    beforeEach(function () {
      s = new State();
      sock = new SocketMock();
      sock.id = 'test';
    });

    it('should throw an error if no socket is provided', function () {
      (function () {
        s.add();
      }).should.throw();
    });

    it('should bind listeners to a socket when the socket adds', function () {
      var n = 0;
      s.on('whatever', function () {
        n += 1;
      });
      s.add(sock);
      sock.emit('whatever');
      n.should.equal(1);
    });

    it('should bind listeners to a socket when a listener is added', function () {
      var n = 0;
      s.add(sock);
      s.on('whatever', function () {
        n += 1;
      });
      sock.emit('whatever');
      n.should.equal(1);
    });

    it('should return success state', function () {
      s.add(sock).should.be.ok;
      s.add(sock).should.not.be.ok;
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

      bro1.add(sock);
      bro.add(sock);

      sock.emit('whatever');
      n.should.equal(2);
    });


    it('should be able to leave and join siblings', function () {
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

      bro.add(sock);
      bro1.add(sock);
      bro.add(sock);

      sock.emit('whatever');
      n.should.equal(2);
    });

    it('should be able to leave and join back', function () {
      var n = 0;

      var bro = s.substate({
        on: {
          whatever: function () { // this should be called
            n += 2;
          }
        }
      });

      sock = new SocketMock();

      bro.add(sock);
      bro.remove(sock);
      bro.add(sock);

      sock.emit('whatever');
      n.should.equal(2);
    });

    it('should not join the same lobby twice', function () {
      var n = 0;

      var bro = s.substate({
        on: {
          whatever: function () { // this should be called
            n += 2;
          }
        }
      });

      sock = new SocketMock();

      bro.add(sock);
      bro.add(sock);

      sock.emit('whatever');
      n.should.equal(2);
    });

    it('should add defaults', function () {
      var s = root.substate({
        default: true
      });
      root.add(sock);

      s._sockets[sock.id].should.be.ok;
    });

    it('should not add non-default children', function () {
      var s = root.substate({
        default: false
      });
      root.add(sock);

      assert(s._sockets[sock.id] === undefined);
    });

    it('should fire $add', function () {
      var n = 0;
      s.on('$add', function (state, socket) {
        s.should.equal(this);
        s.should.equal(state);
        sock.should.equal(sock);
        n += 1;
      });
      s.add(sock);
      n.should.equal(1);
    });

    it('should fire $add of parent states before firing $add of children', function () {
      var n = 0;
      var child = s.substate({
        on: {
          $add: function () {
            n *= 2;
          }
        }
      });
      s.on('$add', function (state, socket) {
        n += 2;
      });
      child.add(sock);

      n.should.equal(4);
    });

  });


  describe('#remove', function () {

    beforeEach(function () {
      s = new State();
      sock = new SocketMock();
      sock.id = 'test';
      s.add(sock);
    });

    it('should return success state', function () {
      s.remove(sock).should.be.ok;
      s.remove(sock).should.not.be.ok;
    });

    it('should unbind listeners', function () {
      var n = 0;

      s.on('whatever', function () { // this should be called
        n += 1;
      });

      s.remove(sock);

      sock.emit('whatever');
      n.should.equal(0);
    });


    it('should fire $remove of children states before parents', function () {
      var n = 0;
      s.on('$remove', function (state, socket) {
        s.should.equal(this);
        s.should.equal(state);
        sock.should.equal(sock);
        n += 1;
      });
      s.remove(sock);
      n.should.equal(1);
    });

    it('should fire $remove', function () {
      var n = 0;
      var child = s.substate({
        on: {
          $remove: function () {
            n += 2;
          }
        }
      });
      s.on('$remove', function (state, socket) {
        n *= 2;
      });
      n.should.equal(0);
      
      child.add(sock);
      n.should.equal(0);
      
      s.remove(sock);
      n.should.equal(4);
    });

  });


  describe('#substate', function () {

    it('should add all ancestor states', function () {
      var child = s.substate();
      child.add(sock);

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

      s.add(sock);
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

      c2.add(sock);
      sock.emit('whatever');
      n.should.equal(2);
    });

  });


  describe('#broadcast', function () {
    beforeEach(function () {
      s = root.substate();
      sock = new SocketMock();
    });

    it('should broadcast to all sockets', function () {
      var sock2 = new SocketMock();
      s.add(sock);
      s.add(sock2);
      var n = 0;
      sock.on('whatever', function () {
        n += 1;
      });
      sock2.on('whatever', function () {
        n += 2;
      });
      s.broadcast('whatever');
      n.should.equal(3);
    });

    it('should not broadcast to sockets that have left', function () {
      s.add(sock);
      s.remove(sock);
      var n = 0;
      sock.on('whatever', function () {
        n += 1;
      });
      s.broadcast('whatever');
      n.should.equal(0);
    });

  });

  describe('#removeAll', function () {

    var sock2;
    beforeEach(function () {
      s = root.substate();
      sock = new SocketMock();
      sock2 = new SocketMock();
    });

    it('should remove all sockets from the state', function () {
      s.add(sock);
      s.add(sock2);
      s.removeAll();
      var n = 0;
      sock.on('whatever', function () {
        n += 1;
      });
      sock2.on('whatever', function () {
        n += 2;
      });
      s.broadcast('whatever');
      n.should.equal(0);
    });

  });

});
