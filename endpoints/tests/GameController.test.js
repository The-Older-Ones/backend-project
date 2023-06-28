const {
    createGame,
    disconnect,
    authenticated,
    joinLobby,
    updateHost,
    setRounds,
    setPlayerNumber
  } = require('../game/GameController');
  
  describe('GameServices', () => {
    // describe('createGame', () => {
    //   test('should create a game successfully', async () => {
    //     // Mock dependencies and setup initial conditions
    //     const io = {};
    //     const socket = {
    //       emit: jest.fn(),
    //       join: jest.fn()
    //     };
    //     const data = {
    //       playerName: 'John Doe',
    //       token: 'some-token'
    //     };
  
    //     // Call the function
    //     await createGame(io, socket, data);
  
    //     // Perform assertions
    //     expect(socket.emit).toHaveBeenCalledWith('gameCreated', expect.any(Object));
    //     expect(socket.join).toHaveBeenCalled();
    //   });
  
    //   // Add more test cases for different scenarios
    // });
  
    // describe('disconnect', () => {
    //     test('should disconnect the player', () => {
    //       // Mock dependencies and setup initial conditions
    //       const io = {};
    //       const socket = {
    //         id: 'some-socket-id',
    //         emit: jest.fn(),
    //         to: jest.fn()
    //       };
      
    //       // Call the function
    //       disconnect(io, socket);
      
    //       // Perform assertions
    //       expect(socket.emit).toHaveBeenCalledWith('playerLeft', expect.any(Object));
    //       expect(socket.to).toHaveBeenCalledWith(expect.any(String));
    //       expect(socket.emit).toHaveBeenCalledTimes(1); // Ensure socket.emit is called only once
    //       expect(socket.to).toHaveBeenCalledTimes(1); // Ensure socket.to is called only once
    //     });
    //   });
  });
  