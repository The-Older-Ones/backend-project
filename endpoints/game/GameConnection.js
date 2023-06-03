const GameService = require("./GameServices")
const jwt = require('jsonwebtoken');
const config = require("config");

let gameSocket;
const lobbys = {};
const position = {};

const connection = (io) => {

  io.on("connect", playerSocket => {
    gameSocket = playerSocket;

    //------- socket.on all handler -------//

    playerSocket.on("createGame", createGame);
    playerSocket.on("disconnect", disconnect);
    playerSocket.on("joinLobby", joinLobby);
    playerSocket.on("updateHost", updateHost);

    //----------------New--------------------

    playerSocket.on("setRounds", setRounds);
    playerSocket.on("setPlayerNumber", setPlayerNumber);
    playerSocket.on("startGame", startGame);
    playerSocket.on("giveQuestion", giveQuestion);
    playerSocket.on("setAnswer", setAnswer);
    playerSocket.on("setExtension", setExtension);
    playerSocket.on("newGame", newGame);

    //------- socket.on all handler -------//
    playerSocket.emit("connected", { message: "Connected successfully" });
  });
}

async function createGame(data) {
  const hostName = data.playerName;
  const token = data.token;

  if (!hostName) {
    this.emit("error", { message: "data.playerName is not set", type: "critical" })
    return;
  }

  let verify = authenticated(token);
  if (verify.error) {
    this.emit("error", { message: verify.error, type: "warning" })
    verify = false;
  }

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeCharacter = 9;
  let code = "";
  let checkedGameID = false;

  do {
    for (let i = 0; i < codeCharacter; i++) {
      const randomCode = Math.floor(Math.random() * characters.length);
      code += characters[randomCode];
    }
    if (!lobbys[code]) {
      checkedGameID = true;
    }

  } while (!checkedGameID)

  if (position[this.id]) {
    disconnect({ id: this.id });
  }
  try {
    let list = await GameService.getCategoryList();

    position[this.id] = code;
    
    lobbys[code] = {
      player: {
        [this.id]: {
          socket: this,
          name: hostName,
          auth: verify,
          points: 0
        }
      },
      list : list,
      locked: false,
      host: this.id,
      playerNumber: config.game.defaultPlayerNumber,
      rounds: config.game.defaultRounds,
      extension: false
    };

    const settings = {
      list: list,
      playerNumber: lobbys[code].playerNumber,
      rounds: lobbys[code].rounds
    }
    //Zusatz FE hostname
    this.emit("gameCreated", { gameId: code, socketId: this.id, hostName: hostName, settings: settings });
    this.join(code);
  } catch (error) {
    this.emit("error", { message: error.message, type: "critical" })
  }
}

function disconnect(data) {

  const socket = data.socket ? data.socket : this;

  const room = position[socket.id];

  if (!room) {
    console.log("Player left Game")
    return;
  }

  delete lobbys[room].player[socket.id];

  console.log("Player left Lobby " + room)

  const checkEmptiness = Object.keys(lobbys[room].player).length;

  if (checkEmptiness === 0) {
    delete lobbys[room];
    delete position[socket.id];
    console.log("Closed Lobby: " + room)
    return;
  }

  if (checkEmptiness === 1 && lobbys[room].locked) {
    reset(room)
  }

  if (socket.id == lobbys[room].host) {
    updateHost({ socket: socket })
  }

  delete position[socket.id];

  gameSocket.to(room).emit("playerLeft", { playerId: socket.id });

  if (check(room)) {
    evaluation(room);
  }
}

function authenticated(token) {
  if (!token) {
    return false;
  }
  let verify;
  const privateKey = config.get("session.tokenKey");
  jwt.verify(token, privateKey, { algorithms: "HS256" }, function (err, result) {
    if (result) {
      verify = true;
    } else {
      verify = { error: "Token invalid" }
    }
  });
  return verify;
}

