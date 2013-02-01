# Socketron

[![Build Status](https://travis-ci.org/btford/socketron.png)](https://travis-ci.org/btford/socketron)

Socketron is an [event-driven state machine](http://en.wikipedia.org/wiki/Event-driven_finite-state_machine) for routing sockets.

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

Didn't scale very well. Organization became difficult, and much spaghetti code ensued.

## Install
Install with npm:
```bash
npm install socketron
```

## Use
Give it a socket.io instance and you're good to go!

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

## License
MIT
