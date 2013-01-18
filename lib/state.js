
var unnamedId = 0;

var State = module.exports = function (config) {

  config = config || {}; // TODO: deep copy?

  this._events = {};
  this._subStates = {};
  this._sockets = {};

  this.model = config.model || {};

  this._name = config.name || ('__unnamed' + (unnamedId++));

  //this._default = config._default || null;

  this._parent = config._parent || null;
  this._router = config._router;

  if (typeof config.on === 'object') {
    for (var handlerName in config.on) {
      if (config.on.hasOwnProperty(handlerName)) {
        this.on(handlerName, config.on[handlerName]);
      }
    }
  }
};

// register a new handler for this state
State.prototype.on = function (name, fn) {
  if (!name || !fn) {
    throw new Error("Invalid arguments");
  }

  // allow registering the same handler to multiple events
  if (name.indexOf(' || ') !== -1) {
    name.split(' || ').forEach(function (name) {
      this.on(name, fn);
    }, this);
    return;
  }
  //console.log(this._name, 'addListener', name);

  // if that event name is claimed, unregister it first
  var socketId;
  if (this._events[name]) {
    for (socketId in this._sockets) {
      if (this._sockets.hasOwnProperty(socketId)) {
        this._sockets[socketId].removeListener(name, this._events[name]);
      }
    }
  }

  var thisState = this;
  var hackedFn = this._events[name] = function (message) {
    //console.log(this.id, 'trigger', thisState._name, fn.toString());
    return fn.apply(thisState, [message, thisState, this]);
  };

  for (socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this._sockets[socketId].on(name, hackedFn);
    }
  }

  return this;
};


// return success/failure
State.prototype.add = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  if (this._sockets[socket.id]) {
    return false;
  }
  console.log('-> added', socket.id, 'to', this._name);
  this._sockets[socket.id] = socket;

  if (this._parent) {
    // TODO: this implementation reaches into the parent state via a private API
    // remove siblings
    if (!this._parent.add(socket)) {
      for (var siblingName in this._parent._subStates) {
        if (siblingName === this._name) {
          continue;
        }
        if (this._parent._subStates.hasOwnProperty(siblingName)) {
          this._parent._subStates[siblingName].remove(socket);
        }
      }
    }
  }


  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
      //console.log(handlerName, socket.id);
      socket.on(handlerName, this._events[handlerName]);
    }
  }

  if (this._default) {
    var addToDefault = true;
    for (var childName in this._subStates) {
      if (this._subStates.hasOwnProperty(childName)) {
        if (this._subStates[childName]._sockets[socket.id]) {
          addToDefault = false;
          break;
        }
      }
    }
    if (addToDefault) {
      console.log('adding to default');
      this._default.add(socket);
    }
  }

  console.log('added', socket.id, 'to', this._name, '->');
  return true;
};

// remove the socket from
State.prototype.remove = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  // socket's not in here
  if (!this._sockets[socket.id]) {
    return false;
  }
  console.log('-> removed', socket.id, 'from', this._name);

  for (var childName in this._subStates) {
    if (this._subStates.hasOwnProperty(childName)) {
      console.log(childName);
      this._subStates[childName].remove(socket);
    }
  }

  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
      socket.removeListener(handlerName, this._events[handlerName]);
    }
  }

  delete this._sockets[socket.id];
  console.log('removed', socket.id, 'from', this._name, '->');
  return true;
};

// remove all sockets from this state
State.prototype.removeAll = function () {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this.remove(this._sockets[socketId]);
    }
  }
};

// TOTEST
// broadcast to each socket in this state
// arguments match socket.io#socket#emit
State.prototype.broadcast = function () {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this._sockets[socketId].emit.apply(this._sockets[socketId], arguments);
    }
  }
};

// TOTEST
// move all of this state's sockets to a new state
State.prototype.moveAllTo = function (newState) {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      newState.add(this._sockets[socketId]);
    }
  }
};

// create a sibling state
State.prototype.state = function (config) {
  if (!this._parent) {
    throw new Error("No parent; cannot make sibling");
  }
  return this._parent.substate(config);
};

// create a substate of this state
State.prototype.substate = function (config) {
  config = config || {};
  config._parent = this;
  config._router = config._router || this._router;
  var StateType = config.type || State;

  var s = new StateType(config);
  this._subStates[s._name] = s;

  if (config.default) {
    this._default = s;
  }

  return s;
};

// TOTEST
// delete a state's substate
State.prototype.destroySubstate = function (stateName) {
  this._subStates[stateName].removeAll();
  if (this._subStates._destroy) {
    this._subStates._destroy();
  }
  delete this._subStates[stateName];
};

State.prototype.getSubstate = function (stateName) {
  return this._subStates[stateName];
};

// get states based on path
// separated by /
// does not do parent paths (yet) ex: ../
// prefix with / to start at root. ex: /a/b/c
State.prototype.getPath = function (path) {
  if (!(path instanceof Array)) {
    path = path.split('/');
  }
  var first = path.shift();
  if (path.length === 0) {
    return this._subStates[first];
  }

  return this._subStates[first].getSubstate(path);
};

// TOTEST
// get parent state
State.prototype.parent = State.prototype.getParent = function () {
  return this._parent;
};

// TOTEST
// get router
State.prototype.router = State.prototype.getRouter = function () {
  return this._router;
};
