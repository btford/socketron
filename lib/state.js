
var State = module.exports = function (config) {

  this._events = {};
  this._subStates = {};
  this._sockets = {};

  config = config || {}; // TODO: deep copy?
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
    this._parent.enter(socket);
  }

  this._sockets[socket.id] = socket;

  for (var handlerName in this._events) {
    if (this._events.hasOwnProperty(handlerName)) {
      socket.on(handlerName, this._events[handlerName]);
    }
  }

  return this;
};

State.prototype.exit = function (socket) {
  if (!socket) {
    throw new Error("Invalid arguments");
  }

  for (var handlerName in this._config.on) {
    if (this._config.on.hasOwnProperty(handlerName)) {
      socket.removeListener(handlerName, this._config.on);
    }
  }

  return this;
};

// create a sibling state
State.prototype.state = function (config) {
  config = config || {};
  config._parent = this._parent;
  return new State(config);
};

// create a substate of this state
State.prototype.substate = function (config) {
  config = config || {};
  config._parent = this;
  return new State(config);
};

// get parent state
State.prototype.parent = State.prototype.getParent = function () {
  return this._parent;
};

// get router
State.prototype.router = State.prototype.getRouter = function () {
  return this._router;
};
