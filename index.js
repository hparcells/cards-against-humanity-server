const fs = require('fs');

const PORT = 3000;
const SERVER = require('http').createServer();
const IO = require('socket.io')(SERVER);

// The game.
const defaultGame = {
  players: [],
  gameState: {
    cards: [],
    blackCards: [],
    czar: 0,
    blackCard: {},
    playedWhiteCards: [],
    czarReady: false,
    czarHasPicked: false
  },
  started: false
};
let game = {
  players: [],
  gameState: {
    cards: [],
    blackCards: [],
    czar: 0,
    blackCard: {},
    playedWhiteCards: [],
    czarReady: false,
    czarHasPicked: false
  },
  started: false
};

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
    console.log(`Starting game with ${game.players.length} players.`);

    // Get the deck.
    const contents = fs.readFileSync('./sets/base.json');
    const jsonContent = JSON.parse(contents);
    
    // Shuffle the decks.
    // Borrowed from https://stackoverflow.com/a/2450976/10194810.
    function shuffle(array) {
      let currentIndex = array.length, temporaryValue, randomIndex;
    
      while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }
      return array;
    }
    game.gameState.blackCards = shuffle(jsonContent.blackCards);
    game.gameState.cards = shuffle(jsonContent.whiteCards);

    // Deal cards.
    for(const player of game.players) {
      for(let i = 0; i < 10; i++) {
        player.hand.push(game.gameState.cards[0]);
        game.gameState.cards.shift();
      }
    }

    // Chose black card.
    game.gameState.blackCard = game.gameState.blackCards[0];
    game.gameState.blackCards.shift();
    
    game.started = true;
    IO.emit('updatedGame', game);
    console.log('Game started.');
  });
  client.on('playedCard', (username, cardString) => {
    // Add new object to playedWhiteCards.
    if(!game.gameState.playedWhiteCards.find((object) => {
      return object.username === username;
    })) {
      game.gameState.playedWhiteCards.push({
        cards: [],
        username: username
      });
    }
    game.gameState.playedWhiteCards.find((object) => {
      return object.username === username;
    }).cards.push(cardString);

    const clientIndex = game.players.indexOf(game.players.find((player) => {
      return username === player.username;
    }));
    
    // Remove card from client hand.
    game.players[clientIndex].hand = game.players[clientIndex].hand.filter((value) => value !== cardString);
    // Add new card.
    game.players[clientIndex].hand.push(game.gameState.cards[0]);
    game.gameState.cards.shift();

    let playedCards = 0;
    for(const player of game.gameState.playedWhiteCards) {
      playedCards += player.cards.length;
    }
    game.gameState.czarReady = playedCards === (game.players.length - 1) * game.gameState.blackCard.pick;

    IO.emit('updatedGame', game);
  });
  client.on('czarPicked', (username) => {
    const clientIndex = game.players.indexOf(game.players.find((player) => {
      return username === player.username;
    }));
    
    // Increase the score by one.
    game.players[clientIndex].score++;
    game.gameState.czarHasPicked = true;

    // Check for winner.
    for(const player of game.players) {
      if(player.score === 10) {
        IO.emit('winner', player.username, game.players);
        console.log(`${player.username} won the game. Resetting.`);
        resetGame();
        return;
      }
    }

    IO.emit('roundWinner', username);
    IO.emit('updatedGame', game);

    setTimeout(() => {
      if(game.gameState.czar === game.players.length - 1) {
        game.gameState.czar = 0;
      }else {
        game.gameState.czar++;
      }
      game.gameState.czarReady = false;
      game.gameState.czarHasPicked = false;
      game.gameState.playedWhiteCards = [];

      game.gameState.blackCard = game.gameState.blackCards[0];
      game.gameState.blackCards.shift();

      IO.emit('updatedGame', game);
      console.log('New round.');
    }, 3000);
  });
  client.on('playerDisconnect', (username) => {
    // Remove player.
    game.players.splice(game.players.findIndex((x) => x.username === username), 1);
    IO.emit('updatedGame', game);
    console.log(`Player ${username} disconnected.`);

    // If there is not enough people to join.
    if(game.players.length < 4 && game.started) {
      console.log('Not enough players connected. Ending game.');
      IO.emit('gameEndNotEnoughPlayers');
      resetGame();
    }
  });
});
SERVER.listen(PORT);
console.log(`Server started. Listening on port ${PORT}.`);


function resetGame() {
  // Reset game.
  game = defaultGame;

  console.log('Game reset!');
}
