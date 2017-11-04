// ------------------ //
// Global state data //
// ---------------- //
var store = new Vuex.Store({
	state: {
		username: "",

		messages: [
			{ time: Date.now(), from: "Username", message: "Hello world this is a much longer sentence which will hopefully span multiple lines :D" },
			{ time: Date.now(), from: "Username2", message: "Foo bar" }
		]
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
var chatPanel = Vue.component('chat-panel', {
	template: '#template-chat-panel'
});

var bsModal = Vue.component('bs-modal', {
	props: ["title", "buttons", "closeButton"],
	template: '#template-bs-modal',
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

var ViewGame = {
	template: '#view-game'
};

// --------------------- //
// Setup route handling //
// ------------------- //
var router = new VueRouter({
	routes: [
		{ path: "/", component: ViewWelcome },
		{ path: "/lobby", component: ViewLobby },
		{ path: "/game", component: ViewGame }
	]
});

// --------------- //
// Setup main app //
// ------------- //
var app = new Vue({
	router: router,
	store: store,
	components: {
		bsModal: bsModal,
		chatPanel: chatPanel
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