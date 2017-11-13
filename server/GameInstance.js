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
		this.player1 = player1;
		this.player2 = player2;
	}
};

module.exports = GameInstance;