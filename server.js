const express = require('express')
const datenbank = require('./database/db');
const userRoutes = require('./endpoints/user/UserRoute')

const app = express()
const bodyparser = require('body-parser');

app.use(bodyparser.json());
app.use('/api/users', userRoutes);

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
