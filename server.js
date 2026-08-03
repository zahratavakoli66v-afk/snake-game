
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
let hostId = null;
let gameStarted = false;

io.on('connection', (socket) => {

  socket.on('joinGame', (data) => {

    players[socket.id] = data.name;

    // اولین بازیکن میزبان می‌شود
    if(!hostId){
      hostId = socket.id;
    }

    io.emit('playersList', Object.values(players));

    io.emit('hostInfo', {
      hostId,
      gameStarted
    });

  });

  socket.on('startGame', () => {

    if(socket.id !== hostId) return;

    gameStarted = true;

    io.emit('gameStarted');

  });

  socket.on('chatMessage', (message) => {

    io.emit('chatMessage', {
      name: players[socket.id],
      message
    });

  });

  socket.on('disconnect', () => {

    delete players[socket.id];

    // اگر میزبان خارج شد
    if(socket.id === hostId){

      const ids = Object.keys(players);

      hostId = ids.length ? ids[0] : null;

      gameStarted = false;

    }

    io.emit('playersList', Object.values(players));

    io.emit('hostInfo', {
      hostId,
      gameStarted
    });

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
```
