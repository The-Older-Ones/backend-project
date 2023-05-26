const GameService = require("./GameServices")

let lobbys = {};

// Arrow Function um die Funktionen nicht separat binden zu müssen
const connection = (io) => {
  io.on("connect", socket => {
    //------- socket.on all handler -------//
    socket.on("createGame", createGame);
    //------- socket.on all handler -------//
    socket.emit("connected", { message: "Connected successfully" });
  });
}

function createGame() {

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeCharacter = 9;
  let code;
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




}

// Andere Exportierung um möglichen Plagiatsvorwurf aus vorlage SocketTriva zu vermeiden und konsistent zu bleiben (andere Module)
module.exports = connection;



//_________________________________________________Notes______________________________________________________________//
/*
Lobby als Hashmap nutzen. GameID ist der Key und der Wert kann wieder ein Objekt sein mit allen spielern und desen gemappten
id und namen + punkte. locked um das spiel zu starten und keine Spieler mehr rein zu lassen über join.
zb.
 gameID key (propertie) = {player : [{socketid : [playername, points]}] , locked : boolean}
*/





//_________________________________________________OLD______________________________________________________________//
/*
const socketIO = require('socket.io')

function generateCode(){
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeCharacter = 9;
    let code = '';

    for(let i=0; i<codeCharacter; i++){
        const randomCode = Math.floor(Math.random() * characters.length);
        code += characters[randomCode];
    }
    return code;
}

exports.createGame = (sio, socket) => {
    io = sio;
    gameSocket = socket;
    gaameSocket.on('joinLobby', joinLobby);
}

function joinLobby(lobbyId) {
    console.log('Lobby entering');
    // fetch token from API
    fetchToken().then((fetchedToken) => {
      token = fetchedToken;
      // method to add the client to the appropriate lobby room, based on the lobbyId passed in by the client
      gameSocket.join(`lobby-${lobbyId}`);
      // send token to client
      gameSocket.emit('token', token);
    });
  }
*/
//_________________________________________________OLD______________________________________________________________//