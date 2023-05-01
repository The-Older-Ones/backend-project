var userService = require('../user/UserService');
var jwt = require('jsonwebtoken');
var config = require("config");

function createToken(content, callback) {
    userService.authenticate(content, function (err, user) {
        if (user) {
            const expiresAt = config.get("session.timeout");
            const privateKey = config.get("session.tokenKey");
            const token = jwt.sign({ "user": user.userID, "isAdministrator": user.isAdministrator }, privateKey, { expiresIn: expiresAt, algorithm: "HS256" });
            callback(null, token);
        } else {
            callback(err, null);
        }
    });
}

module.exports = {
    createToken
};