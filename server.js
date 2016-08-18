//var app = require('express')();
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http); //app

//var sockets
var players = {}; // keeps track of everyone playing the game
var sockets = new Array();
var numPlayers = 0;
var playing = false;
var round = 0;

var words = ["sun", "moon", "star", "sky"];
var wordsTwo = ["boy", "store", "swimming", "computer"];

app.get('/', function(req, res){
	res.sendfile('PictionarySite.html');
});

app.use(express.static('public'));

// Give players time to log in. When timer stops, the game begins.
setTimeout(startGame, 20000);

// controls what to do when players connect and disconnect
io.on('connection', function(socket){
  numPlayers = numPlayers + 1;
	console.log('a user connected');
  console.log("" + socket.id)
  sockets.push(socket.id);
	
 	// handle when player disconnects
  	socket.on('disconnect', function(){
  		//delete players.get(socket);
    	console.log('user disconnected');
    });

    // handle when someone clicks
    socket.on("sentclick", function (coordinates) {
      if (!playing) { 
        return; 
      }
      var player = players[socket.id];
      //var player = players.get(socket)
      //console.log(socket.id + "   " + players[socket].myID + "  " + players[socket].status + "  " + players[socket].type);
      if (player.type === 'drawer') {
    	  //io.sockets.emit('drawclick', coordinates);
        socket.emit('drawclick', coordinates);
        socket.broadcast.to(players[socket.id].partner).emit('drawclick', coordinates);
      }
    });

    // handle when a line is drawn
    socket.on("sentline", function (coordinates) {
      if (!playing) {
        return;
      }
      var player = players[socket.id];
      //var player = players.get(socket)
      if (player.type === 'drawer') {
        //io.sockets.emit('drawline', coordinates);
        socket.emit('drawline', coordinates);
        socket.broadcast.to(players[socket.id].partner).emit('drawline', coordinates);
      }
    });

    // handle when a player guesses
    socket.on('sentguess', function(guess) {
      if (players[socket.id].type === "drawer") {
        return;
      }
      var answer = "";
      if ((guess === words[round] && players[socket.id].group === 1) || (guess === wordsTwo[round] && players[socket.id].group === 2)){
        answer = "correct"
        socket.emit('guesser_guessreceived', answer);
        socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
      } else {
        answer = "incorrect"
        socket.emit('guesser_guessreceived', answer);
        socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
      }
    });

});


http.listen(3000, function(){ //app
	console.log('listening on *:3000');
});

process.on( 'SIGINT', function() {
	console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    id = 1;
    process.exit( );
});


function readFile() {
  file = "arguments.txts";
  var reader = new FileReader();
  reader.readAsText(file);
}
/* This section handles the Pictionary gameplay logic.*/

function startGame() {
  // Set up the initial game play. Pair people together.
  console.log("Game is starting!");
  if (numPlayers % 2 != 0) {
    console.log("Shutting down. Can't play with an odd number of players!!!");
    process.exit();
  }
  for (i = 0; i < sockets.length; i++) {
    var groupNum = 1;
    if (i >= sockets.length / 2 && sockets.length > 2) {
      groupNum = 2;
    }
    if (i % 2 === 0) {
      console.log("drawer" + "  " + sockets[i].id);
      players[sockets[i]] = {type: "drawer", partner: sockets[i + 1], group: groupNum};
    } else {
      console.log("guesser" + "  " + sockets[i].id);
      players[sockets[i]] = {type: "guesser", partner: sockets[i - 1], group: groupNum};

    }
  }
  word = words[0];
  wordTwo = wordsTwo[0];
  console.log(word + "  " + wordTwo)
  io.sockets.emit('setroles', players, word, wordTwo);
  io.sockets.emit('starttimer');

  for (i = 0; i < sockets.length; i++) {
    console.log(players[sockets[i]])
  }
  playing = true;
  var time = setInterval(swapPartners, 25000)

  function swapPartners() {
    playing = false;
    io.sockets.emit('clearcanvas');
    console.log("Swapping players ");
    for (i = 0; i < sockets.length; i++) {
      if (players[sockets[i]].type === "guesser") {
        players[sockets[i]].type = "drawer";
      } else {
        players[sockets[i]].type = "guesser";
      }
    }
    round = round + 1;
    word = words[round];
    wordTwo = wordsTwo[round];
    console.log(word + "  " + wordTwo)
    io.sockets.emit('setroles', players, word, wordTwo);
    if (round === 4) {
      clearInterval(time);
      endGame();
    }
    playing = true;
    io.sockets.emit('starttimer');
  }
}


function endGame() {
  playing = false;
  process.exit();
}
