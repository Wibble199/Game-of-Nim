var ws = new WebSocket("ws://" + location.host);

$('#server-message-form').addEventListener('submit', function(e) {
	e.preventDefault();
	ws.send($('#message-box').value);
	$('#message-box').value = "";
});

ws.addEventListener('open', e => {
	console.log("Connection opened", e);
});

ws.addEventListener('message', e => {
	console.log("Message received", e);
});

ws.addEventListener('close', e => {
	console.log("Connection closed", e);
});

function $(q) { return document.querySelector(q); }