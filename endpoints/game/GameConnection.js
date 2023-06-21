const GameService = require("./GameServices")
const jwt = require('jsonwebtoken');
const config = require("config");
const logger = require("../../logger");

let gameSocket;
const lobbys = {};
const position = {};

const connection = (io) => {

  io.on("connect", playerSocket => {
    gameSocket = io;

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
    playerSocket.on("lobbySynchro", lobbySynchro);

    //------- socket.on all handler -------//
    logger.info(`User joined : ${playerSocket.id}`)
    playerSocket.emit("connected", { message: "Connected successfully" });
  });
}

async function createGame(data) {
  logger.debug("methode : createGame called")

  const guard = guardian(data, ["playerName"]);
  if (guard) {
    this.emit("error", guard);
    return;
  }

  const hostName = data.playerName;
  const token = data.token;

  let verify = authenticated(token);
  if (verify.error) {
    logger.warn(verify.error + " token : " + token);
    this.emit("error", { message: verify.error, type: "warning" })
    verify = false;
  }

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeCharacter = config.game.codeSize;
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
    const list = await GameService.getCategoryList();

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
      list: list,
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
    logger.info("Game created successfully");
  } catch (error) {
    logger.error(error.message);
    this.emit("error", { message: error.message, type: "critical" })
  }
  logger.debug("exit methode : createGame")
}

function disconnect(data) {
  logger.debug("methode : disconnect called")

  const socket = data.socket ? data.socket : this;

  const room = position[socket.id];

  if (!room) {
    logger.info("Player left Game without enter a Lobby");
    return;
  }

  delete lobbys[room].player[socket.id];

  logger.info("Player left Lobby " + room);

  const checkEmptiness = Object.keys(lobbys[room].player).length;

  if (checkEmptiness === 0) {
    delete lobbys[room];
    delete position[socket.id];
    logger.info("Closed Lobby: " + room);
    return;
  }

  if (checkEmptiness === 1 && lobbys[room].locked) {
    reset(room);
  }

  if (socket.id == lobbys[room].host) {
    updateHost({ socket: socket })
  }

  delete position[socket.id];

  gameSocket.to(room).emit("playerLeft", { playerId: socket.id });

  if (check(room) && lobbys[room].question) {
    evaluation(room);
  }
  logger.debug("exit methode : disconnect")

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
  logger.debug("methode : joinLobby called");

  const guard = guardian(data, ["gameId", "playerName"]);
  if (guard) {
    this.emit("error", guard);
    return;
  }

  const lobbyId = data.gameId;
  const playerName = data.playerName;
  const token = data.token;

  if (typeof lobbys[lobbyId] === 'undefined' || lobbys[lobbyId].locked === true) {
    logger.error("Lobby is not available + " + lobbyId);
    this.emit('error', { message: 'Lobby is not available', type: "critical" });
    return;
  }

  const playersInLobby = Object.keys(lobbys[lobbyId].player).length;
  const lobbyMaxPlayer = lobbys[lobbyId].player.playerNumber;

  if (playersInLobby == lobbyMaxPlayer) {
    logger.error(`Lobby is full ${playersInLobby} : ${lobbyMaxPlayer}`);
    this.emit("error", { message: "Lobby is full", type: "critical" })
    return;
  }

  let verify = authenticated(token);
  if (verify.error) {
    logger.error(verify.error + " token : " + token);
    this.emit("error", { message: verify.error, type: "warning" })
    verify = false;
  }

  if (position[this.id]) {
    disconnect({ socket: this });
  }

  const lobbyMember = [];
  Object.keys(lobbys[lobbyId].player).forEach((socketId) => {
    lobbyMember.push({ socketId: socketId, playerName: lobbys[lobbyId].player[socketId].name });
  });

  lobbyMember.push({ socketId: this.id, playerName: playerName });

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
    list: lobbys[lobbyId].list
  }

  this.join(lobbyId);
  this.emit('joinedLobby', { gameId: lobbyId, socketId: this.id, settings: settings });
  this.to(lobbyId).emit("playerJoined", { playerId: this.id, playerName: playerName });
  logger.info(`Player joined Lobby successfully : ${lobbyId}`)
  logger.debug("exit methode : joinLobby")
}

