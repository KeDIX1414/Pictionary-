//var app = require('express')();
var express = require('express');
var fs = require('fs');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http); //http

//var sockets
var players = {}; // keeps track of everyone playing the game
var sockets = new Array();

var numPlayers = 1;
var numReadyPlayers = 0;
var gameStarted = false;
var playing = false;
var partOne = true;
var round = 0;
var playersEnded = 0;

var words = new Array();
var wordsTwo = new Array(); 
var results = new String();
var stream = fs.createWriteStream("results.txt");
stream.write(timeStamp() + " Experiment Starting!\n")
var buf = new Buffer(2000);

io.sockets.emit('endgame');

fs.readFile('Round1StrucOrder1.txt', function(err, data) {
	if (err) {
		console.log(err);
	} else {
		var allWords = data.toString().split("\n");
		for (var i = 0; i < allWords.length - 1; i++) {
            var options = allWords[i].split("/");
            words.push(options);
		}
	}
});


fs.readFile('Round1UnstrucOrder1.txt', function(err, data) {
	if (err) {
		console.log(err);
	} else {
		var allWords = data.toString().split("\n");
		for (var i = 0; i < allWords.length - 1; i++) {
            var options = allWords[i].split("/");
            wordsTwo.push(options);
		}
	}
});


fs.readFile('Round2Order1.txt', function(err, data) {
	if (err) {
		console.log(err);
	} else {
		var allWords = data.toString().split("\n");
		for (var i = 0; i < allWords.length - 1; i++) {
            var options = allWords[i].split("/");
            words.push(options);
            wordsTwo.push(options);
		}
	}
	console.log(words);
	console.log(wordsTwo);
});





app.get('/', function(req, res){
	res.sendFile(__dirname + '/PictionarySite.html');
});

app.use("/public", express.static(__dirname + "/public"));


// controls what to do when players connect and disconnect
io.on('connection', function(socket){
  stream.write(timeStamp() + " " + socket.id + " connected\n")
  //numPlayers = numPlayers + 1;
	console.log('a user connected');
  console.log("" + socket.id)
  sockets.push(socket.id);
  players[socket.id] = {type: null, partner: null, group: null, playing: false, ready: false, num: numPlayers, id:socket.id};
  numPlayers++;
	
 	// handle when player disconnects
  	socket.on('disconnect', function() {
    	console.log('user disconnected');
      playersEnded = 2;
      stream.write(timeStamp() + " " + players[socket.id].num + " disconnected\n");
      io.sockets.emit('endgame');
      setTimeout(endGame, 5000)
    });

    socket.on('readytoend', function() {
      playersEnded++;
      if (playersEnded === 8) {
        endGame();
      }
    });

    socket.on("readytoplay", function() {
      if (players[socket.id].ready) {
        return;
      } else {
        players[socket.id].ready = true;
        numReadyPlayers++;
        console.log("This many people are ready to play:   " + numReadyPlayers)
      }
      if (numReadyPlayers === 2) {
          gameStarted = true;
          setTimeout(startGame, 5000)
        }

    })
    // handle when someone clicks
    socket.on("sentclick", function (coordinates) {
      if (!playing || !players[socket.id].playing) { 
        return; 
      }
      var player = players[socket.id];
      if (player.type === 'drawer') {
        socket.emit('drawclick', coordinates);
        socket.broadcast.to(players[socket.id].partner).emit('drawclick', coordinates);
      }
    });

    socket.on("recordposition", function (currentX, currentY) {
      if (!playing || !players[socket.id].playing || players[socket.id].type != 'drawer') {
        return;
      }
      stream.write(players[socket.id].num + " " + " (" + currentX + "," + currentY + ")\n")
    });

    // handle when a line is drawn
    socket.on("sentline", function (coordinates) {
      if (!playing || !players[socket.id].playing) {
        return;
      }
      var player = players[socket.id];
      if (player.type === 'drawer') {
        socket.emit('drawline', coordinates);
        socket.broadcast.to(players[socket.id].partner).emit('drawline', coordinates);
      }
    });

    socket.on("roundover", function() {
      players[socket.id].playing = false;
    });

    // handle when a player guesses
    socket.on('sentguess', function(guess) {
      guess = guess.toLowerCase();
      console.log("a" + guess + "a")
      if (players[socket.id].type === "drawer" || !playing || !players[socket.id].playing || guess == "") {
        return;
      }
      stream.write(timeStamp() + "  " + players[socket.id].num + " guesses " + guess + "\n");
      console.log(players[socket.id].num + " guesses " + guess + " when answer is " + words[round] + "\n")
      var answer = "";
      for (i = 0; i < words.length; i++) {
        if (guess === words[round][i].replace(/\s/g, "") && players[socket.id].group === 1) {
          answer = "correct";
          socket.emit('guesser_guessreceived', answer);
          socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
          players[socket.id].playing = false;
          players[players[socket.id].partner].playing = false;
          return;
        } 
        else if (guess === wordsTwo[round][i].replace(/\s/g, "") && players[socket.id].group === 2) {
          answer = "correct"
          socket.emit('guesser_guessreceived', answer);
          socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
          players[socket.id].playing = false;
          players[players[socket.id].partner].playing = false;
          return;
        }
      }
      answer = "incorrect"
      socket.emit('guesser_guessreceived', answer);
      socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
    });

});


