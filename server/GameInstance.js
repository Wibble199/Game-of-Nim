const {WebSocketEntry} = require('./GameManager');

/** Handles a single game of Nim. */
class GameInstance {
	/**
	 * Creates a new instance to handle and run a single game of Nim.
	 * @param {WebSocketEntry} player1 The first player of the game.
	 * @param {WebSocketEntry} player2 The second player of the game (or null for computer).
	 * @param {"easy"|"hard"} diff The difficulty of this game.
	 */
	constructor(player1, player2, diff) {
		if (player1 == null) throw "Invalid value for player1";

		this.difficulty = diff;
		this.players = [player1, player2];
		this.inProgress = false;
	}

	/**
	 * Starts the game.
	 */
	start() {
		var startPayload = { event: "game-start" };
		this.sendMessage(startPayload, 0);
		this.sendMessage(startPayload, 1);
	}

	/**
	 * Sends a message to a particular player.
	 * @param {*} message JSON message to be sent.
	 * @param {number} player Zero-indexed player to send the message to (will silently do nothing if AI player is specified).
	 */
	sendMessage(message, player) {
		this.players[player] && this.players[player].socket.send(JSON.stringify(message));
	}
};

/** Handler dictionary for any received messages (called from the GameManager class).
 * @type {Object.<string,(any,socket WebSocketEntry)=>void>}
*/
const GameInstanceMessageHandlers = {
};

// Export
module.exports = {GameInstance, GameInstanceMessageHandlers};