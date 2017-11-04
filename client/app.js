// ----------------- //
// Setup web socket //
// ----------------//
var ws = new WebSocket("ws://" + location.host);

ws.addEventListener('open', function(e) {
	app.$data.webSocketConnected = true;
});

ws.addEventListener('close', function(e) {
	app.$data.webSocketConnected = false;
});

ws.addEventListener('message', e => {
	var data = JSON.parse(e.data);
	switch (data.event) { // Handle special events
		case "heartbeat": // Heartbeat from server
			ws.send('{"event": "beat"}');
			break;
		default:
			// Do whatever
			console.log("Message received", data.event);
	}
});

// --------------------- //
// Setup route handling //
// ------------------- //
var router = new VueRouter({
	routes: [
		//{ path: "/", component: COMPONENT }	
	]
});

// --------------- //
// Setup main app //
// ------------- //
var app = new Vue({
	router: router,

	// State for the application
	data: {
		webSocketConnected: false
	}

}).$mount('#app');