http.listen(3000, function(){ 
	console.log('listening on *:3000');
});

process.on( 'SIGINT', function() {
	console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    id = 1;
    io.sockets.emit('endgame');
    setTimeout(process.exit, 5000)
    //process.exit();
});

function timeStamp() {
  var now = new Date();
  var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
  var time = [now.getHours(), now.getMinutes(), now.getSeconds()];
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
  console.log("Game is starting!");
  if (sockets.length % 2 != 0) {
    console.log(sockets.length);
    console.log("Shutting down. Can't play with an odd number of players!!!");
    process.exit();
  }
  sockets = shuffleArray(sockets, 0, sockets.length - 1);
  for (i = 0; i < sockets.length; i++) {
    var groupNum = 1;
    if (i >= sockets.length / 2 && sockets.length > 2) {
      groupNum = 2;
    }
    if (i % 2 === 0) {
      stream.write("drawer: " + players[sockets[i]].num + "   guesser: " + players[sockets[i+1]].num + "\n");
      console.log("drawer" + "  " + sockets[i].id);
      players[sockets[i]].type = "drawer";
      players[sockets[i]].partner = sockets[i+1];
      players[sockets[i]].group = groupNum;
      players[sockets[i]].playing = true;
    } else {
      console.log("guesser" + "  " + sockets[i].id);
      players[sockets[i]].type = "guesser";
      players[sockets[i]].partner = sockets[i-1];
      players[sockets[i]].group = groupNum;
      players[sockets[i]].playing = true;

    }
  }
  var word;
  var wordTwo;
  if (partOne) {
    word = words[0][0];
    wordTwo = wordsTwo[0][0];
  } else {
    console.log("We are on round " + round);
    word = words[round][0];
    wordTwo = wordsTwo[round][0];
  }
  console.log(word + "  " + wordTwo);
  io.sockets.emit('setroles', players, word, wordTwo);
  for (i = 0; i < sockets.length; i++) {
    //console.log(players[sockets[i]])
  }
  if (partOne) {
    stream.write("\n" + timeStamp() + " Round 1 Starting\nGroup 1 word = " + words[0] + "\nGroup 2 word = " + wordsTwo[0] + "\n");
  }
  playing = true;
  var time = setInterval(swapPartners, 65000);
  var countdown = 59;
  var interval = setInterval(function() {
    io.sockets.emit('starttimer', countdown, words[0][0], wordsTwo[0][0], players);
      if (countdown === -1) {
        clearInterval(interval);
        clearInterval(results);
        countdown = 59;
      }
      countdown = countdown - 1;
  }, 1000);
  var results = new setInterval(function() {
    io.sockets.emit('giveposition');
  }, 150);
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
    word = words[round][0];
    wordTwo = wordsTwo[round][0];
    console.log(word + "  " + wordTwo)
    io.sockets.emit('setroles', players, word, wordTwo);
    // CHANGE THIS CODE AFTER DONE TESTING
    if (round === 37) {
      clearInterval(time);
      io.sockets.emit('endgame');
      //return;
      setTimeout(endGame, 5000)
    }
    // CHANGE THIS CODE AFTER DONE TESTING
    var newRound = round + 1;
    stream.write("\n" + timeStamp() + " Round " + newRound + " Starting\nGroup 1 word = " + words[round] + "\nGroup 2 word = " + wordsTwo[round] + "\n");
    playing = true;
    var countdown = 59
    var interval = setInterval(function() {
      io.sockets.emit('starttimer', countdown, words[round][0], wordsTwo[round][0], players);
      if (countdown === -1) {
        clearInterval(results);
        clearInterval(interval);
        countdown = 59;
      }
      countdown = countdown - 1;
    }, 1000)
    var results = new setInterval(function() {
      io.sockets.emit('giveposition');
    }, 150);
    //io.sockets.emit('starttimer');

    // CHANGED CODE!!!!!!
    if (round === 20) {
      partOne = false;
      io.sockets.emit('parttwo');
      clearInterval(time);
      clearInterval(results);
      clearInterval(interval);
      setTimeout(changePartners, 35000);
      return;
    }
  }
}

