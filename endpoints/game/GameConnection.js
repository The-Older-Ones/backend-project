const GameService = require("./GameServices")

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

  if (!hostName) {
    this.emit("error", { message: "data.playerName is not set" })
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
      [this.id]: hostName
    },
    locked: false
  };

  this.emit("gameCreated", { gameId: code, socketId: this.id, playerName: hostName });
  this.join(code);

  console.log(lobbys);
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

module.exports = connection;



//_________________________________________________Notes______________________________________________________________//
/*

- ausstehend noch die validierung des tokens + lagerung der information bzw flag beim spieler

*/