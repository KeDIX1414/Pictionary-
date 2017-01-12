//var app = require('express')();
var express = require('express');
var fs = require('fs');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http); //app

//var sockets
var players = {}; // keeps track of everyone playing the game
var sockets = new Array();

var numPlayers = 1;
var numReadyPlayers = 0;
var playing = false;
var round = 0;
var playersEnded = 0;

var words = new Array();
var wordsTwo = new Array(); 
var results = new String();
var stream = fs.createWriteStream("my_file.txt");
stream.write(timeStamp() + " Experiment Starting!\n")
var buf = new Buffer(1024);

fs.open('arguments.txt', 'r+', function(err, fd) {
   if (err) {
       return console.error(err);
   }
   fs.read(fd, buf, 0, buf.length, 0, function(err, bytes){
      if (err){
         console.log(err);
      }

      // Print only read bytes to avoid junk.
      if(bytes > 0){
        var str = buf.slice(0, bytes).toString();
        var allWords = new Array();
        allWords = str.split("\n");
        console.log(allWords.length)
      }
      for (i = 0; i < allWords.length; i++) {
        var options = allWords[i].split("/");
        if (i < 38) {
          words.push(options);
        } else {
          console.log("here")
          wordsTwo.push(options);
        }
      }
      fs.close(fd, function(err){
         if (err){
            console.log(err);
         } 
         console.log("File closed successfully.");
      });
   });
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
      endGame();
    });

    socket.on('readytoend', function() {
      playersEnded++;
      if (playersEnded === 2) {
        endGame();
      }
    });

    socket.on("readytoplay", function() {
      if (players[socket.id].ready) {
        return;
      } else {
        players[socket.id].ready = true;
        numReadyPlayers++;
      }
      if (numReadyPlayers === 2) {

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
      if (!playing || !players[socket.id].playing) {
        return;
      }
      stream.write(timeStamp() + "  " + players[socket.id].num + " " + " (" + currentX + "," + currentY + ")\n")
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
      if (players[socket.id].type === "drawer" || !playing || !players[socket.id].playing) {
        return;
      }
      stream.write(timeStamp() + "  " + players[socket.id].num + " guesses " + guess + "\n");
      console.log(players[socket.id].num + " guesses " + guess + " when answer is " + words[round] + "\n")
      var answer = "";
      for (i = 0; i < words.length; i++) {
        if (guess === words[round][i] && players[socket.id].group === 1) {
          answer = "correct";
          socket.emit('guesser_guessreceived', answer);
          socket.broadcast.to(players[socket.id].partner).emit('drawer_guessreceived', answer, guess);
          players[socket.id].playing = false;
          players[players[socket.id].partner].playing = false;
          return;
        } 
        else if (guess === wordsTwo[round][i] && players[socket.id].group === 2) {
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
    process.exit( );
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
  sockets = shuffleArray(sockets);
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
  word = words[0][0];
  wordTwo = wordsTwo[0][0];
  console.log(word + "  " + wordTwo);
  io.sockets.emit('setroles', players, word, wordTwo);
  for (i = 0; i < sockets.length; i++) {
    console.log(players[sockets[i]])
  }
  stream.write("\n" + timeStamp() + " Round 1 Starting\nGroup 1 word = " + words[0] + "\nGroup 2 word = " + wordsTwo[0] + "\n");
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
  }, 10);
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
    wordTwo = wordsTwo[round][0];;
    console.log(word + "  " + wordTwo)
    io.sockets.emit('setroles', players, word, wordTwo);
    if (round === 1) {
      clearInterval(time);
      io.sockets.emit('endgame');
      return;
    }
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
  }, 10);
    //io.sockets.emit('starttimer');
  }
}

