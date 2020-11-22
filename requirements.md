_This document is an outline of the provided specification that was to be implemented._

# Multi-player game - _The Game of Nim_
The aim of this assignment is to design and develop a multiplayer game. _The Game of Nim_ is
a well-known game that has a number of variants. You are asked to develop one of the
versions of this game that has an interesting winning strategy. Two players alternately take
marbles from a pile. In each move, the player chooses how many marbles to take at list one
and at most half of the marbles. Then the other player takes a turn. The player that takes the
last marble loses.

## Version 1:
Design and develop a distributed application that allows two players to play against each
other. Your program should:
- Generate a random integer between 2 and 20 for an ‘easy’ mode of a game and
between 2 and 100 for a ‘hard’ mode of the game, to denote the initial size of the pile.
- Generate a random integer between 0 and 1 to decide who takes the first turn
between Player 1 and Player 2.

## Additional information:
The winning strategy of this game is as following: a smart player always takes off enough
marbles to make the size of the pile a power of two minus 1, that are (for the easy mode) 3,
7, 15 and (for hard mode) also 31 and 63. That is always a legal move, except when the size
of the pile is currently one less than a power of two. In that case, the smart player makes a
random legal move.
The smart player with the above described winning strategy cannot be beaten when it has
the first move, unless the pile size happens to be 15, 31 or 63. Of course, the second player
who knows about this strategy, can still win against the smart player even if he takes the first
turn.

## Version 2 (Advanced, only for 70+ marks)
The above winning strategy can be nicely build into another version of your application when
the server acts as a smart player. This will happen when there is only one player online.
The version 2 should only be implemented after completing the version 1.
