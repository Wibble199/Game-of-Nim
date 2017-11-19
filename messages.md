# Messages

The messages between the client and server are sent as JSON-encoded strings. Each object must have an `event` property which determines the main purpose of that messages. Depending on the type of event it may have additional data.

This document details the different events that are sent by the client/server and what additional properties they should have.

## heartbeat
#### When sent by client
*Not used*

#### When sent by server
Requests the client to respond with a `beat` to ensure that it has not been disconnected.

*No additional properties*

## beat
#### When sent by client
Used to respond to a server's `heartbeat` request.

*No additional properties*

#### When sent by server
*Not used*

## lobby-join
#### When sent by client
Used when the client moves from the initial welcome screen to the lobby after entering their desired username.

Property name|Property type|Description
-|-|-
username|*string*|The name the user has chosen.

#### When sent by server
Used to indicate to the client that the request to join the lobby has succeeded or not.

Property name|Property type|Description
-|-|-
success|*boolean*|Whether the server was successful in adding the client to the lobby.

## chat-message
#### When sent by client
Sent by the client when the user attempts to broadcast a message.

Property name|Property type|Description
-|-|-
message|*string*|The message the user has typed.

#### When sent by server
Sent when a chat message has been received from another user.

Property name|Property type|Description
-|-|-
message|*object*|Container object (to make it easier to add to the client-side array)
message.time|*number*|The numerical timestamp when this message was sent
message.from|*string*|The name of the user that sent the message.
message.message|*string*|The contents of the received message.

## game-create
#### When sent by client
Sent when the client wishes to create a new game instance.

Property name|Property type|Description
-|-|-
difficulty|*"easy"&#124;"hard"*|Whether to start a game with up to 20 marbles (easy) or up to 100 (hard).
opponentType|*"ai"&#124;"human"*|Whether the player wishes to play against another human or the server-side AI.

#### When sent by server
Sent to a client to confirm that the newly requested game has been created or that it has failed to be created.

Property name|Property type|Description
-|-|-
success|*boolean*|Whether the operation was successful or not.
gameId|*number*|*(Only when success = true)* The ID of the newly created game.
reason|*string*|*(Only when success = false)* The reason the server didn't create a new lobby.

## game-join
#### When sent by client
Sent by the client to indicate to the server that the client wishes to join a specific game.

Property name|Property type|Description
-|-|-
id|*number*|The ID of the game the client wishes to join.

#### When sent by server
Sent by the server in response to a client requesting to join a game.

Property name|Property type|Description
-|-|-
success|*boolean*|Whether the operation in joining the game was successful.
reason|*string*|*(Only when success = false)* The reason the server could not allow the client to join the game.

## game-status-update
#### When sent by client
*Not used*

#### When sent by server
Broadcasted to all clients when a game updates. The update can be triggered by: game creation, player joining game, player disconnecting and game closing.

Property name|Property type|Description
-|-|-
gameId|*number*|The game ID to update
gameClosed|*true*|*(Not always present)* Only present if the game was open and has now been closed.
player1|*string*|*(Only present if gameClosed is not)* The name of the first player in the game.
player2|*string*|*(Only present if gameClosed is not)* The name of the second player in the game.
gameState|*"in-lobby"&#124;"in-game"&#124;"game-over"*|*(Only present if gameClosed is not)* The current state of the game.

## game-start
#### When sent by client
*Not used*

#### When sent by server
Sent by the server to the players of a specific game to tell the client that their game has begun. Does not broadcast to all connected clients, only the one/two playing the game.

Will also be sent when a rematch begins.

Property name|Property type|Description
-|-|-
marbles|*number*|The number of marbles the game begins with.
yourTurn|*boolean*|Whether it is this particular client's turn or not.

## game-update
#### When sent by client
*Not used*

#### When sent by server
Broadcast to all players by the server when a client plays a valid move.

Property name|Property type|Description
-|-|-
marbles|*number*|The number of marbles that are still in play.
yourTurn|*boolean*|Whether it is this particular client's turn or not.

## play-turn
#### When sent by client
Sent to the server when a user wishes to make a turn and remove a certain number of marbles from play.

Property name|Property type|Description
-|-|-
marbles|*number*|The number of marbles the player wishes to remove.

#### When sent by server
Sent as a response to the client only when their move was illegal. On a legal move, the server will instead broadcast `game-update` to both players.

Property name|Property type|Description
-|-|-
success|*false*|
reason|*string*|The reason that the move was invalid or unsuccessful.

## game-over
#### When sent by client
*Not used*

#### When sent by server
Sent when a game ends (when the amount of marbles reaches 0).

Property name|Property type|Description
-|-|-
ai|*boolean*|Whether or not the player was playing against an AI (used to change the rematch text).
win|*boolean*|Whether the client won (true) or lost (false).

## game-leave
#### When sent by client
Sent by the client when the client wishes to:
* Cancel a lobby they created and are waiting on another player for
* Forfeit an in-progress game
* Choose not to rematch once a game finished.

The server will need to infer the correct context and perform accordingly.

*No additional properties*

#### When sent by server
Sent in response to a client request to leave the game.

Property name|Property type|Description
-|-|-
success|*boolean*|Indication of whether the client left the game successfully.

## game-terminate
#### When sent by client
*Not used*

#### When sent by server
Sent whenever a game is closed without being in a game-over state.

This occurs when a player of a game forfeits or disconnects before finishing a game.

*No additional properties*

## rematch-vote
#### When sent by client
Sent by a client when they have decided they want to rematch at the end of a game.

Property name|Property type|Description
-|-|-
vote|*true*|

#### When sent by server
Sent to a player's opponent when that player decides to vote on a rematch or when the player leaves at the end of a game.

Property name|Property type|Description
-|-|-
opponentVote|*boolean*|Whether the client's opponent has voted for a rematch (true) or when the opponent has chosen to return to lobby or disconnect after a match has ended (false) and therefore cannot rematch.