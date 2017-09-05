//style="margin-bottom:50px;"
var socket = io();
//var socket = io.connect('//localhost:30000', {'forceNew': true});
var canvas = document.getElementById('canvas');
var answer = document.getElementById('textbox');
var paint = false;
var timer = 20;
var ready = false;
var currentX = 0;
var currentY = 0;
window.moveTo(0,0);
//window.resizeTo(screen.width,screen.height);


/**
 * Handle when user tries to refresh page
 */
console.log(answer)
window.onbeforeunload = function() {
	return "If you refresh or leave this page, you will not be able to reenter this experiment, and you will forfeit payment. Are you sure?";
};

/**
 * Handles alerting the server once the players are ready.
 */
function readyToPlay() {
	if (ready) {
		return;
	}
	ready = true;
	var prolificId = prompt("Excellent! Please enter your prolific ID");
	socket.emit('readytoplay', prolificId);
}



/**
 * Handles sending guesses to the server and alerting players if their guess is correct
 */
function guessSubmitted() {
	var guess = document.getElementById('textbox').value;
	socket.emit('sentguess', guess.replace(/\s/g, ""));
}

answer.addEventListener('keypress', function(e) {
	if (e.keyCode == 13) {
		e.preventDefault();
    	var guess = document.getElementById('textbox').value;
		socket.emit('sentguess', guess.replace(/\s/g, ""));

	}
}, false);

socket.on('guesser_guessreceived', function(answer) {
	if (answer === 'correct') {
		document.getElementById('text').style.color = "#000000";
		document.getElementById('text').innerHTML = "YOU GUESSED CORRECTLY, THE NEXT ROUND WILL BEGIN SHORTLY!";
	} else {
		document.getElementById('text').innerHTML = "You guessed incorrectly! Try again!";
	}
});

socket.on('drawer_guessreceived', function(answer, guess) {
	if (answer === 'correct') {
		document.getElementById('text').style.color = "#000000";
		document.getElementById('text').innerHTML = "YOUR PARTNER GUESSED CORRECTLY! THE NEXT ROUND WILL BEGIN SHORTLY!";
		document.getElementById('clue').innerHTML = "";

	} else {
		document.getElementById('text').innerHTML = "Your partner just guessed \"" + guess + "\". Keep trying!";
	}
});

/**
 * Handling the timer display
 */
socket.on('starttimer', function(countdown, wordOne, wordTwo, players) {
	document.getElementById('countdown').innerHTML = "Time Left: " + countdown;
	if (countdown === -1) {
		document.getElementById('guess_information').innerHTML = "";
		if (players[socket.id].group === 1) {
			if (document.getElementById('text').innerHTML != "YOU GUESSED CORRECTLY, THE NEXT ROUND WILL BEGIN SHORTLY!"
				&& players[socket.id].type === "guesser") {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly! The correct word was " + wordOne;
			} 
			else {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly!";
			}
		} else {
			if (document.getElementById('text').innerHTML != "YOU GUESSED CORRECTLY, THE NEXT ROUND WILL BEGIN SHORTLY!"
				&& players[socket.id].type === "guesser") {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly! The correct word was " + wordTwo;			
			} else {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly!";
			}
		}
		document.getElementById('text').innerHTML = "";
		document.getElementById('clue').innerHTML = "";
		socket.emit('roundover');
	}
});

/**
 * Send current position of the mouse on the canvas to the server
*/
socket.on('giveposition', function() {
	if (paint) {
		socket.emit('recordposition', currentX, currentY);
	} else {
		socket.emit('recordposition', -1, -1);
	}
});

/**
 * Give players directions at the start of each round.
 */

socket.on('setroles', function(players, word, wordTwo, first) {
	var text;
	var clue;
	console.log(players)
	if (first) {
		alert("The study is starting!")
	}
	if (players[socket.id].type === "guesser") {
		text = "You are guesser this round. When you think you know what your partner is drawing, enter your guess in the textbox.";
	} else {
		if (players[socket.id].group === 1) {
			text = "You are a drawer this round. We will let you know what your partner guesses.";
			clue = "DRAW: " + word;
			document.getElementById('clue').innerHTML = clue;
		} else {
			text = "You are a drawer this round. We will let you know what your partner guesses.";
			clue = "DRAW: " + wordTwo;
			document.getElementById('clue').innerHTML = clue;
		}
	}
	document.getElementById('countdown').innerHTML = "Time Left: 60";
	document.getElementById('text').innerHTML = text;
});

/**
 * Display message at the end of part 1
 */
 socket.on('parttwo', function() {
 	document.getElementById('countdown').innerHTML = "Part One has ended. In 30 seconds, Part Two will begin. You will have a new partner.";
	document.getElementById('text').innerHTML = "";
	document.getElementById('clue').innerHTML = "";
 })


/**
 * Force socket to disconnect
 */

socket.on('endgame', function(){
	document.getElementById('countdown').innerHTML = "This experiment has ended. Thank you for your participation!<br/>IMPORTANT: You must click <a href=\"https://google.com\"> here </a> to receive payment for your participation.";
	document.getElementById('text').innerHTML = "";
	document.getElementById('clue').innerHTML = "";
	socket.emit('readytoend');
    //socket.disconnect();
    socket.io.close();
});



/*
The following functions and event listeners are used to find the coordinates where a player is drawing, and transmit those 
coordinates to the server. The server is responsible for sending the coordinates to the necessary players so the image can
be drawn on their screens in real time. If a player is not designated as a "drawer", the server will not send the coordinates.
*/

canvas.addEventListener('click', function(e) {
    x = e.pageX-canvas.offsetLeft;
	y = e.pageY-canvas.offsetTop;
	currentX = x
	currentY = y
	var coordinates = {xPos: x, yPos: y};
	socket.emit('sentclick', coordinates);

}, false);

socket.on('drawclick', function(coordinates) {
	context = canvas.getContext("2d");
	context.fillRect(coordinates.xPos, coordinates.yPos, 2, 2);
});

canvas.addEventListener('mousedown', function(e) {
	paint = true;
	console.log(canvas.offsetLeft + "   "  +canvas.offsetTop)
    x = e.pageX-canvas.offsetLeft;
	y = e.pageY-canvas.offsetTop;
	currentX = x;
	currentY = y;
	var coordinates = {xPos: x, yPos: y};
	socket.emit('sentclick', coordinates);

}, false);

canvas.addEventListener('mousemove', function(e) {
	if (paint) {
    	x = e.pageX-canvas.offsetLeft;
		y = e.pageY-canvas.offsetTop;
		var coordinates = {xInit: currentX, yInit: currentY, xFin: x, yFin: y};
		socket.emit('sentline', coordinates);
		currentX = x;
		currentY = y;

	}
}, false);

socket.on('drawline', function(coordinates) {
	context = canvas.getContext("2d");
	context.beginPath();
	context.moveTo(coordinates.xInit, coordinates.yInit);
	context.lineTo(coordinates.xFin, coordinates.yFin);
	context.lineWidth = 2;
	context.stroke();
});

canvas.addEventListener('mouseout', function(e) {
	paint = false;
}, false);

canvas.addEventListener('mouseup', function(e) {
	paint = false;
}, false);

socket.on('clearcanvas', function() {
	context = canvas.getContext("2d");
	context.clearRect(0, 0, canvas.width, canvas.height);
});




