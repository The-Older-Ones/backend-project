const gameController = require("./GameController");
const logger = require("../../logger");

const connection = (io) => {
  io.on("connect", socket => {
    registerSocketHandler(io,socket);
    logger.info(`User joined : ${socket.id}`)
    socket.emit("connected", { message: "Connected successfully" });
  });
}

function registerSocketHandler(io,socket){
  socket.on("createGame", (data) => {
    gameController.createGame(io,socket,data);
  });
  socket.on("disconnect", (data) => {
    gameController.disconnect(io,socket,data);
  });
  socket.on("joinLobby", (data) => {
    gameController.joinLobby(io,socket,data);
  });
  socket.on("updateHost", (data) => {
    gameController.updateHost(io,socket,data);
  });
  socket.on("setRounds", (data) => {
    gameController.setRounds(io,socket,data);
  });
  socket.on("setPlayerNumber", (data) => {
    gameController.setPlayerNumber(io,socket,data);
  });
  socket.on("startGame", (data) => {
    gameController.startGame(io,socket,data);
  });
  socket.on("giveQuestion", (data) => {
    gameController.giveQuestion(io,socket,data);
  });  
  socket.on("setAnswer", (data) => {
    gameController.setAnswer(io,socket,data);
  });
  socket.on("setExtension", (data) => {
    gameController.setExtension(io,socket,data);
  });
  socket.on("newGame", () => {
    gameController.newGame(io,socket);
  });
  socket.on("lobbySynchro", (data) => {
    gameController.lobbySynchro(socket,data);
  });
}

module.exports = connection;