function joinLobby(data) {
  const lobbyId = data.gameId;
  const playerName = data.playerName;
  const token = data.token;

  if (typeof lobbys[lobbyId] === 'undefined' || lobbys[lobbyId].locked === true) {
    this.emit('error', { message: 'Lobby is not available', type: "critical" });
    return;
  }

  if (!playerName) {
    this.emit("error", { message: "data.playerName is not set", type: "critical" })
    return;
  }

  const playersInLobby = Object.keys(lobbys[lobbyId].player).length;

  if (playersInLobby == lobbys[lobbyId].player.playerNumber) {
    this.emit("error", { message: "Lobby is full", type: "critical" })
    return;
  }

  let verify = authenticated(token);
  if (verify.error) {
    this.emit("error", { message: verify.error, type: "warning" })
    verify = false;
  }

  if (position[this.id]) {
    disconnect({ socket: this });
  }

  const lobbyMember = {};
  Object.keys(lobbys[lobbyId].player).forEach((socketID) => {
    lobbyMember[socketID] = lobbys[lobbyId].player[socketID].name;
  });
  //Zusatz FE
  lobbyMember[this.id] = playerName;

  position[this.id] = lobbyId;

  lobbys[lobbyId].player[this.id] = {
    socket: this,
    name: playerName,
    auth: verify,
    points: 0
  }

  const settings = {
    lobbyMember: lobbyMember,
    playerNumber: lobbys[lobbyId].playerNumber,
    rounds: lobbys[lobbyId].rounds,
    list : lobbys[lobbyId].list
  }

  this.join(lobbyId);
  this.emit('joinedLobby', { gameId: lobbyId, socketId: this.id, settings: settings });
  gameSocket.to(lobbyId).emit("playerJoined", { playerId: this.id, playerName: playerName });
}

function updateHost(data) {
  const socket = data.socket ? data.socket : this;
  const room = position[socket.id];
  const newHost = data.newHost ? data.newHost : Object.keys(lobbys[room].player)[0];

  const currentHost = lobbys[room].host

  if (currentHost != socket.id) {
    socket.emit("error", { message: "No permission to change the host", type: "critical" })
    return;
  }

  if (currentHost == newHost) {
    socket.emit("error", { message: "Already host", type: "critical" });
    return;
  }

  const playerInLobby = Object.keys(lobbys[room].player).filter((id) => id == newHost).length == 1;

  if (!playerInLobby) {
    socket.emit("error", { message: "Selected player is not in the lobby", type: "critical" });
    return;
  }

  lobbys[room].host = newHost;

  console.log(lobbys[room].host);

  // Feature : User eigene Fragen.  Nochmalige DB anfrage für list + ablegen in lobbys objekt,

  gameSocket.to(room).emit("updatedHost", { newHost: newHost });
}

function setRounds(data) {
  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    this.emit("error", { message: "Not Authorized to change number of rounds", type: "critical" });
    return;
  }

  if (!data.rounds) {
    this.emit("error", { message: "data.rounds is not set. Number of rounds are unchanged", type: "critical" });
    return;
  }

  const rounds = parseInt(data.rounds);

  if (!rounds) {
    this.emit("error", { message: "data.rounds is NaN. Number of rounds are unchanged", type: "critical" });
    return;
  }

  if (lobbys[room].locked) {
    this.emit("error", { message: "Game is already locked. No changes allowed", type: "critical" })
    return;
  }

  if (rounds == lobbys[room].rounds) {
    this.emit("error", { message: `Number of rounds already set to ${rounds}`, type: "warning" });
    return;
  }

  const minRounds = config.game.minRounds;
  const maxRounds = config.game.maxRounds;

  if (rounds < minRounds) {
    this.emit("error", { message: `Selected number of rounds too low. Minimum Rounds : ${minRounds}`, type: "critical" });
    return;
  }

  if (rounds > maxRounds) {
    rounds = maxRounds;
  }

  lobbys[room].rounds = rounds;

  gameSocket.to(room).emit("updatedRounds", { rounds: rounds })

}

