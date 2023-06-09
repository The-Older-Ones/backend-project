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
const connection = require("./endpoints/game/GameConnection");
const logger = require("./logger")

app.use(cors({
    exposedHeaders: ['Authorization'],
    origin: 'https://triviosa.netlify.app'
}));
app.use(bodyparser.json());
app.use('/api/users', userRoutes);
app.use('/api/authenticate', authenticationRoute);
app.use(function (req, res) {
    res.status(404).send({ Error: "Endpoint not existing" });
});

database((err) => {
    if (err) {
        logger.error("Error: Could not connect to database " + err.message);
    } else {
        logger.info("Successful: connection to the database established");
        questionInit();
    }
});

const server = http.createServer(app)

const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["content-type"]
    }
});

connection(io.of('/api/game'));

const port = process.env.PORT || 80;
server.listen(port, () =>{
    logger.info(`Server started on port ${port}`);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception: " +  error.stack);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  })