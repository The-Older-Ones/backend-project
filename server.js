const express = require('express');
const datenbank = require('./database/db');
const cors = require("cors")
const userRoutes = require('./endpoints/user/UserRoute');
const authenticationRoute = require('./endpoints/authentication/AuthenticationRoutes');
const questionInit = require("./database/TriviaQuestions/QuestionInit");

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

app.use(function (req, res) {
    res.status(404).send({ Error: "Endpoint not existing" });
  });

app.listen(80);

questionInit();
