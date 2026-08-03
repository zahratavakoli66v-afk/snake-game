const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(express.static("public"));

let players = {};

io.on("connection", (socket) => {

    console.log("بازیکن وصل شد:", socket.id);

    socket.on("joinGame", (data) => {

        players[socket.id] = data.name;

        io.emit(
            "playersList",
            Object.values(players)
        );

    });


    socket.on("chatMessage", (message) => {

        io.emit("chatMessage", {
            name: players[socket.id],
            message: message
        });

    });


    socket.on("disconnect", () => {

        delete players[socket.id];

        io.emit(
            "playersList",
            Object.values(players)
        );

    });

});


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(
        "Server running on port " + PORT
    );

});