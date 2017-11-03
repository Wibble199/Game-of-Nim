const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const CLIENT_FILES = path.resolve(__dirname + "/../client");
const HTTP_PORT = 8080;

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
	console.log("Open connection");

	socket.on('message', msg => {
		console.log("Message received", msg);
		socket.send(msg);
	});

	socket.on('close', (code, reason) => {
		console.log("Connection closed");
	});
});