const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const {GameManager} = require('./GameManager');

const CLIENT_FILES = path.resolve(__dirname + "/../client");
const HTTP_PORT = 8080;
const HEARTBEAT_INTERVAL = 10000; // Send a heartbeat this often
const HEARTBEAT_TIMEOUT = 5000; // Wait this long for a heartbeat response

var manager = new GameManager();

/* ------------------ */
/* Setup HTTP server */
/* ---------------- */
var server = http.createServer((req, res) => {
	// Get the local file path to the path from the URL request
	// (if request is "/" then get the index html file)
	var file = CLIENT_FILES + (req.url == "/" ? "/index.html" : req.url);

	// Get the content type based on the file extension
	var contentType = {
		".html": "text/html",
		".js": "text/javascript",
		".css": "text/css",
		".png": "image/png"
	}[path.extname(file)];

	// Read the requested file contents asynchronously
	fs.readFile(file, (err, data) => {
		if (err) { // If there was an error, send a 404 File Not Found error
			res.statusCode = 404;
			res.end("404 File Not Found: " + file);
		} else { // If no error, write 200 (success) and send the file contents
			res.writeHead(200, { 'Content-Type': contentType });
			res.end(data, 'utf8');
		}
	});

}).listen(HTTP_PORT);

/* ----------------------- */
/* Setup WebSocket server */
/* --------------------- */
var socketServer = new WebSocket.Server({server});

socketServer.on('connection', socket => {
	// Assign client unique ID
	let id = manager.connectClient(socket);
	let heartbeatId, heartbeatTimeoutId;
	let disconnectHandler;

	console.log(`Client ${id} connected`);

	// Handle receiving messages from this client
	socket.on('message', msg => {
		let json;
		try {
			json = JSON.parse(msg);
			if (!json.event) // EVERYTHING should have an event property, throw an error if not
				throw "No `event` property";
		} catch (ex) {
			console.error("Invalid JSON received:", ex);
		}
			
		// Check to see if there is any special handling for this message at the core server level
		var func = {
			"beat": () => clearTimeout(heartbeatTimeoutId)
		}[json.event];

		func ? func(json) : manager.receiveMessage(json, id);
	});

	// Handle the client closing (disconnect)
	socket.once('close', disconnectHandler = (code, reason) => {
		socket.close();
		manager.disconnectClient(id);
		clearInterval(heartbeatId); // Stop the heartbeat checking
		console.log(`Client ${id} disconnected`);
	});

	// Set up heartbeat to check if the client has closed due to a reason
	// where the disconnect would not fire (e.g. network failure)
	heartbeatId = setInterval(() => {
		// Send the heartbeat
		socket.send(`{"event": "heartbeat"}`);
		// If the disconnect function passed to the timeout runs, the heartbeast was not answered in time
		heartbeatTimeoutId = setTimeout(disconnectHandler, HEARTBEAT_TIMEOUT);
	}, HEARTBEAT_INTERVAL);
});