const express = require("express");
const http = require("http");
const { Server } = require("socket.io");


const app = express();

const server = http.createServer(app);

const io = new Server(server);



app.use(express.static("public"));



// =====================
// تنظیمات بازی
// =====================

const PORT = process.env.PORT || 10000;

const WIDTH = 400;

const HEIGHT = 400;

const STEP = 10;

const GAME_TIME = 180;



// =====================
// اطلاعات بازی
// =====================

let players = {};

let host = null;

let gameRunning = false;

let gameTimer = GAME_TIME;

let timer = null;


let food = {
    x:200,
    y:200
};





// =====================
// ساخت بازیکن
// =====================

function createPlayer(id,name){

    return {

        id:id,

        name:name,

        x:100,

        y:100,

        snake:[
            {x:100,y:100},
            {x:90,y:100},
            {x:80,y:100}
        ],


        direction:"right",

        nextDirection:"right",


        score:0,


        alive:true,


        spectator:false

    };

}




// =====================
// غذای جدید
// =====================

function newFood(){

    food={

        x:Math.floor(Math.random()*39)*STEP,

        y:Math.floor(Math.random()*39)*STEP

    };

}






// =====================
// اتصال کاربر
// =====================

io.on("connection",(socket)=>{


console.log(
"player connected:",
socket.id
);




socket.on("joinGame",(data)=>{


let name =
data.name || "player";



players[socket.id] =
createPlayer(
socket.id,
name
);




if(!host){

    host=socket.id;

}



socket.emit(
"host",
socket.id===host
);



io.emit(
"players",
Object.values(players)
);



});





socket.on("startGame",()=>{


if(socket.id!==host){

return;

}


if(gameRunning){

return;

}



startGame();



});





socket.on("direction",(dir)=>{


let p=players[socket.id];


if(!p){

return;

}


if(!p.alive){

return;

}



p.nextDirection=dir;



});





socket.on("leave",()=>{


removePlayer(socket.id);



});





socket.on("disconnect",()=>{


removePlayer(socket.id);



});



});

// =====================
// شروع بازی
// =====================

function startGame(){


gameRunning=true;

gameTimer=GAME_TIME;


Object.values(players)
.forEach(p=>{


p.alive=true;

p.spectator=false;

p.score=0;


});



newFood();



io.emit(
"started",
{
time:gameTimer
}
);



if(timer){

clearInterval(timer);

}



timer=setInterval(()=>{


gameTimer--;



io.emit(
"time",
gameTimer
);



if(gameTimer<=0){

endGame();

}



},1000);



}






// =====================
// حرکت بازی
// =====================

setInterval(()=>{


if(!gameRunning){

return;

}



Object.values(players)
.forEach(player=>{


if(!player.alive){

return;

}



move(player);



check(player);



});



io.emit(
"state",
{

players:Object.values(players),

food:food

}
);



},150);







// =====================
// حرکت مار
// =====================

function move(player){


player.direction =
player.nextDirection;



let head={

x:player.snake[0].x,

y:player.snake[0].y

};




if(player.direction==="up"){

head.y-=STEP;

}


if(player.direction==="down"){

head.y+=STEP;

}


if(player.direction==="left"){

head.x-=STEP;

}


if(player.direction==="right"){

head.x+=STEP;

}





// برخورد با دیوار


if(

head.x<0 ||

head.y<0 ||

head.x>=WIDTH ||

head.y>=HEIGHT

){


die(player);

return;


}




player.snake.unshift(head);



if(
head.x===food.x &&
head.y===food.y
){


player.score++;


newFood();


}
else{


player.snake.pop();


}



}







// =====================
// برخورد
// =====================

function check(player){


let head=player.snake[0];



for(
let i=1;
i<player.snake.length;
i++
){


if(

head.x===player.snake[i].x &&

head.y===player.snake[i].y

){


die(player);


}


}



}






// =====================
// سوختن بازیکن
// =====================

function die(player){


player.alive=false;


player.spectator=true;



io.emit(
"dead",
{
name:player.name
}
);



}







// =====================
// حذف بازیکن
// =====================

function removePlayer(id){


delete players[id];



if(id===host){


let ids=
Object.keys(players);



if(ids.length){


host=ids[0];


io.to(host)
.emit(
"host",
true
);



}
else{


host=null;


}



}



io.emit(
"players",
Object.values(players)
);



}







// =====================
// پایان بازی
// =====================

function endGame(){


gameRunning=false;


if(timer){

clearInterval(timer);

}



let winner=null;



Object.values(players)
.forEach(p=>{


if(

!winner ||

p.score>winner.score

){

winner=p;

}


});




io.emit(
"finished",
{


winner:
winner ? winner.name : "none",


score:
winner ? winner.score : 0


}
);



}







// =====================
// اجرای سرور
// =====================

server.listen(
PORT,
()=>{


console.log(
"Server running on port",
PORT
);



});