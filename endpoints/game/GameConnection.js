const GameService = require("./GameServices")

const lobbys = {};
const location = {};

// Arrow Function um die Funktionen nicht separat binden zu müssen
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
    this.emit("error", { message: " data.playerName is not set" })
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

  if(location[this.id]){
    disconnect(this.id);
  }

  location[this.id] = code;
  lobbys[code] = {
    player: {
      [this.id]: hostName
    },
    locked: false
  };

  this.emit("gameCreated", { gameId: code, socketId: this.id, playerName: hostName });
  this.join(code.toString());

  console.log(lobbys);
}

function disconnect(id) {
  let socketId;

  id ? socketId = id : socketId = this.id;
  const room = location[socketId];

  if(room){

    delete lobbys[room].player[socketId];
    console.log("Player left Lobby " + room)
    const checkEmptiness = Object.keys(lobbys[room].player).length

    if(checkEmptiness === 0){
      delete lobbys[room];
      console.log("Closed Lobby: " + room)
    }

  } else {
    console.log("Player left Game")
  }
}

// Andere Exportierung um möglichen Plagiatsvorwurf aus vorlage SocketTriva zu vermeiden und konsistent zu bleiben (andere Module)
module.exports = connection;



//_________________________________________________Notes______________________________________________________________//
/*
Lobby als Hashmap nutzen. GameID ist der Key und der Wert kann wieder ein Objekt sein mit allen spielern und desen gemappten
id und namen + punkte. locked um das spiel zu starten und keine Spieler mehr rein zu lassen über join.
zb.
 gameID key (propertie) = {player : {socketid : [playername, points]} , locked : boolean}

 übergebende daten an die handler heißen data und müssen von FE gesenet werden.
 So benötigt createGame unbeding data.name bzw .playerName

- möglicherweise einen timestamp oder etwas ähnliches benutzen um alte lobbys zu löschen

- in disconnect habe ich id als parameter und in einer abfrage geschrieben da ich diese in createGame auch nutze und this. nicht greift
ob diese Abfrage in unserem Projekt zur benutzung kommt ist nicht klar aber es gibt einem die Sicherheit, dass die Listen sauber gehalten werden.

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