function updateHost(data) {
  logger.debug("methode : updateHost called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  const socket = data.socket ? data.socket : this;
  const room = position[socket.id];

  if (!room) {
    logger.error(`Player not listed in any Lobby`)
    this.emit('error', { message: 'Not a player of this lobby', type: "critical" })
    return;
  }

  const newHost = data.newHost ? data.newHost : Object.keys(lobbys[room].player)[0];

  const currentHost = lobbys[room].host

  if (currentHost != socket.id) {
    logger.error(`No permission to change the host. Requester : ${this.id} , Host : ${currentHost}`)
    socket.emit("error", { message: "No permission to change the host", type: "critical" })
    return;
  }

  if (currentHost == newHost) {
    logger.warn(`Already host. Requester : ${this.id} , Host : ${currentHost}`)
    socket.emit("error", { message: "Already host", type: "warning" });
    return;
  }

  const playerInLobby = Object.keys(lobbys[room].player).filter((id) => id == newHost).length == 1;

  if (!playerInLobby) {
    logger.error(`Selected player is not in the lobby. Requested Host : ${newHost} , Lobbymember : ${playerInLobby}`);
    socket.emit("error", { message: "Selected player is not in the lobby", type: "critical" });
    return;
  }

  lobbys[room].host = newHost;
  logger.info(`Set new Host in Lobby :${room} successfully`);

  // Feature : User eigene Fragen.  Nochmalige DB anfrage für list + ablegen in lobbys objekt,

  gameSocket.to(room).emit("updatedHost", { newHost: newHost });
  logger.debug("exit methode : updateHost")
}

function setRounds(data) {
  logger.debug("methode : setRounds called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    logger.error(`Not Authorized to change number of rounds. Player`)
    this.emit("error", { message: "Not Authorized to change number of rounds", type: "critical" });
    return;
  }

  if (!data.rounds) {
    logger.error(`data.rounds is not set. Value : ${data.rounds}`);
    this.emit("error", { message: `data.rounds is not set. Number of rounds are unchanged. Rounds : ${lobbys[room].rounds}`, type: "critical" });
    return;
  }

  let rounds = parseInt(data.rounds);

  if (!rounds) {
    logger.error(`data.rounds is NaN. Value : ${data.rounds}`);
    this.emit("error", { message: `data.rounds is NaN. Number of rounds are unchanged. Rounds : ${lobbys[room].rounds}`, type: "critical" });
    return;
  }

  if (lobbys[room].locked) {
    logger.error(`Game is already locked. No changes allowed. Value of locked : ${lobbys[room].locked}`)
    this.emit("error", { message: "Game is already locked. No changes allowed", type: "critical" })
    return;
  }

  if (rounds == lobbys[room].rounds) {
    logger.error(`Number of rounds already set. New Value : ${rounds} , Actual Value : ${rounds}`)
    this.emit("error", { message: `Number of rounds already set to ${rounds}`, type: "warning" });
    return;
  }

  const minRounds = config.game.minRounds;
  const maxRounds = config.game.maxRounds;

  if (rounds < minRounds) {
    logger.warn(`Selected number of rounds (${rounds}) too low. Set to minimum Rounds : ${minRounds}`)
    this.emit("error", { message: `Selected number of rounds too low. Set to minimum Rounds : ${minRounds}`, type: "warning" });
    rounds = minRounds;
  }

  if (rounds > maxRounds) {
    logger.warn(`Selected number of rounds (${rounds}) too hight. Set to maximum Rounds : ${minRounds}`)
    this.emit("error", { message: `Selected number of rounds too high. Set to maximum Rounds : ${maxRounds}`, type: "warning" });
    rounds = maxRounds;
  }

  lobbys[room].rounds = rounds;
  logger.info(`Set new amount of rounds successfully to ${rounds}`)

  gameSocket.to(room).emit("updatedRounds", { rounds: rounds })
  logger.debug("exit methode : setRounds")
}

function setPlayerNumber(data) {
  logger.debug("methode : setPlayerNumber called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    logger.error(`Not Authorized to change number of rounds.`)
    this.emit("error", { message: "Not Authorized to change number of rounds", type: "critical" });
    return;
  }

  if (!data.playerNumber) {
    logger.error(`data.playerNumber is not set. Value : ${data.playerNumber}`)
    this.emit("error", { message: `data.playerNumber is not set. Number of players are unchanged. Player : ${lobbys[room].playerNumber}`, type: "critical" });
    return;
  }

  let playerNumber = parseInt(data.playerNumber);

  if (!playerNumber) {
    logger.error(`data.playerNumber is NaN. Value : ${playerNumber}`);
    this.emit("error", { message: `data.playerNumber is NaN. Number of players are unchanged. Player : ${lobbys[room].playerNumber}`, type: "critical" });
    return;
  }

  if (lobbys[room].locked) {
    logger.error(`Game is already locked. Locked : ${lobbys[room].locked}`);
    this.emit("error", { message: "Game is already locked. No changes allowed", type: "critical" })
    return;
  }
  const playersInLobby = Object.keys(lobbys[room].player).length;
  if (playerNumber < playersInLobby) {
    logger.error(`Player number can't be changed to a number below to the players in the lobby. Value : ${playerNumber} , Current : ${playersInLobby}`);
    this.emit("error", { message: "Player number can't be changed to a number below to the players in the lobby", type: "critical" })
    return;
  }

  if (playerNumber == lobbys[room].playerNumber) {
    logger.warn(`Number of player already set to current. Value : ${playerNumber} , Current : ${lobbys[room].playerNumber}`);
    this.emit("error", { message: `Number of player already set to ${playerNumber}`, type: "warning" });
    return;
  }

  const minPlayer = config.game.minPlayerNumber;
  const maxPlayer = config.game.maxPlayerNumber;

  if (playerNumber < minPlayer) {
    logger.warn(`Selected number of player (${playerNumber}) too low. Set to minimum Rounds : ${minPlayer}`)
    this.emit("error", { message: `Selected number of player too low. Set to minimum Player : ${minPlayer}`, type: "warning" });
    playerNumber = minPlayer;
  }

  if (playerNumber > maxPlayer) {
    logger.warn(`Selected number of player (${playerNumber}) too low. Set to minimum Rounds : ${maxPlayer}`)
    this.emit("error", { message: `Selected number of player too hight. Set to maximum Player : ${maxPlayer}`, type: "warning" });
    playerNumber = maxPlayer;
  }

  lobbys[room].playerNumber = playerNumber;
  logger.info(`Set new amount of player successfully to ${playerNumber}`)
  gameSocket.to(room).emit("updatedPlayerNumber", { playerNumber: playerNumber })
  logger.debug("exit methode : setPlayerNumber")
}

function setExtension(data) {
  logger.debug("methode : setExtension called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    logger.error("Not Authorized to activate extension")
    this.emit("error", { message: "Not Authorized to activate extension", type: "critical" });
    return;
  }

  if (lobbys[room].locked) {
    logger.error(`Game already started. Locked : ${lobbys[room].locked}`);
    this.emit('error', { message: 'Game already started', type: "critical" })
    return;
  }

  lobbys[room].extension = data.extension ? true : false;
  logger.info(`Set extension successfully to ${lobbys[room].extension}`)

  gameSocket.to(room).emit("updatedExtension", { extension: lobbys[room].extension });
  logger.debug("exit methode : setExtension")
}

async function startGame(data) {
  logger.debug("methode : startGame called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  try {
    const room = position[this.id];
    if (!room) {
      logger.error(`Lobby is not available`)
      this.emit('error', { message: 'Lobby is not available', type: "critical" })
      return;
    }

    if (lobbys[room].host != this.id) {
      logger.error(`No permission to start the game. Requester : ${this.id} , Host : ${lobbys[room].host}`)
      this.emit('error', { message: 'No permission to start the game', type: "critical" })
      return;
    }

    if (lobbys[room].locked) {
      logger.error('Game already started. Locked : lobbys[room].locked')
      this.emit('error', { message: 'Game already started', type: "critical" })
      return;
    }

    const playersInLobby = Object.keys(lobbys[room].player).length
    const minPlayerNumber = config.game.minPlayerNumber;

    if (playersInLobby < minPlayerNumber) {
      logger.error(`Less than the minimum allowed Player. Current : ${playersInLobby} , Minimum : ${lobbys[room].playerNumber}`)
      this.emit('error', { message: `Less than the minimum allowed Player. Minimum allowed Player are ${lobbys[room].playerNumber}`, type: "critical" })
      return;
    }

    const list = data.list;

    if (!list || !Array.isArray(list) || list.length == 0) {
      logger.error(`data.list is either not stored, an array or is an empty array. Value : ${list}`)
      this.emit('error', { message: 'data.list is either not stored or it is not an array', type: "critical" })
      return;
    }

    await GameService.checkCategory(list);

    lobbys[room].locked = true;
    logger.info(`Game ${room} successfully started`)

    gameSocket.to(room).emit("startedGame", { list: list });

  } catch (error) {
    logger.error(error.message);
    this.emit("error", { message: error.message, type: "critical" });
  }
  logger.debug("exit methode : startGame")
}

async function giveQuestion(data) {
  logger.debug("methode : giveQuestion called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  try {
    // TODO Feature Training -> auch möglich wenn valider Token mitgeliefert wird | rounds = 0 behandlung
    const room = position[this.id];

    if (!room) {
      logger.error(`Lobby is not available`)
      this.emit('error', { message: 'Lobby is not available', type: "critical" })
      return;
    }

    if (!lobbys[room].locked) {
      logger.error('Game already started. Locked : lobbys[room].locked')
      this.emit('error', { message: 'Lobby is not locked', type: "critical" })
      return;
    }

    const category = data.category;
    const difficulty = data.difficulty;

    if (!category || !difficulty) {
      const problem = !category ? "category" : "difficulty"
      logger.error(`${problem} is not given. Category value : ${category} , Difficulty value : ${difficulty}`)
      this.emit('error', { message: `${problem} is not given`, type: "critical" });
      return;
    }

    const question = await GameService.getRandomQuestion(category, difficulty);

    lobbys[room].question = question;

    const userQuestion = {
      category: question.category,
      difficulty: question.difficulty,
      question: question.question,
      allAnswers: question.allAnswers,
    };

    logger.info(`Generate question successfully`)
    gameSocket.to(room).emit("givenQuestion", userQuestion);

  } catch (error) {
    logger.error(error.message)
    this.emit("error", { message: error.message, type: "critical" });
  }
  logger.debug("exit methode : giveQuestion")
}

function setAnswer(data) {
  logger.debug("methode : setAnswer called")

  if (!data) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }
  
  const room = position[this.id];

  if (!room) {
    logger.error(`Lobby is not available`)
    this.emit('error', { message: 'Lobby is not available', type: "critical" })
    return;
  }

  if (!lobbys[room].locked) {
    logger.error('Game already started. Locked : lobbys[room].locked')
    this.emit('error', { message: 'Lobby is not locked', type: "critical" })
    return;
  }

  if (!lobbys[room].question) {
    logger.error(`No Question saved. Question : ${lobbys[room].question}`)
    this.emit('error', { message: 'No question choose', type: "critical" })
    return;
  }

  if (!data.answer) {
    logger.error(`data.answer is not set. Value : ${data.answer}`)
    this.emit('error', { message: 'data.answer is not set', type: "critical" })
    return;
  }

  if (lobbys[room].player[this.id].answer) {
    const origAnswer = lobbys[room].player[this.id].answer
    logger.error(`Already gave an answer. Current :${origAnswer} , Value : ${lobbys[room].player[this.id].answer}`)
    this.emit('error', { message: `Already gave an answer: ${origAnswer}`, type: "critical" })
    return;
  }

  lobbys[room].player[this.id].answer = data.answer.toString();
  logger.info(`Answer successfully set to ${data.answer.toString()}`);

  if (check(room)) {
    evaluation(room);
  } else {
    gameSocket.to(room).emit("playerAnswered", { playerId: this.id })
  }
  logger.debug("exit methode : setAnswer")
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
  logger.debug("methode : reset called")
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

  const lobbyMember = [];
  Object.keys(lobbys[room].player).forEach((socketId) => {
    lobbyMember.push({ socketId: socketId, playerName: lobbys[room].player[socketId].name });
  });

  const settings = {
    rounds: lobbys[room].rounds,
    playerNumber: lobbys[room].playerNumber,
    lobbyMember: lobbyMember,
    extension: false
  }

  gameSocket.to(room).emit("resetLobby", { settings: settings })
  logger.debug("exit methode : reset")
}

