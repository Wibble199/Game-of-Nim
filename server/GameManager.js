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
		switch (message.event) {
			case "lobby-join":
				this.sockets[socketId].username = message.username;
				this.sendMessage({event: "lobby-join", success: true}, socketId);
				break;
		}
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
	 * Handles a client disconnecting, whether purposeful or because of an error.
	 * @param {number} socketId ID number of the socket that has disconnected.
	 */
	disconnectClient(socketId) {
		if (!this.sockets[socketId]) return;
		// close active game if there is one
		this.sockets[socketId] = null;
	}
}

/** Structure to store metadata for a WebSocket. */
class WebSocketEntry {
	/**
	 * @param {WebSocket} ws
	 */
	constructor(ws) {
		this.socket = ws;
		this.id = -1;
		this.username = "";
		this.game = null;
	}
}

module.exports = GameManager;