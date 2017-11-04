// ----------------- //
// Setup web socket //
// ----------------//
var ws = new WebSocket("ws://" + location.host);

ws.addEventListener('open', function(e) {
	app.$data.webSocketConnected = true;
});

ws.addEventListener('close', function(e) {
	app.$data.webSocketConnected = false;
	$('#network-error-modal').modal('show');
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

// --------------- //
// Vue components //
// ------------- //
var bsModal = Vue.component('bs-modal', {
	props: ["title", "buttons"],
	template: '#bootstrap-modal-template',
	methods: {
		buttonCallback: function(eventName) {
			if (eventName)
				this.$emit(eventName);
		}
	}
});

// ------------ //
// Setup Views //
// ---------- //
var ViewWelcome = {
	template: '#view-welcome',

	methods: {
		enterName: function() {
			// TODO: send to server
			router.replace("/lobby");
		}
	}
};

var ViewLobby = {
	template: '#view-lobby'
};

// --------------------- //
// Setup route handling //
// ------------------- //
var router = new VueRouter({
	routes: [
		{ path: "/", component: ViewWelcome },
		{ path: "/lobby", component: ViewLobby }	
	]
});

// --------------- //
// Setup main app //
// ------------- //
var app = new Vue({
	router: router,
	components: {
		bsModal: bsModal
	},

	// Application state data
	data: {
		userSetName: false
	},

	// Application methods
	methods: {
		reload: function() { window.location.reload(); }
	}

}).$mount('#app');