require('dotenv').config();
const config = require("config");
const Mongoose = require("mongoose");
const ConnectionString = process.env.DATABASE_URL;
const ConnectionOptions = config.get("db.connectionOptions");

async function dbStart(callback) {
    try {
        await Mongoose.connect(ConnectionString, ConnectionOptions);
        callback(null)
    } catch (error) {
        callback(error)
    }
};

module.exports = dbStart;


