
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 10000;

// وضعیت کلی
let players = {};        // socket.id -> player
let usernames = new Set();
let queue = [];          // صف انتظار
let game = {
  playerTop: null,
  playerBottom: null,
  running: false,
  timer: 180,
  interval: null,
  timerInterval: null,
  ball: {
    x: 200,
    y: 300,
    vx: 3,
    vy: -4
  }
};

function createPlayer(id, name) {
  return {
    id,
    name,
    score: 0,
    totalScore: 0,
    paddleX: 150,
    ready: false
  };
}

function broadcastPlayers() {
  io.emit('playersList', Object.values(players).map(p => ({
    name: p.name,
    totalScore: p.totalScore
  })));
}

function assignPlayers() {
  if (!game.playerBottom && queue.length > 0) {
    game.playerBottom = queue.shift();
  }

  if (!game.playerTop && queue.length > 0) {
    game.playerTop = queue.shift();
  }

  io.emit('queueUpdate', {
    top: game.playerTop ? players[game.playerTop].name : null,
    bottom: game.playerBottom ? players[game.playerBottom].name : null,
    queue: queue.map(id => players[id].name)
  });

  if (game.playerTop && game.playerBottom) {
    startMatch();
  }
}

function resetBall(direction = -1) {
  game.ball.x = 200;
  game.ball.y = 300;
  game.ball.vx = (Math.random() > 0.5 ? 3 : -3);
  game.ball.vy = 4 * direction;
}

function startMatch() {
  if (game.running) return;

  game.running = true;
  game.timer = 180;

  players[game.playerTop].score = 0;
  players[game.playerBottom].score = 0;

  resetBall(-1);

  io.emit('matchStarted', {
    top: players[game.playerTop].name,
    bottom: players[game.playerBottom].name
  });

  game.interval = setInterval(updateGame, 16);

  game.timerInterval = setInterval(() => {
    game.timer--;
    io.emit('timer', game.timer);

    if (game.timer <= 0) {
      finishMatch();
    }
  }, 1000);
}

function finishMatch() {
  clearInterval(game.interval);
  clearInterval(game.timerInterval);

  game.running = false;

  const top = players[game.playerTop];
  const bottom = players[game.playerBottom];

  let winnerId = null;
  let loserId = null;

  if (top.score >= bottom.score) {
    winnerId = game.playerTop;
    loserId = game.playerBottom;
  } else {
    winnerId = game.playerBottom;
    loserId = game.playerTop;
  }

  players[winnerId].totalScore += 10;

  queue.push(loserId);

  if (winnerId === game.playerTop) {
    game.playerBottom = null;
  } else {
    game.playerTop = null;
  }

  io.emit('matchFinished', {
    winner: players[winnerId].name,
    totalScore: players[winnerId].totalScore
  });

  broadcastPlayers();
  assignPlayers();
}

function updateGame() {
  const ball = game.ball;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // برخورد با دیوارهای چپ و راست
  if (ball.x <= 0 || ball.x >= 400) {
    ball.vx *= -1;
  }

  // برخورد با راکت پایین
  if (
    game.playerBottom &&
    ball.y >= 570 &&
    ball.x >= players[game.playerBottom].paddleX &&
    ball.x <= players[game.playerBottom].paddleX + 100
  ) {
    ball.vy = -Math.abs(ball.vy);
    ball.vx += (ball.x - (players[game.playerBottom].paddleX + 50)) / 25;
  }

  // برخورد با راکت بالا
  if (
    game.playerTop &&
    ball.y <= 30 &&
    ball.x >= players[game.playerTop].paddleX &&
    ball.x <= players[game.playerTop].paddleX + 100
  ) {
    ball.vy = Math.abs(ball.vy);
    ball.vx += (ball.x - (players[game.playerTop].paddleX + 50)) / 25;
  }

  // امتیاز پایین
  if (ball.y < 0) {
    players[game.playerBottom].score++;
    resetBall(-1);
  }

  // امتیاز بالا
  if (ball.y > 600) {
    players[game.playerTop].score++;
    resetBall(1);
  }

  io.emit('gameState', {
    ball,
    top: players[game.playerTop]
      ? {
          name: players[game.playerTop].name,
          paddleX: players[game.playerTop].paddleX,
          score: players[game.playerTop].score
        }
      : null,
    bottom: players[game.playerBottom]
      ? {
          name: players[game.playerBottom].name,
          paddleX: players[game.playerBottom].paddleX,
          score: players[game.playerBottom].score
        }
      : null
  });
}

io.on('connection', socket => {
  socket.on('join', ({ name }) => {
    if (usernames.has(name)) {
      socket.emit('joinError', 'این نام قبلاً استفاده شده است');
      return;
    }

    usernames.add(name);

    players[socket.id] = createPlayer(socket.id, name);

    queue.push(socket.id);

    broadcastPlayers();
    assignPlayers();
  });

  socket.on('movePaddle', x => {
    if (!players[socket.id]) return;

    players[socket.id].paddleX = Math.max(0, Math.min(300, x));
  });

  socket.on('disconnect', () => {
    if (!players[socket.id]) return;

    usernames.delete(players[socket.id].name);

    queue = queue.filter(id => id !== socket.id);

    if (game.playerTop === socket.id) game.playerTop = null;
    if (game.playerBottom === socket.id) game.playerBottom = null;

    delete players[socket.id];

    broadcastPlayers();
    assignPlayers();
  });
});

server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});

