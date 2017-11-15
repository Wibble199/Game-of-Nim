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
		// Randomly choose amount of marbles
		var max = this.difficulty == "easy" ? 20 : 100;
		this.marbles = Math.floor(Math.random() * (max - 1) + 2);

		// Randomly choose the starting player
		this.currentPlayer = Math.round(Math.random());

		// Send data to the players
		this.sendGameUpdate("game-start");
	}

	/** Plays a player's turn.
	 * @param {number} player The player who played the move.
	 * @param {number} marbleAmount The amount of marbles the player moved.
	 */
	playTurn(player, marbleAmount) {
		// Check to see if the correct player is making the move.
		if (player != this.currentPlayer) {
			this.sendMessage({ event: "play-turn", success: false, reason: "It is not your turn to play." }, player);
			return;
		}

		// Guard to ensure we are getting an integer value and the player is removing the correct amount of marbles (atleast 1, at most half)
		if (typeof marbleAmount != "number" || marbleAmount % 1 != 0 || marbleAmount < 1 || marbleAmount > Math.ceil(this.marbles / 2)) {
			this.sendMessage({ event: "play-turn", success: false, reason: "You attempted to take an invalid amount of marbles." }, player);
			return;
		}

		// Update marble count and player
		this.marbles -= marbleAmount;
		this.currentPlayer = this.currentPlayer == 0 ? 1 : 0;

		// If there are no marbles left, the game is over
		if (this.marbles == 0) {
			this.sendMessage({ event: "game-over", win: player != 0 }, 0); // Player wins if they are NOT the player who just made the move
			this.sendMessage({ event: "game-over", win: player != 1 }, 1);

		} else {
			this.sendGameUpdate("game-update");
		}
	}

	/** Sends an update containing the player whose turn it is and the number of marbles to both players.
	 * @param {"game-start"|"game-update"} evtType The type of event to send.
	*/
	sendGameUpdate(evtType) {
		var basePayload = { event: evtType, marbles: this.marbles };
		this.sendMessage(Object.assign({}, basePayload, { yourTurn: this.currentPlayer == 0 }), 0);
		this.sendMessage(Object.assign({}, basePayload, { yourTurn: this.currentPlayer == 1 }), 1);
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
	"play-turn"(message, socket) {
		var playerIndex = this.players.indexOf(socket);
		this.playTurn(playerIndex, message.marbles);
	}
};

// Export
module.exports = {GameInstance, GameInstanceMessageHandlers};