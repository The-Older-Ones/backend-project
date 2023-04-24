const config = require("config");
const Mongoose = require("mongoose");
const ConnectionString = config.get("db.connectionString");
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


