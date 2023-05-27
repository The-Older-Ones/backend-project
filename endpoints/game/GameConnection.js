const GameService = require("./GameServices")
const jwt = require('jsonwebtoken');
const config = require("config");

const lobbys = {};
const position = {};

const connection = (io) => {

  io.on("connect", playerSocket => {
    //------- socket.on all handler -------//

    playerSocket.on("createGame", createGame);
    playerSocket.on("disconnect", disconnect);

    //------- socket.on all handler -------//
    playerSocket.emit("connected", { message: "Connected successfully" });
  });
}

function createGame(data) {
  const hostName = data.playerName;
  const token = data.token;

  if (!hostName) {
    this.emit("error", { message: "data.playerName is not set" })
  }

  let verify = authenticated(token);
  if(verify.error){
    this.emit("error", { message: verify.error })
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
    disconnect(this.id);
  }

  position[this.id] = code;

  lobbys[code] = {
    player: {
      [this.id]: {
        name : hostName,
        auth : verify,
        points : 0
      }
    },
    locked: false
  };

  this.emit("gameCreated", { gameId: code, socketId: this.id, playerName: hostName });
  this.join(code);
}

function disconnect(id) {

  let socketId;

  if (id === "transport close") {
    socketId = this.id
  } else {
    socketId = id;
  }

  const room = position[socketId];

  if (room) {

    delete lobbys[room].player[socketId];
    delete position[socketId];
    console.log("Player left Lobby " + room)
    const checkEmptiness = Object.keys(lobbys[room].player).length

    if (checkEmptiness === 0) {
      delete lobbys[room];
      console.log("Closed Lobby: " + room)
    }

  } else {
    console.log("Player left Game")
  }
}

function authenticated (token){
  if(!token){
    return false;
  }
  let verify;
  const privateKey = config.get("session.tokenKey");
   jwt.verify(token, privateKey, { algorithms: "HS256" }, function (err, result) {
    if (result) {
      verify = true;
    } else {
      verify = {error : "Token invalid"}
    }
  });
  return verify;
}

module.exports = connection;



//_________________________________________________Notes______________________________________________________________//
/*

- ausstehend noch die validierung des tokens + lagerung der information bzw flag beim spieler

- lobbys {
          "LobbyCode" {
                      player : { "socketID" : {
                                                  name : "playername",
                                                  auth : default false,
                                                  points : initial 0
                                  },
                                  "socketID" : ...

                      },
                      locked : default false
          },
}

let chunk = "ff"

lobbys[chunk].player[this.id].points = 210

*/