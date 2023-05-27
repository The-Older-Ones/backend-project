const express = require('express');
const database = require('./database/db');
const cors = require("cors");
const http = require('http');
const userRoutes = require('./endpoints/user/UserRoute');
const authenticationRoute = require('./endpoints/authentication/AuthenticationRoutes');
const questionInit = require("./database/TriviaQuestions/QuestionInit");
const socketIO = require('socket.io');
const app = express();
const bodyparser = require('body-parser');

// --- Wurde vorher benutzt und falls es später Probleme geben sollte diesen statt app.use(cors) nuutzen ---
// app.use("*", cors());
// app.use(function (req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Expose-Headers", "Authorization");
//     next();
// });

app.use(cors({
    exposedHeaders: ['Authorization']
}));
app.use(bodyparser.json());
app.use('/api/users', userRoutes);
app.use('/api/authenticate', authenticationRoute);
app.use(function (req, res) {
    res.status(404).send({ Error: "Endpoint not existing" });
});

database((err) => {
    if (err) {
        console.log("Error: Could not connect to database " + err.message);
    } else {
        console.log("Successful: connection to the database established");
        questionInit();
    }
});

const server = http.createServer(app)

//_____________________________________________Prototyp Testing_______________________________________________________//

const connection = require("./endpoints/game/GameConnection");

const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"]
    }
});

connection(io.of('/api/game'));


//_________________________________________________Notes______________________________________________________________//
/*

- Cors bei socketIO möglicherweise überarbeiten wenn der Token gesendet werden soll.

*/


//_____________________________________________Prototyp Testing___________________________________________________//

server.listen(80);