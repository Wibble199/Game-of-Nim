const GameInstance = require('./GameInstance');

/** Manages creation and messages for GameInstances. */
class GameManager {
	/**
	 * Creates a new manager.
	 */
	constructor(wss) {
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
		console.log("Message", message, socketId);
		if (!this.sockets[socketId]) return;
		console.log("SENDING NOW");
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
}


/** Handler dictionary for any received messages.
 * @type {Object.<string,(any,socket WebSocketEntry)=>void>}
*/
const MessageHandlers = {
	"chat-message"(message, socket) { message.message && this.sendChatMessage(socket.username, message.message) },

	"lobby-join"(message, socket) {
		socket.username = message.username;
		this.sendChatMessage("SYSTEM", `${message.username} has connected.`);
		this.sendMessage({ event: "lobby-join", success: true }, socket.id);
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
		this.game = null;
	}
}

module.exports = GameManager;