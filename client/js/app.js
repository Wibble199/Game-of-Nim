// ------------------ //
// Global state data //
// ---------------- //
var store = new Vuex.Store({
	state: {
		// Lobby-related vars
		username: "",
		inGameLobby: -1,
		messages: [],
		lobbies: [],
		
		// Game-related vars
		gameState: "",
		marbles: 0,
		yourTurn: false, // yourTurn is not the same as canPlay: It can be your turn but you may
		canPlay: false, // not be able to play if you are waiting on a message to go to the server.
		lastErrorMessage: "",
		lastWinner: false, // whether or not this user won the last game
		rematchStatus: "",
		allowRematchVote: true,
		
		// Mobile related
		newMessages: 0,
		mobileShowGamePanel: true
	},

	mutations: {
		updateLobby: function(state, msg) {
			// Find existing lobby with same ID
			var i;
			for (i = 0; i < state.lobbies.length; i++)
				if (state.lobbies[i].gameId == msg.gameId)
					break;
			
			if (i != state.lobbies.length) {
				if (msg.gameClosed) {
					// Remove from array
					state.lobbies.splice(i, 1);

				} else {
					// Update existing
					var lobby = state.lobbies[i];
					lobby.player1 = msg.player1;
					lobby.player2 = msg.player2;
					lobby.gameState = msg.gameState;
				}
			} else if (!msg.gameClosed) {
				// If one was not found, add it
				state.lobbies.push({
					gameId: msg.gameId,
					player1: msg.player1,
					player2: msg.player2,
					gameState: msg.gameState
				});
			}
		},

		updateGameState: function(state, data) {
			state.marbles = data.marbles;
			state.yourTurn = state.canPlay = data.yourTurn;
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
		if (store.state.mobileShowGamePanel)
			store.state.newMessages++;
	},
	"game-create": function(data) {
		applicationLoading(false);
		if (data.success)
			store.state.inGameLobby = data.gameId;
	},
	"game-join": function(data) {
		applicationLoading(false);
	},
	"game-status-update": function(data) {
		store.commit('updateLobby', data);
	},

	// Game functions
	"game-start": function(data) {
		applicationLoading(false);
		router.replace("/game");
		store.commit('updateGameState', data);
		store.state.gameState = "in-game";
		// Now we've joined, reset game lobby flag so that however the game ends we can create a new game
		store.state.inGameLobby = -1;
	},
	"game-update": function(data) {
		store.commit('updateGameState', data);
	},
	"play-turn": function(data) {
		if (!data.success) {
			store.state.canPlay = true;
			store.state.lastErrorMessage = data.reason;
		}
	},
	"game-over": function(data) {
		store.state.yourTurn = store.state.canPlay = false;
		store.state.gameState = "game-over";
		store.state.lastWinner = data.win;
		store.state.rematchStatus = data.ai ? "The AI is always ready for a rematch." : "Your opponent has not voted on whether they want to rematch.";
		store.state.allowRematchVote = true;
	},
	"game-leave": function(data) {
		if (data.success) {
			store.state.inGameLobby = -1;
			router.replace("/lobby");
		}
	},
	"game-terminate": function(_) {
		store.state.yourTurn = store.state.canPlay = false;
		store.state.gameState = "opponent-forfeit";
	},
	"rematch-vote": function(data) {
		store.state.rematchStatus = "Your opponent has " + (data.opponentVote ? "voted to rematch." : "chosen not to rematch.");
		store.state.allowRematchVote = data.opponentVote;
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

var mobileNav = Vue.component('mobile-nav', {
	template: '#template-mobile-nav'
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
			this.$data.showCreateGamePopover = false;
			wsSend({
				event: "game-create",
				difficulty: jQuery('[name="difficultyOptions"]:checked').val(),
				opponentType: jQuery('[name="opponentOptions"]:checked').val()
			});
		},

		joinGameLobby: function(gameId) {
			if (gameId == store.state.inGameLobby) return; // Do nothing if we're already in the clicked lobby
			applicationLoading(true);
			wsSend({
				event: "game-join",
				id: gameId
			});
		},

		cancelLobbyWaiting: function() {
			wsSend({ event: "game-leave" });
		}
	}
};

var ViewGame = {
	template: '#view-game',

	data: function() { return {
		marblesToRemove: 1
	};},

	methods: {
		playTurn: function() {
			wsSend({ event: "play-turn", marbles: this.$data.marblesToRemove });
			store.state.canPlay = false; // Prevent the user from making a second move before the server has responded
		},
		gameLeave: function() {
			wsSend({ event: "game-leave" });
		},
		voteRematch: function() {
			store.state.rematchStatus = "You have voted to rematch. Waiting on your opponent.";
			wsSend({ event: "rematch-vote", vote: true });
		}
	}
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
		chatPanel: chatPanel,
		mobileNav: mobileNav
	},

	// Application methods
	methods: {
		reload: function() { window.location.reload(); },
	}

}).$mount('#app');

// Setup tooltips
$(function () {
	$('[data-toggle="tooltip"]').tooltip()
})

// Use to turn on/off loading dialog
function applicationLoading(v) {
	jQuery('#app-loading-modal').modal(v ? "show" : "hide");
}