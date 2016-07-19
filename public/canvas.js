var socket = io();
var canvas = document.getElementById('canvas')
var button = document.getElementById('button')
var paint = false

// Find the color the user has selected
function getColor() {
	var select = document.getElementById("selector_one");
	var option = select.options[select.selectedIndex].value;
	var color = ""
	switch (option) {
		case "red":
			color = "red"
			break
		case "blue":
			color = "blue"
			break
		case "black":
			color = "black"
			break
		case "brown":
			color = "brown"
			break
		case "orange":
			color = "orange"
			break
		case "yellow":
			color = "yellow"
			break
		case "purple":
			color = "purple"
			break
		case "green":
			color = "green"
			break
	}
	return color
}


/*
The following functions and event listeners are used to find the coordinates where a player is drawing, and transmit those 
coordinates to the server. The server is responsible for sending the coordinates to the necessary players so the image can
be drawn on their screens in real time. If a player is not designated as a "drawer", the server will not send the coordinates.*/

canvas.addEventListener('click', function(e) {

	var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = canvas;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    x = e.pageX - totalOffsetX;
    y = e.pageY - totalOffsetY;
	var coordinates = {xPos: x, yPos: y};
	socket.emit('sentclick', coordinates);

}, false);

socket.on('drawclick', function(coordinates) {
	context = canvas.getContext("2d")
	context.fillStyle = coordinates.colors
	context.fillRect(coordinates.xPos, coordinates.yPos, 2, 2)
});

canvas.addEventListener('mousedown', function(e) {
	paint = true;
	var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = canvas;

    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    x = e.pageX - totalOffsetX;
    y = e.pageY - totalOffsetY;
	currentX = x
	currentY = y
	var coordinates = {xPos: x, yPos: y, colors: getColor()};
	socket.emit('sentclick', coordinates);

}, false);

canvas.addEventListener('mousemove', function(e) {
	if (paint) {
		var totalOffsetX = 0;
    	var totalOffsetY = 0;
    	var canvasX = 0;
    	var canvasY = 0;
    	var currentElement = canvas;

    	do{
        	totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        	totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    	}
    	while(currentElement = currentElement.offsetParent)

    	x = e.pageX - totalOffsetX;
    	y = e.pageY - totalOffsetY;
		var coordinates = {xInit: currentX, yInit: currentY, xFin: x, yFin: y, colors: getColor()};
		socket.emit('sentline', coordinates);
		currentX = x
		currentY = y

	}
}, false);

socket.on('drawline', function(coordinates) {
	context = canvas.getContext("2d")
	context.strokeStyle = coordinates.colors
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

socket.on('setroles', function(players, word) {
	var text;
	if (players["/#" + socket.id].type === "guesser") {
		text = "You are guesser this round. When you think you know what your partner is drawing, enter your guess in the textbox."
	} else {
		text = "You are a drawer this round. Please draw a " + word + " . We will let you know what your partner guesses."
	}
	document.getElementById('text').innerHTML = text;
});