function evaluation(room) {
  logger.debug("methode : evaluation called")
  const lobbyRoom = lobbys[room];

  const result = Object.entries(lobbyRoom.player).map(([socketId, properties]) => {
    let query = false;
    if (properties.answer == lobbyRoom.question.correct_answer) {
      properties.points += parseInt(lobbyRoom.question.difficulty);
      query = true;
    }
    return (
      {
        socketId: socketId,
        points: properties.points,
        answer: query
      }
    )
  }).sort((a, b) => {
    const pointsA = Object.values(a)[0].points;
    const pointsB = Object.values(b)[0].points;
    return pointsB - pointsA;
  });
  logger.info(`Leaderboard successfully created for ${room}`)

  lobbyRoom.rounds--;

  if (lobbyRoom.rounds == 0 && !lobbyRoom.extension) {
    logger.info(`Game : ${room} successfully finished`)
    gameSocket.to(room).emit("gameFinished", { leaderboard: result });
    return;
  };

  const first = result[0].points;
  const second = result[1].points;

  if (lobbyRoom.rounds == 0 && lobbyRoom.extension && first == second) {
    lobbyRoom.rounds = config.game.maxExtension;
    lobbyRoom.extension = false;
    logger.info(`Game : ${room} successfully extend.`)
    gameSocket.to(room).emit("gameExtended");
  };

  const status = {
    rightAnswer: lobbyRoom.question.correct_answer,
    roundsLeft: lobbyRoom.rounds,
    leaderboard: result
  }

  delete lobbyRoom.question;
  Object.keys(lobbyRoom.player).forEach(socketId => {
    delete lobbyRoom.player[socketId].answer;
  });

  logger.info(`Round successfully finished for ${room}`)
  gameSocket.to(room).emit("roundFinished", status);
  logger.debug("exit methode : evaluation")
}

