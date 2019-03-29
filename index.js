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

// Start.
IO.on('connection', (client) => {
  client.on('newPlayer', (username) => {
    game.players.push({
      username: username,
      score: 0
    });
    IO.emit('updatedGame', game);
  });
  client.on('playerDisconnect', (username) => {
    // Remove player.
    game.players.splice(game.players.findIndex((x) => x.username === username), 1);
    IO.emit('updatedGame', game);

    // If everyone is gone.
    if(game.players.length === 0) {
      game = defaultGame;
    }
  });
});
SERVER.listen(PORT);
