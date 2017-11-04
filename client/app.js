// ------------------ //
// Global state data //
// ---------------- //
var store = new Vuex.Store({
	state: {
		username: ""
	},

	mutators: {
		setProperty: function(state, prop, val) {
			state[prop] = val;
		}
	}
});
	
// ----------------- //
// Setup web socket //
// ----------------//
var ws = new WebSocket("ws://" + location.host);

ws.addEventListener('close', function(e) {
	$('#network-error-modal').modal('show');
});

ws.addEventListener('message', e => {
	var data = JSON.parse(e.data);
	console.log(data);
	if (!data.event) return;
	switch (data.event) { // Handle special events
		case "heartbeat": // Heartbeat from server
			ws.send('{"event": "beat"}');
			break;

		case "lobby-join":
			router.replace("/lobby");
			applicationLoading(false);
			break;
		
		case "set":
			store.commit("setProperty", data.prop, data.val);
			break;

		default:
			console.log("Unknown event", data);
	}
});

function wsSend(data) {
	ws.send(JSON.stringify(data));
}

// --------------- //
// Vue components //
// ------------- //
var bsModal = Vue.component('bs-modal', {
	props: ["title", "buttons", "closeButton"],
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
			applicationLoading(true);
			wsSend({event: "lobby-join", username: store.state.username});
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
	store: store,
	components: {
		bsModal: bsModal
	},

	// Application methods
	methods: {
		reload: function() { window.location.reload(); },
	}

}).$mount('#app');

// Use to turn on/off loading dialog
function applicationLoading(v) {
	jQuery('#app-loading-modal').modal(v ? "show" : "hide");
}