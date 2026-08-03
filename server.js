const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.get("/", (req, res) => {
    res.send("SERVER OK - Snake Game");
});
const server = http.createServer(app);

const io = new Server(server);


// فایل‌های پوشه public را نمایش بده
app.use(express.static("public"));
app.get("/", (req, res) => {
    res.send("Snake server is working!");
});

// لیست بازیکنان
let players = {};



// وقتی بازیکن وصل شد
io.on("connection", (socket) => {

    console.log("یک بازیکن وصل شد:", socket.id);



    // ورود بازیکن
    socket.on("joinGame", (data) => {

        players[socket.id] = data.name;


        console.log(
            "بازیکن وارد شد:",
            data.name
        );


        // ارسال لیست بازیکنان به همه
        io.emit(
            "playersList",
            Object.values(players)
        );

    });



    // دریافت پیام چت
    socket.on("chatMessage", (message) => {


        const name = players[socket.id];


        io.emit("chatMessage", {

            name: name,

            message: message

        });


    });



    // وقتی بازیکن خارج شد
    socket.on("disconnect", () => {


        console.log(
            "بازیکن خارج شد:",
            players[socket.id]
        );


        delete players[socket.id];


        // بروزرسانی لیست
        io.emit(
            "playersList",
            Object.values(players)
        );


    });



});



// پورت مناسب برای Render
const PORT = process.env.PORT || 3000;


server.listen(PORT, () => {

    console.log(
        "سرور بازی روی پورت " + PORT + " اجرا شد"
    );

});