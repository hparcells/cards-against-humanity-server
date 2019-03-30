const PORT = 3000;
const SERVER = require('http').createServer();
const IO = require('socket.io')(SERVER);

// The game.
const defaultGame = {
  players: [],
  gameState: {
    cards: [],
    blackCards: [],
    czar: 0
  }
}
let game = {
  players: [],
  gameState: {
    cards: [],
    blackCards: [],
    czar: 0
  }
}
let started = false;

// Start.
IO.on('connection', (client) => {
  client.on('newPlayer', (username) => {
    game.players.push({
      username: username,
      score: 0,
      hand: []
    });

    // Update the client's states.
    IO.emit('updatedGame', game);
    console.log(`Player ${username} connected.`);
  });
  client.on('playerDisconnect', (username) => {
    // Remove player.
    game.players.splice(game.players.findIndex((x) => x.username === username), 1);
    IO.emit('updatedGame', game);
    console.log(`Player ${username} disconnected.`);

    // If there is not enough people to join.
    if(game.players.length < 4 && started) {
      resetGame();
    }
  });
});
SERVER.listen(PORT);

function resetGame() {
  game = defaultGame;
}