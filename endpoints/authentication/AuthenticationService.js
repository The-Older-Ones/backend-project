const userService = require('../user/UserService');
const jwt = require('jsonwebtoken');
const config = require("config");
const logger = require("../../logger");

function createToken(content, callback) {
    logger.debug("methode : createToken called")
    userService.authenticate(content, function (err, user) {
        if (user) {
            const expiresAt = config.get("session.timeout");
            const privateKey = config.get("session.tokenKey");
            const token = jwt.sign({ "user": user.userID, "isAdministrator": user.isAdministrator }, privateKey, { expiresIn: expiresAt, algorithm: "HS256" });
            logger.info("Token created for user:", user.userID);
            callback(null, token);
        } else {
            logger.error("Error creating token:", err);
            callback(err, null);
        }
    });
    logger.debug("exit methode : createToken")
}

module.exports = {
    createToken
};