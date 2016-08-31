//var app = require('express')();
var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http); //app

//var sockets
var players = {}; // keeps track of everyone playing the game
var sockets = new Array();
var numPlayers = 0;
var playing = false;
var round = 0;

var words = new Array();/*= ["sun", "moon", "star", "sky", "cloud", "storm", "comet", "planet"];*/
var wordsTwo = new Array(); /*= ["boy", "store", "swimming", "computer", "cloud", "storm", "comet", "planet"];*/
var results = new String();
var stream = fs.createWriteStream("my_file.txt");
stream.write(timeStamp() + " Experiment Starting!\n")
var buf = new Buffer(1024);
// read in the words
console.log("Going to open file");
fs.open('arguments.txt', 'r+', function(err, fd) {
   if (err) {
       return console.error(err);
   }
   console.log("File opened successfully!");
   console.log("Going to read the file");
   fs.read(fd, buf, 0, buf.length, 0, function(err, bytes){
      if (err){
         console.log(err);
      }

      // Print only read bytes to avoid junk.
      if(bytes > 0){
        var str = buf.slice(0, bytes).toString();
        //console.log(str)
        var allWords = new Array();
        allWords = str.split("\n");
        console.log(allWords.length)
        //wordsTwo = allWords.slice(9, 17); 
      }
      for (i = 0; i < allWords.length; i++) {
        if (i < 8) {
          words.push(allWords[i]);
        } else {
          console.log("here")
          wordsTwo.push(allWords[i]);
        }
      }
      console.log(words)
      // Close the opened file.
      fs.close(fd, function(err){
         if (err){
            console.log(err);
         } 
         console.log("File closed successfully.");
      });
   });
});


app.get('/', function(req, res){
	res.sendfile('PictionarySite.html');
});

app.use(express.static('public'));

// Give players time to log in. When timer stops, the game begins.
setTimeout(startGame, 20000);

// controls what to do when players connect and disconnect
io.on('connection', function(socket){
  stream.write(timeStamp() + " " + socket.id + " connected\n")
  numPlayers = numPlayers + 1;
	console.log('a user connected');
  console.log("" + socket.id)
  sockets.push(socket.id);
	
 	// handle when player disconnects
  	socket.on('disconnect', function(){
  		//delete players.get(socket);
    	console.log('user disconnected');
      stream.write(timeStamp() + " " + socket.id + " disconnected\n");
      endGame();
    });

    // handle when someone clicks
    socket.on("sentclick", function (coordinates) {
      if (!playing || !players[socket.id].playing) { 
        return; 
      }
      var player = players[socket.id];
      //var player = players.get(socket)
      //console.log(socket.id + "   " + players[socket].myID + "  " + players[socket].status + "  " + players[socket].type);
      if (player.type === 'drawer') {
    	  //io.sockets.emit('drawclick', coordinates);
        socket.emit('drawclick', coordinates);
        socket.broadcast.to(players[socket.id].partner).emit('drawclick', coordinates);
        //stream.write(timeStamp() + " " + socket.id + " (" + coordinates.xPos + "," + coordinates.yPos + ")\n");
      }
    });

    // handle when a line is drawn
    socket.on("sentline", function (coordinates) {
      if (!playing || !players[socket.id].playing) {
        return;
      }
      var player = players[socket.id];
      //var player = players.get(socket)
      if (player.type === 'drawer') {
        //io.sockets.emit('drawline', coordinates);
        socket.emit('drawline', coordinates);
        socket.broadcast.to(players[socket.id].partner).emit('drawline', coordinates);
        //stream.write(timeStamp() + " " + socket.id + " (" + coordinates.xFin + "," + coordinates.yFin + ")\n");
      }
    });

    socket.on("roundover", function() {
      players[socket.id].playing = false;
    });

    // handle when a player guesses
    socket.on('sentguess', function(guess) {
      guess = guess.toLowerCase();
      if (players[socket.id].type === "drawer" || !playing || !players[socket.id].playing) {
        return;
      }
      stream.write(timeStamp() + "  " + socket.id + " guesses " + guess + "\n");
      var answer = "";
      if (guess === words[round] && players[socket.id].group === 1) {
        answer = "correct"
        socket.emit('guesser_guessreceived', answer);
        socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
        players[socket.id].playing = false;
        players[players[socket.id].partner].playing = false;
      } 
      else if (guess === wordsTwo[round] && players[socket.id].group === 2) {
        answer = "correct"
        socket.emit('guesser_guessreceived', answer);
        socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
        players[socket.id].playing = false;
        players[players[socket.id.partner]].playing = false;
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


function timeStamp() {
  var now = new Date();
  var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
  var time = [now.getHours(), now.getMinutes(), now.getSeconds()];
  // If seconds and minutes are less than 10, adda zero
  for (var i = 1; i < 3; i++) {
    if (time[i] < 10) {
      time[i] = "0" + time[i];
    }
  }
  return date.join("/") + " " + time.join(":");
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}
/* This section handles the Pictionary gameplay logic.*/

function startGame() {
  // Set up the initial game play. Pair people together.
  console.log("Game is starting!");
  if (numPlayers % 2 != 0) {
    console.log("Shutting down. Can't play with an odd number of players!!!");
    process.exit();
  }
  sockets = shuffleArray(sockets);
  for (i = 0; i < sockets.length; i++) {
    var groupNum = 1;
    if (i >= sockets.length / 2 && sockets.length > 2) {
      groupNum = 2;
    }
    if (i % 2 === 0) {
      stream.write("drawer: " + sockets[i] + "   guesser: " + sockets[i+1] + "\n");
      console.log("drawer" + "  " + sockets[i].id);
      players[sockets[i]] = {type: "drawer", partner: sockets[i + 1], group: groupNum, playing: true};
    } else {
      console.log("guesser" + "  " + sockets[i].id);
      players[sockets[i]] = {type: "guesser", partner: sockets[i - 1], group: groupNum, playing: true};

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
  stream.write("\n" + timeStamp() + " Round 1 Starting\nGroup 1 word = " + words[0] + "\nGroup 2 word = " + wordsTwo[0] + "\n");
  playing = true;
  var time = setInterval(swapPartners, 25000)

  function swapPartners() {
    playing = false;
    io.sockets.emit('clearcanvas');
    console.log("Swapping players ");
    for (i = 0; i < sockets.length; i++) {
      players[sockets[i]].playing = true;
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
    if (round === 8) {
      clearInterval(time);
      endGame();
    }
    var newRound = round + 1;
    stream.write("\n" + timeStamp() + " Round " + newRound + " Starting\nGroup 1 word = " + words[round] + "\nGroup 2 word = " + wordsTwo[round] + "\n");
    playing = true;
    io.sockets.emit('starttimer');
  }
}


function endGame() {
  playing = false;
  stream.write(timeStamp() + " Experiment ending!");
  process.exit();
}
