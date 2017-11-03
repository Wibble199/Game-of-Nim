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
	var data = JSON.parse(e.data);
	switch (data.event) { // Handle special events
		case "heartbeat":
			ws.send('{"event": "beat"}');
			break;
		default:
			// Do whatever
			console.log("Message received", data.event);
	}
});

ws.addEventListener('close', e => {
	console.log("Connection closed", e);
});

function $(q) { return document.querySelector(q); }