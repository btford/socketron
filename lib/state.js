
var unnamedId = 0; // used to give states unique names

// `$add` and `$remove` are events reserved by Socketron for when a socket
// is added or removed from the state.
var reservedEventNames = [
  '$add',
  '$remove'
];

// ## State
// Define the `State` prototype.
// This is the bread and butter of Socketron.
// ### Terms
// "State" in this sense refers to a [state machine][wiki-fsm] state, not [program/application state][wiki-pro].
// _Application state_ is hereby refereed to as _model/models_ to avoid confusion.
// [wiki-fsm]: http://en.wikipedia.org/wiki/Finite-state_machine "Wikipedia - Finite-state machine"
// [wiki-pro]: http://en.wikipedia.org/wiki/State_(computer_science)#Program_state "Wikipedia - Program state"
// ### Protips
// * properties prefixed with an underscore are "private" ex: `_events`.
//   You probably want to avoid messing with these unless you are careful.
// * Unprefixed properties are all yours.
var State = module.exports = function (config) {

  config = config || {}; // TODO: deep copy?

  this._events = {};
  this._subStates = {};
  this._sockets = {};

  this.model = config.model || {};

  this._name = config.name || ('__unnamed' + (unnamedId++));

  this._default = config._default || null;

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

// ## on()
// Register a new handler for this state
State.prototype.on = function (name, fn) {
  if (!name || !fn) {
    throw new Error("Invalid arguments");
  }

  // Allow registering the same handler to multiple event names.
  // Event names must be seperated by ` || ` for this to work.
  // Note the whitespace there: "space pipe pipe space"
  //
  // Ex: `$remove || leave`
  if (name.indexOf(' || ') !== -1) {
    name.split(' || ').forEach(function (name) {
      this.on(name, fn);
    }, this);
    return;
  }

  // don't bind reserved events to the socket;
  // socketron states will call those on the add/remove of a socket to the state
  if (reservedEventNames.indexOf(name) !== -1) {
    this._events[name] = fn;
    return this;
  }

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
    return fn.apply(thisState, [message, thisState, this]);
  };

  for (socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this._sockets[socketId].on(name, hackedFn);
    }
  }

  return this;
};

// ## add(socket)
// Add `socket` to this state.
// Returns a boolean corresponding to success or failure.
State.prototype.add = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  // Return `false` if `socket` is already in this state.
  // This prevents a socket from being added to this state twice.
  if (this._sockets[socket.id]) {
    return false;
  }
  this._sockets[socket.id] = socket;

  // Make sure a socket is added to all of this state's ancestors first.
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

  // If there's an `$add` event registered, fire it now
  if (this._events.$add) {
    this._events.$add.apply(this, [this, socket]);
  }

  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
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
      this._default.add(socket);
    }
  }

  return true;
};

// ## remove(socket)
// Remove `socket` from this state.
// Returns a boolean corresponding to success or failure.
State.prototype.remove = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  // If the socket's not in this state, return `false`.
  if (!this._sockets[socket.id]) {
    return false;
  }

  for (var childName in this._subStates) {
    if (this._subStates.hasOwnProperty(childName)) {
      this._subStates[childName].remove(socket);
    }
  }


  if (this._events.$remove) {
    this._events.$remove.apply(this, [this, socket]);
  }

  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
      socket.removeListener(handlerName, this._events[handlerName]);
    }
  }

  delete this._sockets[socket.id];
  return true;
};

// ## removeAll()
// remove all sockets from this state
State.prototype.removeAll = function () {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this.remove(this._sockets[socketId]);
    }
  }
};

// ## broadcast()
// broadcast to each socket in this state
// arguments match socket.io#socket#emit
//
// TOTEST
State.prototype.broadcast = function () {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this._sockets[socketId].emit.apply(this._sockets[socketId], arguments);
    }
  }
};

// ## moveAllTo()
// move all of this state's sockets to a new state
//
// TOTEST
State.prototype.moveAllTo = function (newState) {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      newState.add(this._sockets[socketId]);
    }
  }
};

// ## state()
// create a state which is a sibling to this state
State.prototype.state = function (config) {
  if (!this._parent) {
    throw new Error("No parent; cannot make sibling");
  }
  return this._parent.substate(config);
};

// ## substate()
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

// ## destroySubstate()
// delete a state's substate.
//
// TOTEST
State.prototype.destroySubstate = function (stateName) {
  this._subStates[stateName].removeAll();
  if (this._subStates._destroy) {
    this._subStates._destroy();
  }
  delete this._subStates[stateName];
};

// ## getSubstate()
// Returns the state with the given name, else `undefined`
State.prototype.getSubstate = function (stateName) {
  return this._subStates[stateName];
};

// ## getPath()
// Get a state based on its relative path.
// ### Protips
// * Paths are separated by `/`
// * `getPath` does not do parent paths (yet)
//   ex: `../`
// * Prefix a path with with `/` to start at root.
//   ex: `/a/b/c`
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

// ## parent()
// get parent state
//
// TOTEST
State.prototype.parent = State.prototype.getParent = function () {
  return this._parent;
};

// ## router()
// get router
//
// TOTEST
State.prototype.router = State.prototype.getRouter = function () {
  return this._router;
};
