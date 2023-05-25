const express = require('express');
const datenbank = require('./database/db');
const cors = require("cors")
const http = require('http')
const userRoutes = require('./endpoints/user/UserRoute');
const authenticationRoute = require('./endpoints/authentication/AuthenticationRoutes');
const questionInit = require("./database/TriviaQuestions/QuestionInit");
// const gameServices = require('./endpoints/game/GameServices');
const socketIO = require('socket.io')

const app = express()
const bodyparser = require('body-parser');

app.use("*", cors())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Expose-Headers", "Authorization");
    next();
})

app.use(bodyparser.json());
app.use('/api/users', userRoutes);
app.use('/api/authenticate', authenticationRoute);

datenbank((err) => {
    if (err) {
        console.log("Error: Could not connect to database");
    } else {
        console.log("Successful: connection to the database established");
    }
});

questionInit();

app.use(function (req, res) {
    res.status(404).send({ Error: "Endpoint not existing" });
  });

const server = http.createServer(app)

server.listen(80);

const io = socketIO(server);

const routeNamespace = io.of('/game');

routeNamespace.on('connection', socket => {
    console.log("New user is connected");
    // gameServices.createGame(io, socket);
    //socket events siehe prototyp
    socket.on('disconnect', () =>{
        console.log("A user disconnected")
    })
})