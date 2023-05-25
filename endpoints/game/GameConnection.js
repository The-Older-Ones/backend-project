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