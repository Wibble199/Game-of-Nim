const {GameInstance, GameInstanceMessageHandlers} = require('./GameInstance');

/** Manages creation and messages for GameInstances. */
class GameManager {
	/**
	 * Creates a new manager.
	 */
	constructor() {
		/** @type {WebSocketEntry[]} */
		this.sockets = [];
		/** @type {GameInstance[]} */
		this.games = [];
	}

	/**
	 * Handles connection of a new client. Returns assigned socket ID.
	 * @param {WebSocket} ws Socket that has been connected.
	 * @returns {number} Assigned socket ID.
	 */
	connectClient(ws) {
		var entry = new WebSocketEntry(ws);
		this.sockets.push(entry);
		return entry.id = this.sockets.length - 1; // Assign ID to entry and return ID
	}

	/**
	 * Handles receiving a message from a WebSocket.
	 * @param {*} message JSON message that has been received.
	 * @param {number} socketId ID number of the socket that sent the message.
	 */
	receiveMessage(message, socketId) {
		var socket = this.sockets[socketId];

		// Attempt to handle the message in the manager
		var f = MessageHandlers[message.event];
		if (f)
			f.call(this, message, socket);

		// Otherwise try to pass the message to a relevant GameInstance
		else if (socket.game !== null && this.games[socket.game]) {
			f = GameInstanceMessageHandlers[message.event];
			f && f.call(this.games[socket.game], message, socket);
		}
	}

	/**
	 * Sends a message to a particular socket.
	 * @param {*} message JSON message to be sent.
	 * @param {number} socketId ID number of the socket to send the message to.
	 */
	sendMessage(message, socketId) {
		if (!this.sockets[socketId]) return;
		this.sockets[socketId].socket.send(JSON.stringify(message));
	}

	/**
	 * Sends a JSON message to all sockets currently connected.
	 * @param {*} message JSON message to be sent to clients.
	 */
	broadcast(message) {
		var messageStr = JSON.stringify(message);
		this.sockets.forEach(wes =>
			wes && wes.socket.send(messageStr)
		);
	}

	/**
	 * Handles a client disconnecting, whether purposeful or because of an error.
	 * @param {number} socketId ID number of the socket that has disconnected.
	 */
	disconnectClient(socketId) {
		if (!this.sockets[socketId]) return;
		
		// Close active game if there is one
		var gameIndex = this.sockets[socketId].game;
		if (gameIndex != null) {
			this.games[gameIndex].terminate(this.sockets[socketId]);
			this.games[gameIndex] = null;
		}

		// Store username for use later
		var user = this.sockets[socketId].username;

		// Delete reference to the WebSocketEntry
		this.sockets[socketId] = null;
		
		// These have to be called AFTER setting the socket entry to be null otherwise it
		// attempts to broadcast to a closed socket.
		this.sendChatMessage("SYSTEM", `${user} has disconnected.`); // Announce disconnection to other clients
		if (gameIndex != null) // Announce game lobby update to other clients
			this.pushGameUpdate(gameIndex);
	}


	/**
	 * Wrapper function to broadcast a chat message to all sockets.
	 * @param {string} from The author of the message.
	 * @param {string} message The chat message contents.
	 */
	sendChatMessage(from, message) {
		this.broadcast({event: "chat-message", message: {
			time: Date.now(),
			from,
			message
		}});
	}


	/** Sends a game-lobby status update to the target socket (or broadcasts update to all sockets if target is not provided).
	 * @param {number} gameId The ID of the game whose status should be sent.
	 * @param {number?} targetSocket The socket to update. Set to non-number to broadcast to all sockets.
	*/
	pushGameUpdate(gameId, targetSocket) {
		var g = this.games[gameId]; // Shortcut to the game to broadcast
		var payload = g !== null ? {
			event: "game-status-update",
			gameId,
			player1: g.players[0].username,
			player2: g.aiOpponent ? "AI" : (g.players[1] == null ? "Nobody" : g.players[1].username),
			gameState: g.gameState
		} : {
			event: "game-status-update",
			gameId,
			gameClosed: true
		};
		typeof targetSocket == "number" ? this.sendMessage(payload, targetSocket) : this.broadcast(payload);
	}
}


/** Handler dictionary for any received messages.
 * @type {Object.<string,(message:any,socket:WebSocketEntry)=>void>}
*/
const MessageHandlers = {

// Lobby/chat functions
	"lobby-join"(message, socket) {
		socket.username = message.username;
		this.sendChatMessage("SYSTEM", `${message.username} has connected.`);
		this.sendMessage({ event: "lobby-join", success: true }, socket.id);
		this.games.forEach((g, i) => g != null && this.pushGameUpdate(i)); // Push the game lobbies to the newly-connected client
	},
	"chat-message"(message, socket) {
		message.message && this.sendChatMessage(socket.username, message.message)
	},
	
// Game instance functions
	"game-create"(message, socket) {
		if (message.difficulty === undefined || message.opponentType === undefined)
			this.sendMessage({ event: "game-create", success: false }, socket.id);
		else {
			var newGame = new GameInstance(socket, null, message.difficulty == "easy" ? "easy" : "hard", message.opponentType == "ai");
			var newGameId = this.games.length;

			this.games.push(newGame);
			this.pushGameUpdate(newGameId); // Push new lobby to all clients

			socket.game = newGameId; // Assign the current socket to the relevant game
			this.sendMessage({ event: "game-create", success: true, gameId: newGameId }, socket.id);

			if (message.opponentType == "ai")
				newGame.start();
		}
	},
	"game-join"(message, socket) {
		/** @type {GameInstance} */
		var gameToJoin = this.games[message.id];
		if (gameToJoin && !gameToJoin.aiOpponent && gameToJoin.gameState == "in-lobby" && gameToJoin.players[1] === null) { // If there is a game with this id, it's not in progress and there is a space for player2, allow the user to join		
			
			// Check to see if the user is currently in a game or lobby
			/** @type {GameInstance} */
			var origGame = this.games[socket.game];
			if (origGame) {
				if (origGame.gameState == "in-lobby") {
					// Original game is in lobby, so close the game
					this.games[socket.game] = null;
					this.pushGameUpdate(socket.game);
					
				} else {
					// Game is still in progress, so disallow leaving
					this.sendMessage({ event: "game-join", success: false, reason: "You cannot join a new game while you are currently in a game." }, socket.id);
					return;
				}
			}

			// Actually add the user to the game they've elected to join
			socket.game = message.id;
			gameToJoin.players[1] = socket;
			gameToJoin.start(); // since there are now two players, start the game
			this.pushGameUpdate(message.id); // Update lobby to all clients
			this.sendMessage({ event: "game-join", success: true }, socket.id);

		} else
			this.sendMessage({ event: "game-join", success: false, reason: "Tried to join an invalid game." }, socket.id);
	},
	"game-leave"(message, socket) {
		var g = this.games[socket.game];
		
		// Terminate and remove game and announce update to clients
		if (g) g.terminate(socket);
		this.games[socket.game] = null;
		this.pushGameUpdate(socket.game);

		// Clear the socket's game and respond
		socket.game = null;
		this.sendMessage({ event: "game-leave", success: true }, socket.id);
	}
};


/** Structure to store metadata for a WebSocket. */
class WebSocketEntry {
	/**
	 * @param {WebSocket} ws
	 */
	constructor(ws) {
		this.socket = ws;
		this.id = -1;
		this.username = "User";
		/** @type {number} */
		this.game = null;
		this.rematchVote = false;
	}
}


// Export
module.exports = {
	GameManager,
	WebSocketEntry
};