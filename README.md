# Socketron

[![Build Status](https://travis-ci.org/btford/socketron.png)](https://travis-ci.org/btford/socketron)

Socketron is an [event-driven state machine](http://en.wikipedia.org/wiki/Event-driven_finite-state_machine) for routing messages to and from WebSockets.

It's an abstraction layer directly above [Socket.IO](http://socket.io).

## Motivation
I found when working with socket.io, that:

```javascript
io.sockets.on('connection', function (socket) {
  var someState = { ... };
  socket.on('this', function (...) { ... });
  socket.on('that', function (...) { ... });
  socket.on('the other thing', function (...) { ... });
  // ...
});
```

Didn't scale very well. I wanted to be able to add/remove listeners depending on a user's state.

Organization became difficult, and much spaghetti code ensued.

My primary focus is to make it easy to write things like games and chat rooms where you have users connected via socket in some associated room, level, or group.

## Concepts

### State
Not application state, but state machine state.

## Install
Install with npm:
```bash
npm install socketron
```

## Example
```javascript
var io = require('socket.io').listen(80);
var socketron = require('socketron');

var router = socketron.init(io);
router
  .state({
    name: 'lobby',
    default: true, // this is where newly connected sockets go
    on: {
      'start:game': function (message, state, socket) {
        state.moveAllTo(state.parent().getSubstate('game'));
      }
    }
  })
  .state('game', {
    '$add': function (state, socket) {
      state.players[socket.id] = { x: 0, y: 0};
    },
    'move:player': function (message, state, socket) {
      state.players[socket.id].x = message.x;
      state.players[socket.id].y = message.y;
      state.broadcast('update:player', state.players[socket.id]);
    }
  });

```

## API
[Annotated source](http://btford.github.com/socketron/state.html)

## Tests
Socketron includes a full test suite. See the [annotated source](http://btford.github.com/socketron/test/state.html) for more.

## Developer's Guide
Wanna hack on Socketron?

### Running Tests
Run with `npm`.

```bash
npm test
```

### Generating Docs
Requires docco.

Run with npm:
```bash
npm run docs
```

## License
MIT
