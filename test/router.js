
var assert = require("should");

var Router = require('../lib/router');
var State = require('../lib/state');

// TODO: make this
var socketMock = {};

describe('Router', function () {

  var r;

  beforeEach(function () {
    r = new Router(socketMock);
  });

  // constructor
  // -----------

  /*
  describe('#new', function () {
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
  */

  // methods
  // -------

  describe('#state', function () {
    it('should return a state', function () {
      r.state('whatever').should.be.an.instanceOf(State);
    });
  });


  describe('#getState', function () {
    
    it('should retrieve a set created with #state', function () {
      var s = r.state('whatever');
      r.getState('whatever').should.equal(s);
    });

    it('should return undefined for unregistered names', function () {
      assert.equal(undefined, r.getState('whatever'));
    });

  });

});
