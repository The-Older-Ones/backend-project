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

  position[this.id] = code;

  lobbys[code] = {
    player: {
      [this.id]: {
        name: hostName,
        auth: verify,
        points: 0
      }
    },
    locked: false,
    host: this.id
  };

  try {
    let list = await GameService.getCategoryList();
    this.emit("gameCreated", { gameId: code, socketId: this.id, list: list });
    this.join(code);
  } catch (error) {
    this.emit("error", { message: error.message, type: "critical" })
  }
}

function disconnect(data) {

  let socketId
  if (data.id == "transport close" || typeof data.id === 'undefined') {
    socketId = this.id;
  } else {
    socketId = data.id;
  }

  const room = position[socketId];

  if (!room) {
    console.log("Player left Game")
    return;
  }

  delete lobbys[room].player[socketId];

  console.log("Player left Lobby " + room)

  const checkEmptiness = Object.keys(lobbys[room].player);

  if (checkEmptiness === 0) {
    delete lobbys[room];
    console.log("Closed Lobby: " + room)
    return;
  }

  if (socketId == lobbys[room].host) {
    updateHost({ id: socketId, gameId: room })
  }

  delete position[socketId];

  gameSocket.to(room).emit("playerLeft", { playerID: this.id });
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

  let verify = authenticated(token);
  if (verify.error) {
    this.emit("error", { message: verify.error, type: "warning" })
    verify = false;
  }

  if (position[this.id]) {
    disconnect({ id: this.id });
  }

  const lobbyMember = {};
  Object.keys(lobbys[lobbyId].player).forEach((socketID) => {
    lobbyMember[socketID] = lobbys[lobbyId].player[socketID].name;
  });

  position[this.id] = lobbyId;

  lobbys[lobbyId].player[this.id] = {
    name: playerName,
    auth: verify,
    points: 0
  }

  this.join(lobbyId);
  this.emit('joinedLobby', { gameId: lobbyId, socketId: this.id, lobbyMember: lobbyMember });
  gameSocket.to(lobbyId).emit("playerJoined", { playerId: this.id, playerName: playerName });
}

function updateHost(data) {
  const socketId = data.id ? data.id : this.id;
  const room = position[socketId];
  const newHost = data.newHost ? data.newHost : Object.keys(lobbys[room].player)[0];

  const currentHost = lobbys[room].host

  if (currentHost != socketId) {
    socketId.emit("error", { message: "No permission to change the host", type: "critical" })
    return;
  }

  if (currentHost == newHost) {
    socketId.emit("error", { message: "Already host", type: "critical" });
    return;
  }

  const playerInLobby = Object.keys(lobbys[room].player).filter((id) => id == newHost).length == 1;

  if (!playerInLobby) {
    socketId.emit("error", { message: "Selected player is not in the lobby", type: "critical" });
    return;
  }

  lobbys[room].host = newHost;

  gameSocket.to(room).emit("updatedHost", { newHost: newHost });
}

module.exports = connection;


//_________________________________________________Notes______________________________________________________________//
/*

- lobbys {
          "LobbyCode" {
                      player : { "socketID" : {
                                                  name : "playername",
                                                  auth : default false,
                                                  points : initial 0,
                                                  // answer : Erst Init wenn Game Start : String
                                  },
                                  "socketID" : ...

                      },
                      locked : default false,
                      host : socket.ID of the creator,
                      // rounds : Erst Init wenn Game Start = default or individual : Number,
                      // question : Erst Init wenn Game Start. Aktuelles Frageobj. aus DB : Obj gemapped

          },
}

In der Config schreiben die Default sachen. -> rounds.



*/