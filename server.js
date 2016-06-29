//var app = require('express')();
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http); //app
var players = {}; // keeps track of everyone playing the game
var id = 1; // is updated to give every player a unique id

app.get('/', function(req, res){
	res.sendfile('PictionarySite.html');
});

app.use(express.static('public'));

// controls what to do when players connect and disconnect
io.on('connection', function(socket){
	console.log('a user connected');

	// create a new player
	var player = new Player(id, "waiting", "drawer");
 	players[socket] = player;
 	id = id + 1;
 	console.log(players[socket].id + "  " + players[socket].status + "  " + players[socket].type);
  	
 	// handle when player disconnects
  	socket.on('disconnect', function(){
  		delete players[socket];
    	console.log('user disconnected');
    });

    // handle when someone clicks
    socket.on("sentclick", function (coordinates) {
    	socket.broadcast.emit('drawclick', coordinates);
    });

    // handle when a line is drawn
    socket.on("sentline", function (coordinates) {
      console.log("line is about to be drawn")
      socket.broadcast.emit('drawline', coordinates);
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


function Player(id, status, type) {
	this.id = id;
	this.status = status;
	this.type = type;
}
