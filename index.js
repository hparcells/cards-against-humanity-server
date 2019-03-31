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
  },
  started: false
}

// Start.
IO.on('connection', (client) => {
  client.on('newPlayer', (username) => {
    console.log(`Player ${username} connected.`);
    // Check if the username already exists.
    for(const player of game.players) {
      if(username === player.username) {
        console.log(`Player ${username} tried to join, but username already exists.`);
        client.emit('usernameExists');
        client.disconnect();
        return;
      }
    }
    
    // Add player to game.
    game.players.push({
      username: username,
      score: 0,
      hand: []
    });

    // Update the client states.
    IO.emit('updatedGame', game);
  });
  client.on('start', () => {
    game.started = true;

    // TODO: Distribute cards.
    IO.emit('updatedGame', game);
  })
  client.on('playerDisconnect', (username) => {
    // Remove player.
    game.players.splice(game.players.findIndex((x) => x.username === username), 1);
    IO.emit('updatedGame', game);
    console.log(`Player ${username} disconnected.`);

    // If there is not enough people to join.
    if(game.players.length < 4 && game.started) {
      resetGame();
    }
  });
});
SERVER.listen(PORT);
console.log(`Server started. Listening on port ${PORT}.`);


function resetGame() {
  game = defaultGame;
  // TODO: Emit restart event.
  // TODO: Disconnect all clients.
}
