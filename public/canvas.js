//style="margin-bottom:50px;"
var socket = io();
var canvas = document.getElementById('canvas')
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
	socket.emit('readytoplay');
	ready = true;
	alert("Awesome! We will begin when everyone else is ready.");
}

/**
 * Handles sending guesses to the server and alerting players if their guess is correct
 */
function guessSubmitted() {
	var guess = document.getElementById('textbox').value;
	socket.emit('sentguess', guess.replace(/\s/g, ""));
}

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
		if (players["/#" + socket.id].group === 1) {
			if (document.getElementById('text').innerHTML != "YOU GUESSED CORRECTLY, THE NEXT ROUND WILL BEGIN SHORTLY!"
				&& players["/#" + socket.id].type === "guesser") {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly! The correct word was " + wordOne;
			} 
			else {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly!";
			}
		} else {
			if (document.getElementById('text').innerHTML != "YOU GUESSED CORRECTLY, THE NEXT ROUND WILL BEGIN SHORTLY!"
				&& players["/#" + socket.id].type === "guesser") {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly! The correct word was " + wordTwo;			
			} else {
				document.getElementById('countdown').innerHTML = "The next round will begin shortly!";
			}
		}
		document.getElementById('text').style.color = "red";
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

socket.on('setroles', function(players, word, wordTwo) {
	var text;
	var clue;
	if (players["/#" + socket.id].type === "guesser") {
		text = "You are guesser this round. When you think you know what your partner is drawing, enter your guess in the textbox.";
	} else {
		if (players["/#" + socket.id].group === 1) {
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
 * Force socket to disconnect
 */

socket.on('endgame', function(){
	document.getElementById('countdown').innerHTML = "test";
	socket.emit('readytoend');
    socket.disconnect();
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