function startRoundTwo() {
  var indexFirstPairOne;
  var indexFirstPairTwo;
  var indexSecondPairOne;
  var indexSecondPairTwo;
  var indexThirdPairOne;
  var indexThirdPairTwo;
  var indexFourthPairOne;
  var indexFourthPairTwo;

  // Figure Out New Partners
  if (Math.floor(Math.random() * 2) === 0) {
    indexFirstPairOne = 0;
    indexThirdPairOne = 1;
  } else {
    indexFirstPairOne = 1;
    indexThirdPairOne = 0;
  }

  if (Math.floor(Math.random() * 2) === 0) {
    indexFirstPairTwo = 2;
    indexFourthPairOne = 3;
  } else {
    indexFirstPairTwo = 3;
    indexFourthPairOne = 2;
  }

  if (Math.floor(Math.random() * 2) === 0) {
    indexSecondPairOne = 4;
    indexThirdPairTwo = 5;
  } else {
    indexSecondPairOne = 5;
    indexThirdPairTwo = 4;
  }

  if (Math.floor(Math.random() * 2) === 0) {
    indexSecondPairTwo = 6;
    indexFourthPairTwo = 7;
  } else {
    indexSecondPairTwo = 7;
    indexFourthPairTwo = 6;
  }

  // Create new partner pairs
  players[indexFirstPairOne].partner = indexFirstPairTwo;
  players[indexFirstPairTwo].partner = indexFirstPairOne;
  players[indexSecondPairOne].partner = indexSecondPairTwo;
  players[indexSecondPairTwo].partner = indexSecondPairOne;

  if (Math.floor(Math.random() * 2) === 0) {
    players[indexThirdPairOne].partner = players[indexThirdPairTwo].partner;
    players[indexThirdPairTwo].partner = players[indexThirdPairOne].partner;
    players[indexFourthPairOne].partner = players[indexFourthPairTwo].partner;
    players[indexFourthPairTwo].partner = players[indexFourthPairOne].partner;
  } else {
    players[indexThirdPairOne].partner = players[indexFourthPairTwo].partner;
    players[indexFourthPairTwo].partner = players[indexThirdPairOne].partner;
    players[indexFourthPairOne].partner = players[indexThirdPairTwo].partner;
    players[indexThirdPairTwo].partner = players[indexFourthPairOne].partner;
  }
}



/*function startRoundTwo() {
  var firstPair = new Array();
  var secondPair = new Array();
  var thirdPair = new Array();
  var fourthPair = new Array();
  var newFirstPair = new Array();
  var newSecondPair = new Array();
  var one;
  var two;
  var three;
  var four;
  var countGroupOne = 0;
  var countGroupTwo = 0;
  console.log("starting loop");
  for (i = 0; i < sockets.length; i = i + 2) {
    console.log(sockets[i]);
      if (countGroupOne === 0 && players[sockets[i]].group === 1) {
        console.log("here")
        firstPair[0] = players[sockets[i]].id;
        firstPair[1] = players[players[sockets[i]].partner].id;
        countGroupOne++;
      }
      if (countGroupOne === 1 && players[sockets[i]].group === 1) {
        secondPair[0] = players[sockets[i]].id;
        secondPair[1] = players[players[sockets[i]].partner].id;
        countGroupOne++
      }
      if (countGroupTwo === 0 && players[sockets[i]].group === 2) {
        thirdPair[0] = players[sockets[i]].id;
        thirdPair[1] = players[players[sockets[i]].partner].id;
        countGroupTwo++;
      }
      if (countGroupTwo === 1 && players[sockets[i]].group === 2) {
        fourthPair[0] = players[sockets[i]].id;
        fourthPair[1] = players[players[sockets[i]].partner].id;
        countGroupTwo++;
      }
  }
  console.log(firstPair[0]);
  console.log(firstPair[1]);
  console.log(secondPair[0]);
  console.log(secondPair[1]);
  console.log(thirdPair[0]);
  console.log(thirdPair[1]);
  console.log(fourthPair[0]);
  console.log(fourthPair[1]);
  if (Math.floor(Math.random() * 2) === 0) {
    newFirstPair[0] = firstPair[0];
    one = firstPair[1];
  } else {
    newFirstPair[0] = firstPair[1];
    one = firstPair[0];
  }

  if (Math.floor(Math.random() * 2) === 0) {
    newFirstPair[1] = secondPair[0];
    two = secondPair[1];
  } else {
    newFirstPair[1] = secondPair[1];
    two = secondPair[0];
  }

  if (Math.floor(Math.random() * 2) === 0) {
    newSecondPair[0] = thirdPair[0];
    three = thirdPair[1];
  } else {
    newSecondPair[0] = thirdPair[1];
    three = thirdPair[0];
  }

  if (Math.floor(Math.random() * 2) === 0) {
    newSecondPair[1] = fourthPair[0];
    four = fourthPair[1];
  } else {
    newSecondPair[1] = fourthPair[1];
    four = fourthPair[1];

  }
  players[one].partner = two;
  players[two].partner = one;
  players[three].partner = four;
  players[four].partner = three;
  if (Math.floor(Math.random() * 2) === 0) {
    players[newFirstPair[0]].partner = newSecondPair[0];
    players[newFirstPair[1]].partner = newSecondPair[1];
    players[newSecondPair[0]].partner = newFirstPair[0];
    players[newSecondPair[1]].partner = newFirstPair[1];
  } else {
    players[newFirstPair[0]].partner = newSecondPair[1];
    players[newFirstPair[1]].partner = newSecondPair[0];
    players[newSecondPair[1]].partner = newFirstPair[0];
    players[newSecondPair[0]].partner = newFirstPair[1];
  }
  //console.log(players);





}*/


function endGame() {
  playing = false;
  stream.write(timeStamp() + " Experiment ending!");
  process.exit();
}
