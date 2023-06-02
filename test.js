// const io = require('socket.io-client');

// const socket = io ('http://127.0.0.1:80');

// socket.io('connect', () => {
//     console.log('Connected to server');
// })


// // TODO - to test socket.io 
const gameServices = require ("./endpoints/game/GameServices")
const database = require('./database/db');

database((err) => {
    if (err) {
        console.log("Error: Could not connect to database " + err.message);
    } else {
        console.log("Successful: connection to the database established");
    }
});

async function testGetRandomQuestion() {
    // Call getRandomQuestion with sample category and difficulty
    const result = await gameServices.checkCategory(["Vehicles","Sports","Huhrensohn"])
  

  }

  testGetRandomQuestion()

