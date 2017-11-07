// ------------------ //
// Global state data //
// ---------------- //
var store = new Vuex.Store({
	state: {
		username: "",

		messages: []
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
		
		case "chat-message":
			store.state.messages.push(data.message);
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
	template: '#template-chat-panel',
	data: function() { return {
		messageInput: ""
	};},
	methods: {
		submitMessage: function(e) {
			wsSend({event: "chat-message", message: this.messageInput});
			this.messageInput = "";
		}
	},
	filters: {
		date: function (v) {
			var d = new Date(v);
			function td(v) { return (v < 10 ? "0" : "") + v; } // two digits
			return td(d.getHours()) + ":" + td(d.getMinutes()) + ":" + td(d.getSeconds());
		}
	}
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
router.replace("/");

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