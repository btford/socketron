O hapless Github wanderer: this is but a work in progress.

# Socketron
A state machine for sockets.
Routing for sockets.

## Motivation
I found when working with socket.io, that:

```javascript
io.sockets.on('connection', function (socket) {
  socket.on('this', function (...) { ... });
  socket.on('that', function (...) { ... });
  socket.on('the other thing', function (...) { ... });
  // ...
});

Didn't scale very well.

## Install
Install with npm:
```bash
npm install socketron
```

## Use
Give it a socket object and you're good to go!

## Examples
```javascript
var io = require('socket.io').listen(80);
var socketron = require('socketron');

socketron
.state('lobby', {
  default: true, // this is where newly connected sockets go
  on: {

  }
})
.state('game', {
  
});

```

## License
MIT