function changePartners() {
  var onePartner = false;
  var twoPartner = false;
  partOne = shuffleArray(sockets.slice(0, 4))
  partTwo =shuffleArray(sockets.slice(4, 8))
  sockets = partOne.concat(partTwo)
  console.log(sockets)
  console.log (players[sockets[0]].partner +  "  " + sockets[1])
  console.log (players[sockets[0]].partner === sockets[1])
  if (players[sockets[0]].partner === sockets[1]) {
    console.log("here")
    onePartner = true;
  }
  if (players[sockets[4]].partner === sockets[5]) {
    twoPartner = true;
  }
  if (!onePartner && !twoPartner) {
    console.log(1)
    players[sockets[0]].partner = sockets[1];
    players[sockets[0]].type = "drawer"
    players[sockets[1]].partner = sockets[0];
    players[sockets[1]].type = "guesser"
    players[sockets[2]].partner = sockets[6];
    players[sockets[2]].type = "guesser"
    players[sockets[3]].partner = sockets[7];
    players[sockets[3]].type = "drawer"
    players[sockets[4]].partner = sockets[5];
    players[sockets[4]].type = "drawer"
    players[sockets[5]].partner = sockets[4];
    players[sockets[5]].type = "guesser"
    players[sockets[6]].partner = sockets[2];
    players[sockets[6]].type = "drawer"
    players[sockets[7]].partner = sockets[3];
    players[sockets[7]].type = "guesser"
  }
  if (!onePartner && twoPartner) {
    console.log(2)
    players[sockets[0]].partner = sockets[1];
    players[sockets[0]].type = "drawer"
    players[sockets[1]].partner = sockets[0];
    players[sockets[1]].type = "guesser"
    players[sockets[2]].partner = sockets[5];
    players[sockets[2]].type = "guesser"
    players[sockets[3]].partner = sockets[7];
    players[sockets[3]].type = "drawer"
    players[sockets[4]].partner = sockets[6];
    players[sockets[4]].type = "drawer"
    players[sockets[5]].partner = sockets[2];
    players[sockets[5]].type = "drawer"
    players[sockets[6]].partner = sockets[4];
    players[sockets[6]].type = "guesser"
    players[sockets[7]].partner = sockets[3];
    players[sockets[7]].type = "guesser"
  }
  if (onePartner && !twoPartner) {
    console.log(3)
    players[sockets[0]].partner = sockets[2];
    players[sockets[0]].type = "drawer"
    players[sockets[1]].partner = sockets[6];
    players[sockets[1]].type = "guesser"
    players[sockets[2]].partner = sockets[0];
    players[sockets[2]].type = "guesser"
    players[sockets[3]].partner = sockets[7];
    players[sockets[3]].type = "drawer"
    players[sockets[4]].partner = sockets[5];
    players[sockets[4]].type = "drawer"
    players[sockets[5]].partner = sockets[4];
    players[sockets[5]].type = "guesser"
    players[sockets[6]].partner = sockets[1];
    players[sockets[6]].type = "drawer"
    players[sockets[7]].partner = sockets[3];
    players[sockets[7]].type = "guesser"
  }
  if (onePartner && twoPartner) {
    console.log(4)
    players[sockets[0]].partner = sockets[2];
    players[sockets[0]].type = "drawer"
    players[sockets[1]].partner = sockets[5];
    players[sockets[1]].type = "guesser"
    players[sockets[2]].partner = sockets[0];
    players[sockets[2]].type = "guesser"
    players[sockets[3]].partner = sockets[7];
    players[sockets[3]].type = "drawer"
    players[sockets[4]].partner = sockets[6];
    players[sockets[4]].type = "drawer"
    players[sockets[5]].partner = sockets[1];
    players[sockets[4]].type = "drawer"
    players[sockets[6]].partner = sockets[4];
    players[sockets[6]].type = "guesser"
    players[sockets[7]].partner = sockets[3];
    players[sockets[7]].type = "guesser"
  }
  console.log(players)
  partOne = false;
  startGame();
}



function endGame() {
  playing = false;
  stream.write(timeStamp() + " Experiment ending!");
  process.exit();
}
