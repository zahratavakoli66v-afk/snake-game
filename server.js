const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});


app.use(express.static("public"));


// =======================
// تنظیمات بازی
// =======================

const GAME_TIME = 180; // سه دقیقه

const BOARD_SIZE = 400;

const SPEED = 300;


// =======================
// وضعیت کلی بازی
// =======================

let gameStarted = false;

let gameFinished = false;

let hostId = null;

let timer = GAME_TIME;

let timerInterval = null;


let players = {};

let food = {
  x: 200,
  y: 200
};



// =======================
// ساخت بازیکن جدید
// =======================

function createPlayer(id, name){

  return {

    id:id,

    name:name,

    x:50 + Math.floor(Math.random()*300),

    y:50 + Math.floor(Math.random()*300),


    direction:"right",


    nextDirection:"right",


    snake:[

      {x:50,y:50},

      {x:40,y:50},

      {x:30,y:50}

    ],


    score:0,


    alive:true,


    spectator:false

  };

}



// =======================
// تولید غذا
// =======================

function createFood(){

  food = {

    x:Math.floor(Math.random()*38)*10,

    y:Math.floor(Math.random()*38)*10

  };

}
// =======================
// اتصال بازیکنان
// =======================

io.on("connection", (socket)=>{


  console.log(
    "بازیکن وصل شد:",
    socket.id
  );



  // ورود بازیکن

  socket.on("joinGame",(data)=>{


    const name =
    data.name || "بازیکن";


    // اولین نفر میزبان می‌شود

    if(hostId === null){

      hostId = socket.id;

    }



    players[socket.id] =
    createPlayer(
      socket.id,
      name
    );



    io.emit(
      "players",
      getPlayersInfo()
    );



    socket.emit(
      "hostStatus",
      socket.id === hostId
    );



  });





  // شروع بازی توسط میزبان

  socket.on("startGame",()=>{


    if(socket.id !== hostId){

      return;

    }



    if(gameStarted){

      return;

    }



    gameStarted = true;

    gameFinished = false;

    timer = GAME_TIME;



    startTimer();



    io.emit(
      "gameStarted",
      {
        time:timer
      }
    );



  });





  // تغییر جهت مار

  socket.on(
    "changeDirection",
    (direction)=>{


      const player =
      players[socket.id];


      if(!player){

        return;

      }



      if(!player.alive){

        return;

      }



      player.nextDirection =
      direction;



  });





  // خروج بازیکن

  socket.on("leaveGame",()=>{


    removePlayer(socket.id);


  });





  // قطع اتصال

  socket.on("disconnect",()=>{


    removePlayer(socket.id);


  });



});





// =======================
// اطلاعات قابل ارسال
// =======================


function getPlayersInfo(){


  return Object.values(players)
  .map(player=>{


    return {

      id:player.id,

      name:player.name,

      score:player.score,

      alive:player.alive,

      spectator:player.spectator

    };


  });


}





// =======================
// شروع تایمر
// =======================

function startTimer(){


  if(timerInterval){

    clearInterval(timerInterval);

  }



  timerInterval =
  setInterval(()=>{


    if(!gameStarted){

      return;

    }



    timer--;



    io.emit(
      "timer",
      timer
    );



    if(timer <= 0){


      endGame();


    }



  },1000);



}
// =======================
// حلقه بازی
// =======================

setInterval(()=>{


  if(!gameStarted || gameFinished){

    return;

  }



  Object.values(players)
  .forEach(player=>{


    if(!player.alive){

      return;

    }



    movePlayer(player);



    checkFood(player);



    checkCollision(player);



  });



  io.emit(
    "gameState",
    {

      players:Object.values(players),

      food:food,

      time:timer

    }
  );



}, SPEED);







// =======================
// حرکت بازیکن
// =======================

function movePlayer(player){


  player.direction =
  player.nextDirection;



  let head =
  {
    x:player.snake[0].x,
    y:player.snake[0].y
  };



  if(player.direction==="up"){

    head.y -= 10;

  }


  if(player.direction==="down"){

    head.y += 10;

  }


  if(player.direction==="left"){

    head.x -= 10;

  }


  if(player.direction==="right"){

    head.x += 10;

  }





  // برخورد با دیوار

  if(
    head.x < 0 ||
    head.y < 0 ||
    head.x >= BOARD_SIZE ||
    head.y >= BOARD_SIZE
  ){

    playerDie(player);

    return;

  }



  player.snake.unshift(head);



  player.snake.pop();



}







// =======================
// خوردن غذا
// =======================

function checkFood(player){


  let head =
  player.snake[0];



  if(
    head.x === food.x &&
    head.y === food.y
  ){


    player.score++;



    let last =
    player.snake[player.snake.length-1];


    player.snake.push(last);



    createFood();


  }



}







// =======================
// برخورد
// =======================

function checkCollision(player){


  let head =
  player.snake[0];



  for(let i=1;i<player.snake.length;i++){


    if(
      head.x === player.snake[i].x &&
      head.y === player.snake[i].y
    ){

      playerDie(player);

      return;

    }


  }



}







// =======================
// سوختن بازیکن
// =======================

function playerDie(player){


  player.alive=false;

  player.spectator=true;



  io.emit(
    "playerDead",
    {
      name:player.name
    }
  );



  // اگر میزبان سوخت
  // بازی ادامه پیدا می‌کند

}







// =======================
// حذف بازیکن
// =======================

function removePlayer(id){


  delete players[id];



  // اگر میزبان خارج شد
  // میزبان جدید انتخاب شود

  if(id===hostId){


    const ids =
    Object.keys(players);



    if(ids.length>0){

      hostId=ids[0];


      io.to(hostId)
      .emit(
        "hostStatus",
        true
      );

    }
    else{

      hostId=null;

    }


  }



  io.emit(
    "players",
    getPlayersInfo()
  );



}







// =======================
// پایان بازی
// =======================

function endGame(){


  gameFinished=true;

  gameStarted=false;



  if(timerInterval){

    clearInterval(timerInterval);

  }



  let winner=null;


  Object.values(players)
  .forEach(player=>{


    if(
      !winner ||
      player.score > winner.score
    ){

      winner=player;

    }


  });



  io.emit(
    "gameFinished",
    {

      winner:winner ? winner.name : "بدون برنده",

      score:winner ? winner.score : 0

    }
  );


}







// =======================
// اجرای سرور
// =======================

const PORT =
process.env.PORT || 10000;



server.listen(
  PORT,
  ()=>{

    console.log(
      "سرور بازی روی پورت",
      PORT,
      "اجرا شد"
    );

  }
);