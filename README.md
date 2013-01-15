O hapless Github wanderer: this is but a work in progress.

# Socketron
An event-driven state machine for routing sockets and stuff.

[It's like this](http://en.wikipedia.org/wiki/Event-driven_finite-state_machine) kinda.

## Motivation
I found when working with socket.io, that:

```javascript
io.sockets.on('connection', function (socket) {
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

## Examples
```javascript
var io = require('socket.io').listen(80);
var socketron = require('socketron');

var router = socketron(io).init(io);
router
  .state({
    name: 'lobby',
    default: true, // this is where newly connected sockets go
    on: {
      'start:game': function (message, state, socket) {

      }
    }
  })
  .state('game', {
    
  });

```

## License
MIT
