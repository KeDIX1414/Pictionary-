//style="margin-bottom:50px;"
var socket = io();
var canvas = document.getElementById('canvas')
var paint = false
var timer = 20
//window.moveTo(0,0);
//window.resizeTo(screen.width,screen.height);


/*
Handles sending guesses to the server and alerting players if their guess is correct
*/

function guessSubmitted() {
	var guess = document.getElementById('textbox').value;
	socket.emit('sentguess', guess);
}

socket.on('guesser_guessreceived', function(answer) {
	if (answer === 'correct') {
		document.getElementById('text').innerHTML = "You guessed correctly, the next round will begin shortly!";
	} else {
		document.getElementById('text').innerHTML = "You guessed incorrectly! Try again!";
	}
});

socket.on('drawer_guessreceived', function(answer, guess) {
	if (answer === 'correct') {
		document.getElementById('text').innerHTML = "Your partner guessed correctly! The next round will begin shortly!";
	} else {
		document.getElementById('text').innerHTML = "Your partner just guessed \"" + guess + "\". Keep trying!"
	}
});

/*
Handling the timer display
*/
socket.on('starttimer', function() {
	document.getElementById('countdown').innerHTML = "Time Left: " + timer.toString();
	var time = setInterval(function() {
		timer = timer - 1;
		document.getElementById('countdown').innerHTML = "Time Left: " + timer.toString();
		if (timer === -1) {
			document.getElementById('guess_information').innerHTML = ""
			timer = 20
			document.getElementById('countdown').innerHTML = "The next round will begin shortly!"
			document.getElementById('text').innerHTML = "";
			document.getElementById('clue').innerHTML = "";
			socket.emit('roundover');
			clearInterval(time)
		}
	}, 1000);
})



/*
The following functions and event listeners are used to find the coordinates where a player is drawing, and transmit those 
coordinates to the server. The server is responsible for sending the coordinates to the necessary players so the image can
be drawn on their screens in real time. If a player is not designated as a "drawer", the server will not send the coordinates.*/

canvas.addEventListener('click', function(e) {
    x = e.pageX-canvas.offsetLeft;
	y = e.pageY-canvas.offsetTop;
	currentX = x
	currentY = y
	var coordinates = {xPos: x, yPos: y};
	socket.emit('sentclick', coordinates);

}, false);

socket.on('drawclick', function(coordinates) {
	context = canvas.getContext("2d")
	//context.fillStyle = coordinates.colors
	context.fillRect(coordinates.xPos, coordinates.yPos, 2, 2)
});

canvas.addEventListener('mousedown', function(e) {
	paint = true;
    x = e.pageX-canvas.offsetLeft;
	y = e.pageY-canvas.offsetTop;
	currentX = x
	currentY = y
	var coordinates = {xPos: x, yPos: y};
	socket.emit('sentclick', coordinates);

}, false);

canvas.addEventListener('mousemove', function(e) {
	if (paint) {
    	x = e.pageX-canvas.offsetLeft;
		y = e.pageY-canvas.offsetTop;
		var coordinates = {xInit: currentX, yInit: currentY, xFin: x, yFin: y};
		socket.emit('sentline', coordinates);
		currentX = x
		currentY = y

	}
}, false);

socket.on('drawline', function(coordinates) {
	context = canvas.getContext("2d")
	//context.strokeStyle = coordinates.colors
	context.beginPath()
	context.moveTo(coordinates.xInit, coordinates.yInit)
	context.lineTo(coordinates.xFin, coordinates.yFin)
	context.lineWidth = 2
	context.stroke()
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

socket.on('setroles', function(players, word, wordTwo) {
	var text;
	var clue;
	if (players["/#" + socket.id].type === "guesser") {
		text = "You are guesser this round. When you think you know what your partner is drawing, enter your guess in the textbox."
	} else {
		if (players["/#" + socket.id].group === 1) {
			text = "You are a drawer this round. We will let you know what your partner guesses."
			clue = "DRAW: " + word;
			document.getElementById('clue').innerHTML = clue;
		} else {
			text = "You are a drawer this round. We will let you know what your partner guesses."
			clue = "DRAW: " + wordTwo;
			document.getElementById('clue').innerHTML = clue;
		}
	}
	document.getElementById('text').innerHTML = text;
});

socket.on('endmessage', function() {
	alert('hi!')
	document.getElementById('countdown').innerHTML = "The experiment is over. Thank you for your participation!"
});



