const gameModule = require('../game/GameController');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const List = require("../../database/TriviaQuestions/CategoryListModel");

const ioMock = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis()
};

const socketMock = {
  id: 'mocked-socket-id',
  emit: jest.fn(),
  join: jest.fn(),
  to: jest.fn().mockReturnThis()
};

beforeAll(async () => {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { useNewUrlParser: true });
  await List.create({ list: ["Test"] });
});

afterEach(() => {
  gameModule.disconnect(ioMock, socketMock);
});

it('createGame no Data', async () => {
  await gameModule.createGame(ioMock, socketMock)
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "data is not set", type: "critical" })
});

it('createGame no playerName', async () => {
  await gameModule.createGame(ioMock, socketMock, {})
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "data.playerName is not set", type: "critical" })

});

it('createGame with invalid token', async () => {
  await gameModule.createGame(ioMock, socketMock, { playerName: "tester", token: "invalid" });
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "Token invalid", type: "warning" })
  expect(socketMock.emit).toHaveBeenCalledWith('gameCreated', {
    gameId: expect.any(String),
    socketId: 'mocked-socket-id',
    hostName: 'tester',
    settings: expect.objectContaining({
      list: expect.any(Array),
      playerNumber: expect.any(Number),
      rounds: expect.any(Number),
    }),
  });
});

it('joinGame no Data', async () => {
  await gameModule.joinLobby(ioMock, socketMock)
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "data is not set", type: "critical" })

});

it('joinGame missing gameId', async () => {
  const data = {
    playerName: 'Alice'
  };
  await gameModule.joinLobby(ioMock, socketMock, data)
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "data.gameId is not set", type: "critical" })

});

it('joinGame missing playerName', async () => {
  const data = {
    gameId: '1213'
  };
  await gameModule.joinLobby(ioMock, socketMock, data)
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "data.playerName is not set", type: "critical" })

});

it('joinGame Lobby not available', async () => {
  const data = {
    playerName: 'Alice',
    gameId: '1213'
  };
  await gameModule.joinLobby(ioMock, socketMock, data)
  expect(socketMock.emit).toHaveBeenCalledWith("error", { message: "Lobby is not available", type: "critical" })
});


it('joinGame Lobby with invalid Token', async () => {
  let code;
  let hostSocket = {
    id: 'host-id',
    emit: (type, obj) => {
      code = obj.gameId
    },
    join: jest.fn(),
  };
  await gameModule.createGame(ioMock, hostSocket, { playerName: "tester", token: "invalid" });

  hostSocket.emit = jest.fn();

  await gameModule.joinLobby(ioMock, socketMock, { playerName: "second", gameId: code })
  expect(socketMock.join).toHaveBeenCalledWith(code);
  expect(socketMock.emit).toHaveBeenCalledWith("joinedLobby", {
    gameId: code,
    socketId: 'mocked-socket-id',
    settings: expect.objectContaining({
      list: expect.any(Array),
      playerNumber: expect.any(Number),
      rounds: expect.any(Number),
    })
  })
  expect(socketMock.to().emit).toHaveBeenCalledWith("playerJoined", {
    playerId: socketMock.id,
    playerName: "second"
  });
  gameModule.disconnect(ioMock, hostSocket);
});

