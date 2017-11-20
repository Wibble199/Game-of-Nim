// ---------------------------- //
// Marble pile size generation //
// -------------------------- //
/** Map that contains the max size of a pile with a certain number of rows.
 * `PILE_SIZE[3]` contains the total number of a pile with 4 rows. */
var PILE_SIZES = [1], i = 0;
while (PILE_SIZES[PILE_SIZES.length - 1] < 100)
	PILE_SIZES[i + 1] = PILE_SIZES[i] + ++i + 1;
	
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
		startMarbles: 0,
		marbles: 0,
		lastMarbles: 0, // store last marble count so we can animate the ones that have been removed
		yourTurn: false, // yourTurn is not the same as canPlay: It can be your turn but you may
		canPlay: false, // not be able to play if you are waiting on a message to go to the server.
		lastErrorMessage: "",
		lastWinner: false, // whether or not this user won the last game
		rematchStatus: "",
		allowRematchVote: true,
		
		// Mobile related
		newMessages: 0,
		gameNotification: false,
		mobileShowGamePanel: true
	},

	mutations: {
		/** Updates, creates or deletes a game lobby based on a data message received from the server. */
		updateLobby: function(state, msg) {
			// Find existing lobby with same ID
			for (var i = 0; i < state.lobbies.length; i++)
				if (state.lobbies[i].gameId == msg.gameId)
					break;
			
			// If there was an item in the list with the same ID as the one received from the sever
			if (i != state.lobbies.length) {
				if (msg.gameClosed)
					// If the server has told us the lobby has closed, remove from array
					state.lobbies.splice(i, 1);

				else {
					// Otherwise, update the existing lobby
					var lob = state.lobbies[i];
					lob.player1 = msg.player1;
					lob.player2 = msg.player2;
					lob.gameState = msg.gameState;
				}
			
			// If an item with matching ID was not found and this new lobby is not closing
			} else if (!msg.gameClosed) {
				// Add the new lobby to the list
				state.lobbies.push({
					gameId: msg.gameId,
					player1: msg.player1,
					player2: msg.player2,
					gameState: msg.gameState
				});
			}
		},

		/** Updates the game state based on data received from the server.
		 * Will update marble count and allow or block the user from playing a turn. */
		updateGameState: function(state, data) {
			state.lastMarbles = state.marbles;
			state.marbles = data.marbles;
			state.yourTurn = state.canPlay = data.yourTurn;
		},

		/** Increments the unread message counter on mobile devices. */
		mobileAddMessageNotification: function(state) {
			if (state.mobileShowGamePanel)
				state.newMessages++;
		},

		/** Sets the flag to show the game update notification for mobile devices. */
		mobileAddGameNotification: function(state) {
			if (!state.mobileShowGamePanel)
				state.gameNotification = true;
		}
	}
});
	
// ----------------- //
// Setup web socket //
// ----------------//
var ws = new WebSocket("ws://" + location.host);

// If the socket closes, we have lost connection to the server so show an error message
ws.addEventListener('close', function(e) {
	$('#network-error-modal').modal('show');
});

// When we receive data from the server, attempt to convert it to an oject and then handle it
// with the relevant function from the dictionary below.
ws.addEventListener('message', e => {
	var data = JSON.parse(e.data);
	if (!data.event) return;
	var f = MessageHandlers[data.event];
	f && f(data, store.state);
});

/** Dictionary containing handlers for all WebSocket messages.
 * @type {Object.<string,(message:any,state:any)=>void>} */
var MessageHandlers = {
// Core functions
	"heartbeat": function() {
		wsSend({event: "beat"});
	},

// Lobby functions
	"lobby-join": function() {
		// Hide loading message and go to the lobby screen
		router.replace("/lobby");
		applicationLoading(false);
	},
	"chat-message": function(msg) {
		// Add the chat message to the global store
		store.state.messages.push(msg.message);
		store.commit('mobileAddMessageNotification');
	},
	"game-create": function(msg, state) {
		// Hide loading message and if successfully created lobby then show the waiting box
		applicationLoading(false);
		if (msg.success) {
			state.inGameLobby = msg.gameId;
			store.commit('mobileAddGameNotification');
		}
	},
	"game-join": function() {
		// Hide loading message
		applicationLoading(false);
	},
	"game-status-update": function(msg) {
		// Pass the lobby data to the store's `updateLobby` mutator
		store.commit('updateLobby', msg);
		store.commit('mobileAddGameNotification');
	},

// Game functions
	"game-start": function(msg, state) {
		// Hide loading and go to game screen
		applicationLoading(false);
		router.replace("/game");

		// Update the application state
		store.commit('updateGameState', msg);
		state.startMarbles = state.lastMarbles =  msg.marbles;
		state.gameState = "in-game";
		state.inGameLobby = -1; // (no longer waiting in lobby so turn this off before the user returns to lobby)
		store.commit('mobileAddGameNotification');
	},
	"game-update": function(msg) {
		// Pass the game data to the store's `updateGameState` mutator
		store.commit('updateGameState', msg);
		store.commit('mobileAddGameNotification');
	},
	"play-turn": function(msg, state) {
		// If the move was invalid
		if (!msg.success) {
			// Allow the player to try again and show them the error
			state.canPlay = true;
			state.lastErrorMessage = msg.reason;
		}
	},
	"game-over": function(msg, state) {
		// Game over so the user cannot play their turn
		state.yourTurn = state.canPlay = false;
		// Update game state
		state.gameState = "game-over";
		state.lastWinner = msg.win;
		// Show a rematch message based on whether the user was playing against AI or not and allow them to vote for a rematch.
		state.rematchStatus = msg.ai ? "The AI is always ready for a rematch." : "Your opponent has not voted on whether they want to rematch.";
		state.allowRematchVote = true;
		// Show a mobile notification if required
		store.commit('mobileAddGameNotification');
	},
	"game-leave": function(msg, state) {
		// If the server allowed you to leave the game
		if (msg.success) {
			// User no longer waiting in a lobby and ensure user is on lobby screen
			state.inGameLobby = -1;
			router.replace("/lobby");
		}
	},
	"game-terminate": function(_) {
		store.state.yourTurn = store.state.canPlay = false;
		store.state.gameState = "opponent-forfeit";
		store.commit('mobileAddGameNotification');
	},
	"game-terminate": function(_, state) {
		// Game now over so user cannot play a turn
		state.yourTurn = state.canPlay = false;
		// Update game state (which will cause forefeit notification to show)
		state.gameState = "opponent-forfeit";
		// Show mobile notification if required
		store.commit('mobileAddGameNotification');
	},
	"rematch-vote": function(msg, state) {
		// Update the rematch text to show what user's opponent voted and disable button if opponent returned to lobby.
		state.rematchStatus = "Your opponent has " + (msg.opponentVote ? "voted to rematch." : "chosen not to rematch.");
		state.allowRematchVote = msg.opponentVote;
	}
};

