var socket = io();
var canvas = document.getElementById('canvas')
var button = document.getElementById('button')
var paint = false
var currentX = 0
var currentY = 0


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


canvas.addEventListener('click', function(e) {
	//var x = e.clientX - 440 
	//var y = e.clientY - 247
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

	context = canvas.getContext("2d")
	context.fillStyle = getColor()
	context.fillRect(x, y, 2, 2)
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
	//var x = e.clientX - 440 
	//var y = e.clientY - 247
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
	context = canvas.getContext("2d");
	context.fillStyle = getColor()
	context.fillRect(x, y, 2, 2)
	currentX = x
	currentY = y
	var coordinates = {xPos: x, yPos: y, colors: getColor()};
	socket.emit('sentclick', coordinates);

}, false);

canvas.addEventListener('mousemove', function(e) {
	if (paint) {
		//var x = e.clientX - 440 
		//var y = e.clientY - 247
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
		context = canvas.getContext("2d");
		context.strokeStyle = getColor()
		context.beginPath()
		context.moveTo(currentX, currentY)
		context.lineTo(x, y)
		context.lineWidth = 2
		context.stroke()
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

canvas.addEventListener('mouseup', function(e) {
	paint = false;
}, false);





