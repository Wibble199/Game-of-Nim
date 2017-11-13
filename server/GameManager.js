const GameInstance = require('./GameInstance');

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
		var f = MessageHandlers[message.event];
		f && f.call(this, message, socket);
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
		// TODO: close active game if there is one
		var user = this.sockets[socketId].username;
		this.sockets[socketId] = null;
		this.sendChatMessage("SYSTEM", `${user} has disconnected.`);
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
			player1: g.player1.username,
			player2: g.player2 == null ? "Nobody" : g.player2.username
		} : {
			event: "game-status-update",
			gameId,
			gameClosed: true
		};
		typeof targetSocket == "number" ? this.sendMessage(payload, targetSocket) : this.broadcast(payload);
	}
}


/** Handler dictionary for any received messages.
 * @type {Object.<string,(any,socket WebSocketEntry)=>void>}
*/
const MessageHandlers = {

// Lobby/chat functions
	"lobby-join"(message, socket) {
		socket.username = message.username;
		this.sendChatMessage("SYSTEM", `${message.username} has connected.`);
		this.sendMessage({ event: "lobby-join", success: true }, socket.id);
		this.games.forEach((g, i) => g != null && this.pushGameUpdate(i)); // Push the game lobbies to the newly-connected client
	},
	"chat-message"(message, socket) { message.message && this.sendChatMessage(socket.username, message.message) },
	
// Game instance functions
	"game-create"(message, socket) {
		if (message.difficulty === undefined || message.opponentType === undefined)
			this.sendMessage({ event: "game-create", success: false }, socket.id);
		else {
			var g = new GameInstance(socket, null, message.difficulty == "easy" ? "easy" : "hard");
			this.games.push(g);
			this.pushGameUpdate(this.games.length - 1); // Push new lobby to all clients

			socket.game = this.games.length - 1; // Assign the current socket to the relevant game
			this.sendMessage({ event: "game-create", success: true }, socket.id);

			if (message.opponentType == "ai") {
				// TODO: Immediately start game
			}
		}
	},
	"game-join"(message, socket) {

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
	}
}


// Export
module.exports = {
	GameManager,
	WebSocketEntry
};