function setPlayerNumber(data) {
  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    this.emit("error", { message: "Not Authorized to change number of rounds", type: "critical" });
    return;
  }

  if (!data.playerNumber) {
    this.emit("error", { message: "data.playerNumber is not set. Number of players are unchanged", type: "critical" });
    return;
  }

  const playerNumber = parseInt(data.playerNumber);

  if (!playerNumber) {
    this.emit("error", { message: "data.playerNumber is NaN. Number of players are unchanged", type: "critical" });
    return;
  }

  if (lobbys[room].locked) {
    this.emit("error", { message: "Game is already locked. No changes allowed", type: "critical" })
    return;
  }
  const playersInLobby = Object.keys(lobbys[room].player).length;
  if (playerNumber < playersInLobby) {
    this.emit("error", { message: "Player number can't be changed to a number below to the players in the lobby", type: "critical" })
    return;
  }

  if (playerNumber == lobbys[room].playerNumber) {
    this.emit("error", { message: `Number of player already set to ${playerNumber}`, type: "warning" });
    return;
  }

  const minPlayer = config.game.minPlayerNumber;
  const maxPlayer = config.game.maxPlayerNumber;

  if (playerNumber < minPlayer) {
    this.emit("error", { message: `Selected number of player too low. Minimum Player : ${minPlayer}`, type: "critical" });
    return;
  }

  if (playerNumber > maxPlayer) {
    playerNumber = maxPlayer;
  }

  lobbys[room].playerNumber = playerNumber;

  gameSocket.to(room).emit("updatedPlayerNumber", { playerNumber: playerNumber })
}

function setExtension(data) {
  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    this.emit("error", { message: "Not Authorized to activate extension", type: "critical" });
    return;
  }

  if (lobbys[room].locked) {
    this.emit('error', { message: 'Game already started', type: "critical" })
    return;
  }

  lobbys[room].extension = data.extension ? true : false;

  gameSocket.to(room).emit("updatedExtension", { extension: lobbys[room].extension });
}

async function startGame(data) {
  try {
    const room = position[this.id];
    if (!room) {
      this.emit('error', { message: 'Lobby is not available', type: "critical" })
      return;
    }

    if (lobbys[room].host != this.id) {
      this.emit('error', { message: 'No permission to start the game', type: "critical" })
      return;
    }

    if (lobbys[room].locked) {
      this.emit('error', { message: 'Game already started', type: "critical" })
      return;
    }

    const playersInLobby = Object.keys(lobbys[room].player).length
    const minPlayerNumber = config.game.minPlayerNumber;

    if (playersInLobby < minPlayerNumber) {
      this.emit('error', { message: `Less than the minimum allowed. Minimum allowed is ${playerNumber}`, type: "critical" })
      return;
    }

    const list = data.list;

    if (!list || !Array.isArray(list)) {
      this.emit('error', { message: 'data.list is either not stored or it is not an array', type: "critical" })
      return;
    }

    await GameService.checkCategory(list);

    lobbys[room].locked = true;

    gameSocket.to(room).emit("startedGame");

  } catch (error) {
    gameSocket.to(room).emit("error", { message: error.message, type: "critical" });
  }
}

async function giveQuestion(data) {
  try {
    // TODO Feature Training -> auch möglich wenn valider Token mitgeliefert wird | rounds = 0 behandlung
    const room = position[this.id];
    if (!room) {
      this.emit('error', { message: 'Lobby is not available', type: "critical" })
      return;
    }

    if (!lobbys[room].locked) {
      this.emit('error', { message: 'Lobby is not locked', type: "critical" })
      return;
    }

    const category = data.category;
    const difficulty = data.difficulty;

    if (!category || !difficulty) {
      const problem = !category ? "category" : "difficulty"
      this.emit('error', { message: `${problem} is not given`, type: "critical" });
      return;
    }

    const question = await GameService.getRandomQuestion(category, difficulty);

    lobbys[room].question = question;

    const userQuestion = {
      question: question.question,
      answers: question.allAnswers
    }

    gameSocket.to(room).emit("givenQuestion", userQuestion);

  } catch (error) {
    this.emit("error", { message: error.message, type: "critical" });
  }
}

function setAnswer(data) {
  const room = position[this.id];
  if (!room) {
    this.emit('error', { message: 'Lobby is not available', type: "critical" })
    return;
  }

  if (!lobbys[room].locked) {
    this.emit('error', { message: 'Lobby is not locked', type: "critical" })
    return;
  }

  if (!data.answer) {
    this.emit('error', { message: 'No answer received', type: "critical" })
    return;
  }

  if (lobbys[room].player[this.id].answer) {
    const origAnswer = lobbys[room].player[this.id].answer
    this.emit('error', { message: `Already gave an answer: ${origAnswer}`, type: "critical" })
    return;
  }

  lobbys[room].player[this.id].answer = data.answer.toString();

  if (check(room)) {
    evaluation(room);
  } else {
    gameSocket.to(room).emit("playerAnswered", { playerId: this.id })
  }

}

