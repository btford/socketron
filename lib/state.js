
var unnamedId = 0;

var State = module.exports = function (config) {

  config = config || {}; // TODO: deep copy?

  this._events = {};
  this._subStates = {};
  this._sockets = {};

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

  this._events[name] = fn;

  for (socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this._sockets[socketId].on(name, fn);
    }
  }

  return this;
};

// TODO: these are private ?

State.prototype.enter = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  if (this._sockets[socket.id]) {
    return;
  }

  if (this._parent) {

    // TODO: this implementation reaches into the parent state via a private API
    // exit siblings
    for (var siblingName in this._parent._subStates) {
      if (this._parent._subStates.hasOwnProperty(siblingName)) {
        this._parent._subStates[siblingName].exit(socket);
      }
    }

    this._parent.enter(socket);
  }


  this._sockets[socket.id] = socket;

  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
      socket.on(handlerName, this._events[handlerName]);
    }
  }

  if (this._default) {
    this._default.enter(socket);
  }

  return this;
};

State.prototype.exit = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  // socket's not in here
  if (!this._sockets[socket.id]) {
    return;
  }

  for (var childName in this._subStates) {
    if (this._subStates.hasOwnProperty(childName)) {
      this._subStates[childName].exit(socket);
    }
  }

  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
      socket.removeListener(handlerName, this._events[handlerName]);
    }
  }

  return this;
};

// TOTEST
State.prototype.allExit = function () {
  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      this.exit(this._sockets[socketId]);
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
State.prototype.allMoveTo = function (newState) {

  // first, construct a traversal up the tree from each state
  var newStateLineage = [newState];
  while (newStateLineage[newStateLineage.length - 1]._parent) {
    newStateLineage.push(newStateLineage[newStateLineage.length - 1]._parent);
  }

  var thisStateLineage = [newState];
  while (thisStateLineage[thisStateLineage.length - 1]._parent) {
    thisStateLineage.push(thisStateLineage[thisStateLineage.length - 1]._parent);
  }

  // then, iterate through each of the newState's ancestors until we find a common one
  for (var i = 0; i < thisStateLineage.length; i++) {
    if (thisStateLineage[i].indexOf(newStateLineage) !== -1) {
      break;
    }
  }
  thisStateLineage[i-1].allExit();

  for (var socketId in this._sockets) {
    if (this._sockets.hasOwnProperty(socketId)) {
      newState.enter(this._sockets[socketId]);
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
  config._router = this._router;
  var s = new State(config);
  this._subStates[s._name] = s;

  if (config.default) {
    this._default = s;
  }

  return s;
};

State.prototype.removeSubstate = function (path) {
  // wtf do you do to all of the substate's substates?
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

// get parent state
State.prototype.parent = State.prototype.getParent = function () {
  return this._parent;
};

// get router
State.prototype.router = State.prototype.getRouter = function () {
  return this._router;
};
