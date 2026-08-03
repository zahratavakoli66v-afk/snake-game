
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// نمایش فایل‌های پوشه public
app.use(express.static('public'));

let players = {};
let hostId = null;
let gameStarted = false;

// اتصال بازیکنان
io.on('connection', (socket) => {

    console.log('بازیکن وصل شد:', socket.id);

    // ورود به بازی
    socket.on('joinGame', (data) => {

        players[socket.id] = data.name;

        // اولین بازیکن میزبان می‌شود
        if (!hostId) {
            hostId = socket.id;
        }

        io.emit('playersList', Object.values(players));

        io.emit('hostInfo', {
            hostId: hostId,
            gameStarted: gameStarted
        });

    });

    // شروع بازی
    socket.on('startGame', () => {

        if (socket.id !== hostId) return;

        gameStarted = true;

        io.emit('gameStarted');

        io.emit('hostInfo', {
            hostId: hostId,
            gameStarted: gameStarted
        });

    });

    // پیام چت
    socket.on('chatMessage', (message) => {

        io.emit('chatMessage', {
            name: players[socket.id],
            message: message
        });

    });

    // خروج بازیکن
    socket.on('disconnect', () => {

        console.log('بازیکن خارج شد:', players[socket.id]);

        delete players[socket.id];

        // اگر میزبان خارج شد
        if (socket.id === hostId) {

            const ids = Object.keys(players);

            if (ids.length > 0) {
                hostId = ids[0];
            } else {
                hostId = null;
                gameStarted = false;
            }

        }

        io.emit('playersList', Object.values(players));

        io.emit('hostInfo', {
            hostId: hostId,
            gameStarted: gameStarted
        });

    });

});

// اجرای سرور
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('سرور بازی روی پورت ' + PORT + ' اجرا شد');
});

