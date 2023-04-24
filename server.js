const express = require('express')
const db = require('./database/db');

const app = express()
const bodyparser = require('body-parser');

app.use(bodyparser.json());

db((err) => {
    if (err) {
        console.log("Error: Could not connect to database");
    } else {
        console.log("Successful: connection to the database established");
    }
});

app.listen(443)

