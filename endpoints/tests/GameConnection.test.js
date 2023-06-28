const gameModule = require('../game/GameController');
const { io, Socket } = require('socket.io-client');

// Mock-Objekte erstellen
const ioMock = io();
const socketMock = new Socket();

// Mock-Funktionen und Daten erstellen
const loggerMock = {
  debug: jest.fn(),
  info: jest.fn()
};

// Testfall für joinLobby
test('joinLobby', () => {
  const data = {
    gameId: 'lobbyId',
    playerName: 'Alice',
    token: 'validToken'
  };

  // Aufruf der Funktion
  gameModule.joinLobby(ioMock, socketMock, data);

  // Überprüfen der erwarteten Aufrufe
//   expect(loggerMock.debug).toHaveBeenCalledTimes(1);
  expect(socketMock.emit).toHaveBeenCalledWith('joinedLobby', {
    playerName: 'Alice'
  });
  expect(socketMock.to).toHaveBeenCalledWith('lobbyId');
  expect(ioMock.emit).toHaveBeenCalledWith('lobbyUpdated', {
    gameId: 'lobbyId',
    players: ['Alice'],
    hostName: 'John',
    settings: {
      list: ['category1', 'category2'],
      playerNumber: 4,
      rounds: 5
    }
  });
});

// Testfall für updateHost
test('updateHost', () => {
  const data = {
    gameId: 'lobbyId',
    playerName: 'John',
    newHostName: 'Alice',
    token: 'validToken'
  };

  // Aufruf der Funktion
  gameModule.updateHost(ioMock, socketMock, data);

  // Überprüfen der erwarteten Aufrufe
//   expect(loggerMock.debug).toHaveBeenCalledTimes(1);
//   expect(loggerMock.info).toHaveBeenCalledTimes(1);
  expect(socketMock.emit).toHaveBeenCalledWith('hostUpdated', {
    newHostName: 'Alice'
  });
  expect(ioMock.emit).toHaveBeenCalledWith('lobbyUpdated', {
    gameId: 'lobbyId',
    players: ['Alice'],
    hostName: 'Alice',
    settings: {
      list: ['category1', 'category2'],
      playerNumber: 4,
      rounds: 5
    }
  });
});

// Testfall für setRounds
test('setRounds', () => {
  const data = {
    gameId: 'lobbyId',
    playerName: 'John',
    rounds: 7,
    token: 'validToken'
  };

  // Aufruf der Funktion
  gameModule.setRounds(ioMock, socketMock, data);

  // Überprüfen der erwarteten Aufrufe
//   expect(loggerMock.debug).toHaveBeenCalledTimes(1);
//   expect(loggerMock.info).toHaveBeenCalledTimes(1);
  expect(socketMock.emit).toHaveBeenCalledWith('roundsUpdated', {
    rounds: 7
  });
  expect(ioMock.emit).toHaveBeenCalledWith('lobbyUpdated', {
    gameId: 'lobbyId',
    players: ['Alice'],
    hostName: 'Alice',
    settings: {
      list: ['category1', 'category2'],
      playerNumber: 4,
      rounds: 7
    }
  });
});

// Testfall für setPlayerNumber
test('setPlayerNumber', () => {
  const data = {
    gameId: 'lobbyId',
    playerName: 'John',
    playerNumber: 6,
    token: 'validToken'
  };

  // Aufruf der Funktion
  gameModule.setPlayerNumber(ioMock, socketMock, data);

  // Überprüfen der erwarteten Aufrufe
//   expect(loggerMock.debug).toHaveBeenCalledTimes(1);
//   expect(loggerMock.info).toHaveBeenCalledTimes(1);
  expect(socketMock.emit).toHaveBeenCalledWith('playerNumberUpdated', {
    playerNumber: 6
  });
  expect(ioMock.emit).toHaveBeenCalledWith('lobbyUpdated', {
    gameId: 'lobbyId',
    players: ['Alice'],
    hostName: 'Alice',
    settings: {
      list: ['category1', 'category2'],
      playerNumber: 6,
      rounds: 5
    }
  });
});

// Weitere Testfälle können hinzugefügt werden