/** Sends a data message to the server.
 * @param {*} data The object to send. Should have an `event` property.
 */
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
		/** Handler that fires when the message form gets submitted.
		 * Sends user's chat message to server and clears text input. */
		submitMessage: function(e) {
			wsSend({event: "chat-message", message: this.messageInput});
			this.messageInput = "";
		}
	},
	filters: {
		/** Formats a number into a time in the format HH:MM:SS. */
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
		/** Raises an event when a button is clicked.
		 * Event name is set in the `buttons` property for this component. */
		buttonCallback: function(eventName) {
			if (eventName)
				this.$emit(eventName);
		}
	}
});

var marbleDisplay = Vue.component('marble-display', {
	props: ["max", "val", "last-val"],
	template: '#template-marble-display',

	data: function() { return {
		marbleMap: []
	};},

	methods: {
		recalculateMap: function(maxMarbles) {
			// Figure out the smallest pile that we can use that will be able to contain all the marbles.
			for (var rowCount = 1; PILE_SIZES[rowCount - 1] < maxMarbles; rowCount++);

			// Create an array to hold all the marble data
			var map = new Array(rowCount);
			// Create a running total for number of marbles
			var marbleVal = 0;
			// For each row in the map (starting at the end and working forwards)
			for (var row = rowCount - 1; row >= 0; row--) {
				var rowData = [];
				// For each column that is in this row (there are always `row + 1` columns for a given row)
				for (var col = 0; col < row + 1; col++) {
					rowData[col] = marbleVal++;
				}
				map[row] = rowData;
			}

			// Will produce an array that looks something like this (given examples is for maxMarbles with value of 4-6)
			/*[
				[5],
				[3,4],
				[0,1,2]
			] */

			this.$data.marbleMap = map;
		}
	},

	watch: {
		max: function(maxMarbles) { this.recalculateMap(maxMarbles); }
	},

	created: function() { this.recalculateMap(this.$props.max); }
});

// ------------ //
// Setup Views //
// ---------- //
var ViewWelcome = {
	template: '#view-welcome',

	methods: {
		/** Handler for welcome screen name submission form.
		 * Sends username to server and requests to join main lobby. */
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
		/** Handler for the button to create a new lobby. */
		submitCreateGameLobby: function() {
			// Show loading modal and hide the create game popover
			applicationLoading(true);
			this.$data.showCreateGamePopover = false;

			// Send a `game-create` request to the server with the settings the user chose.
			wsSend({
				event: "game-create",
				difficulty: jQuery('[name="difficultyOptions"]:checked').val(),
				opponentType: jQuery('[name="opponentOptions"]:checked').val()
			});
		},

		/** Handler for a "Join" button on the lobby list. */
		joinGameLobby: function(gameId) {
			if (gameId == store.state.inGameLobby) return; // Do nothing if we're already in the clicked lobby
			// Show loading screen and send a `game-join` request to the server with the ID of the game to join
			applicationLoading(true);
			wsSend({
				event: "game-join",
				id: gameId
			});
		},

		/** Handler for button to indicate to the server the user wishes to stop waiting for a second player
		 * in the lobby they created. */
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
		/** Handler for the "Play turn" button. */
		playTurn: function() {
			wsSend({ event: "play-turn", marbles: this.$data.marblesToRemove });
			store.state.canPlay = false; // Prevent the user from making a second move before the server has responded
		},

		/** Handler for the "Forefeit game" button and the "Return to lobby" buttons. */
		gameLeave: function() {
			wsSend({ event: "game-leave" });
		},

		/** Handler for the "Vote rematch" button on game end. */
		voteRematch: function() {
			// Update the text to give feedback the user that they have clicked it.
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
		mobileNav: mobileNav,
		marbleDisplay: marbleDisplay
	},

	// Application methods
	methods: {
		/** Handler for the "Lost connection" modal's "Reload" button. */
		reload: function() { window.location.reload(); },
	}

}).$mount('#app');

// Setup tooltips on page load
$(function () {
	$('[data-toggle="tooltip"]').tooltip();
});

/** Function to turn on or off loading modal dialog over the application.
 * @param {boolean} v Set to `true` to show loading, `false` to hide.
*/
function applicationLoading(v) {
	jQuery('#app-loading-modal').modal(v ? "show" : "hide");
}