function newGame(data) {
  logger.debug("methode : newGame called")
  const room = position[this.id];

  if (!room || lobbys[room].host != this.id) {
    logger.error(`Not Authorized to initialize new game. Requester : ${this.id} , Host : ${currentHost}`)
    this.emit("error", { message: "Not Authorized to initialize new game", type: "critical" });
    return;
  }

  reset(room);
  logger.debug("exit methode : newGame")
}

function lobbySynchro(data) {
  const room = position[this.id];
  this.to(room).emit("synchronizedLobby", data)
}

/** Funktion um vorhanden sein der gegebenen daten / parametern zu prüfen.
@param {object} obj - Objekt mit verschiedenen Properties.
@param {String[]} options - Properties die data enthalten soll.
@returns {object | boolean} Sendet im Fehlerfall {message : String , type : "critical"} ansonsten false.
*/
function guardian(obj, options) {
  logger.debug("methode : guardian called");

  if (!obj) {
    logger.error(`data is not set`)
    return { message: "data is not set", type: "critical" };
  }

  let check = false;
  let result = false;

  if (options) {
    for (let i = 0; i < options.length; i++) {
      obj[options[i]] ? true : check = opt;

      if (check) {
        logger.error(`data.${check} is not set`);
        result = { message: `data.${check} is not set`, type: "critical" };
        break;
      }
    }
  }

  logger.debug("exit methode : guardian");
  return result;
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


[
  { socketId: '100', points: 99999, answer: false },
  { socketId: '999', points: 766, answer: true },
  { socketId: '1223', points: 0, answer: false },
  { socketId: 'asdasd', points: 50, answer: false }
]

*/