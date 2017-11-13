// ------------------ //
// Global state data //
// ---------------- //
var store = new Vuex.Store({
	state: {
		username: "",

		messages: [],
		lobbies: []
	},

	mutations: {
		updateLobby: function(state, serverMessage) {
			// Find existing lobby with same ID
			var i;
			for (i = 0; i < state.lobbies.length; i++)
				if (state.lobbies[i].gameId == serverMessage.gameId)
					break;
			
			if (i != state.lobbies.length) {
				if (serverMessage.gameClosed) {
					// Remove from array
					state.lobbies.splice(i, 1);

				} else {
					// Update existing
					var lobby = state.lobbies[i];
					lobby.player1 = serverMessage.player1;
					lobby.player2 = serverMessage.player2;
				}
			} else {
				// If one was not found, add it
				state.lobbies.push({
					gameId: serverMessage.gameId,
					player1: serverMessage.player1,
					player2: serverMessage.player2
				});
			}
		},

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
	if (!data.event) return;
	var f = MessageHandlers[data.event];
	f && f(data);
});

/** Dictionary containing handlers for all WebSocket messages.
 * @type {Object.<string,(any)=>void>} */
var MessageHandlers = {
	// Core functions
	"heartbeat": function() {
		wsSend({event: "beat"});
	},

	// Lobby functions
	"lobby-join": function() {
		router.replace("/lobby");
		applicationLoading(false);
	},
	"chat-message": function(data) {
		store.state.messages.push(data.message);
	},
	"game-create": function(date) {
		applicationLoading(false);
		//if (data.success)
		//	TODO: go to a lobby-only screen (so user cannot see other lobbies)	
	},
	"game-status-update": function(data) {
		store.commit('updateLobby', data);
	}
};

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
	template: '#view-lobby',
	data: function() { return {
		showCreateGamePopover: false
	};},

	methods: {
		submitCreateGameLobby: function() {
			applicationLoading(true);
			wsSend({
				event: "game-create",
				difficulty: jQuery('[name="difficultyOptions"]:checked').val(),
				opponentType: jQuery('[name="opponentOptions"]:checked').val()
			});
		}
	}
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