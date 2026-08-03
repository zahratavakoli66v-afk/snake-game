const express = require("express");
const http = require("http");

const app = express();

const server = http.createServer(app);


// تست اصلی
app.get("/", (req, res) => {
    res.send("Snake Game Server OK");
});


// نمایش فایل‌های public
app.use(express.static("public"));


const PORT = process.env.PORT || 3000;


server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});