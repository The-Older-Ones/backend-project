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

    const test = {
        question : {
            correct_answer : "Maul Affe",
            difficulty : "666"
        },
        player : {
            1223 :{
                points : 0,
                answer : "tutt"
            },
            999 :{
                points : 100,
                answer : "Maul Affe"
            },
            100 : {
                points : 99999,
                answer : "asd"
            },
            "asdasd" : {
                points : 50,
                answer : "asd"
            }
        }
    }



    const rückgabe = Object.entries(test.player).map(([socketId,properties]) =>{
        let result = false;
        if(properties.answer == test.question.correct_answer){
          properties.points += parseInt(test.question.difficulty);
          console.log(properties.points)
          result = true;
        }
        return({
          [socketId] : {
            points : properties.points,
            answer : result
          }
        })
      }).sort((a,b) =>{
        const pointsA = Object.values(a)[0].points;
        const pointsB = Object.values(b)[0].points;
      
        return pointsB - pointsA;
    });;

      console.log(rückgabe)
  }

  testGetRandomQuestion()

