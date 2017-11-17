const {WebSocketEntry} = require('./GameManager');

/** The numbers that the AI will attempt to lower the marble count to. */
const AI_TARGET_NUMBERS = [1,2,3,4,5,6].map(n => Math.pow(2, n) - 1);

/** Handles a single game of Nim. */
class GameInstance {
	/**
	 * Creates a new instance to handle and run a single game of Nim.
	 * @param {WebSocketEntry} player1 The first player of the game.
	 * @param {WebSocketEntry} player2 The second player of the game (or null for AI).
	 * @param {"easy"|"hard"} diff The difficulty of this game.
	 * @param {boolean} useAI Whether to use an AI player in place of player 2.
	 */
	constructor(player1, player2, diff, useAI) {
		if (player1 == null) throw "Invalid value for player1";

		this.difficulty = diff;
		this.players = [player1, player2];
		this.aiOpponent = useAI;

		/** @type {"in-lobby"|"in-game"|"game-over"} */
		this.gameState = "in-lobby";
	}

	/** Gets the maximum amount of marbles allowed to be removed based on the current count. */
	get maxMarbleRemoveAmount() {
		return Math.max(Math.floor(this.marbles / 2), 1);
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
		this.gameState = "in-game";
		this.sendGameUpdate("game-start");

		// If playing with an AI turn, and it is AI to play first, play the AI move
		if (this.currentPlayer == 1 && this.aiOpponent)
			this.playAITurn();
	}

	/** Ends a game. To be called when a user leaves or disconnects.
	 * @param {WebSocketEntry} terminatingPlayer The player that has ended the
	*/
	terminate(terminatingPlayer) {
		var terminatingPlayerIndex = this.players.indexOf(terminatingPlayer);
		this.currentPlayer = -1; // Not any player's turn

		// Send a message to the user that didn't initiate the termination to inform them it has happened
		this.sendMessage({ event: "game-terminate" }, terminatingPlayerIndex == 0 ? 1 : 0);
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
		if (typeof marbleAmount != "number" || marbleAmount % 1 != 0 || marbleAmount < 1 || marbleAmount > this.maxMarbleRemoveAmount) {
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

			// If player 2 is an AI, invoke the AI turn
			if (this.aiOpponent)
				this.playAITurn();
		}
	}

	/** Plays an AI's turn.
	 * The AI attempts to make the marble count a power of 2 minus 1. If it can't, it will make a random legal move. */
	playAITurn() {
		/* Loop through all the predtermined numbers the AI should end it's turn on and see if there are any that are in
		a playable range (atleast one below the current marble count [you must take atleast one marble] and no more
		than half the current marble count [cannot take more than half marbles]).
		`some` function will run a consumer function on each item in an array and return true if atleast one of the
		calls to the consumer function returns true (and not run on any subsequent items in the array). */
		var marblesToTake;
		var foundTarget = AI_TARGET_NUMBERS.some(n => {
			// If we find a valid target amount of marbles, 
			if (n <= this.marbles - 1 && n >= this.marbles - this.maxMarbleRemoveAmount) {
				marblesToTake = this.marbles - n;
				return true;
			}
			return false;
		});

		// If we did not find a valid target amount of marbles, play any random legal move.
		if (!foundTarget)
			marblesToTake = Math.floor(Math.random() * this.maxMarbleRemoveAmount + 1);

		// Perform the action after a delay to give the impression the AI is 'thinking'.
		setTimeout(() => this.playTurn(1, marblesToTake), 1500);
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
 * @type {Object.<string,(message:any,socket:WebSocketEntry)=>void>}
*/
const GameInstanceMessageHandlers = {
	"play-turn"(message, socket) {
		var playerIndex = this.players.indexOf(socket);
		this.playTurn(playerIndex, message.marbles);
	}
};

// Export
module.exports = {GameInstance, GameInstanceMessageHandlers};