function check(room) {
  const players = Object.keys(lobbys[room].player);
  let checked = true;
  players.forEach(playerId => {
    if (!lobbys[room].player[playerId].answer) {
      checked = false;
      return;
    }
  })
  return checked;
}

function reset(room) {
  lobbys[room].locked = false;
  lobbys[room].rounds = config.game.defaultRounds;

  const players = Object.keys(lobbys[room].player);
  players.forEach(playerId => {
    lobbys[room].player[playerId].points = 0;
    if (lobbys[room].player[playerId].answer) {
      delete lobbys[room].player[playerId].answer;
    }
  })

  if (lobbys[room].question) {
    delete lobbys[room].question;
  }


  const lobbyMember = {};
  Object.keys(lobbys[lobbyId].player).forEach((socketID) => {
    lobbyMember[socketID] = lobbys[lobbyId].player[socketID].name;
  });

  const settings = {
    rounds: lobbys[room].rounds,
    playerNumber: lobbys[room].playerNumber,
    lobbyMember: lobbyMember,
    extension : false
  }

  gameSocket.to(room).emit("resetLobby", { settings: settings })
}

function evaluation(room) {

  const lobbyRoom = lobbys[room];

  const result = Object.entries(lobbyRoom.player).map(([socketId,properties]) =>{
    let query = false;
    if(properties.answer == lobbyRoom.question.correct_answer){
      properties.points += parseInt(lobbyRoom.question.difficulty);
      console.log(properties.points)
      query = true;
    }
    return({
      [socketId] : {
        points : properties.points,
        answer : query
      }
    })
  }).sort((a,b) =>{
    const pointsA = Object.values(a)[0].points;
    const pointsB = Object.values(b)[0].points;
    return pointsB - pointsA;
});

  lobbyRoom.rounds--;

  if (lobbyRoom.rounds == 0 && !lobbyRoom.extension) {
    gameSocket.to(room).emit("gameFinished",{leaderboard : result});
    return;
  };

  const first = result[0].points;
  const second = result[1].points;

  if (lobbyRoom.rounds == 0 && lobbyRoom.extension && first == second) {
    lobbyRoom.rounds = config.game.maxExtension;
    delete lobbyRoom.extension;
    gameSocket.to(room).emit("extendedGame");
  };

  const status = {
    rightAnswer : lobbyRoom.question.correct_answer,
    roundsLeft : lobbyRoom.rounds,
    leaderboard : result
  }

  gameSocket.to(room).emit("roundFinished", status);
}

function newGame(data){
  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    this.emit("error", { message: "Not Authorized to initialize new game", type: "critical" });
    return;
  }

  reset(room);
}

module.exports = connection;


//_________________________________________________Notes______________________________________________________________//
/*

- lobbys {
          "LobbyCode" {
                      player : { "socketID" : {
                                                  socket : socket Obj.
                                                  name : "playername",
                                                  auth : default false,
                                                  points : initial 0,
                                                  // answer : Erst Init wenn Game Start : String
                                  },
                                  "socketID" : ...

                      },
                      list : categoryListe,
                      locked : default false,
                      host : socket.ID of the creator,
                      playerNumber : beim Spiel erstellen auf default.
                      rounds : Erst Init wenn Game Start = default or individual : Number,
                      // question : Erst Init wenn Game Start. Aktuelles Frageobj. aus DB : Obj gemapped
                      // extension : boolean

          },
}

- position {
            "socketID" : "LobbyCode"
}

- evaluation -> sendet an alle in der Lobby die auswertung von einer Frage (Hilfsmethode also nicht mit FE socket ansprechbar)

Abfrage über verbleibende Runden on T oder G
------------------------------------------------------
 Teilevaluation - nach jeder Frage/Runde 
{
  socketId : {Points,answer true?}
  socketId...
},
rightAnswer : ...,
roundsLeft : ...,
------------------------------------------------------
Gesamtevaluation - Gesamte Auswertung

[
  { '100': { points: 99999, answer: false } },
  { '999': { points: 766, answer: true } },
  { asdasd: { points: 50, answer: false } },
  { '1223': { points: 0, answer: false } }
]




*/