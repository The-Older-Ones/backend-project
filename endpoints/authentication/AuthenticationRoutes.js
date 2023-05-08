const express = require("express");
const router = express.Router();
const authenticationService = require('./AuthenticationService');

router.get('/', function (req, res) {
    if (req.headers.authorization) {
        const base64Credentials = req.headers.authorization.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        authenticationService.createToken({ username, password }, function (err, token) {
            if (token) {
                res.header("Authorization", "Bearer " + token).status(200).send();
            }
            else {
                res.status(401).json({ Error: "Incorrect username or password"  });
            }
        });
    } else {
        res.status(400).json({ Error: "Missing Header" });
    }
});

module.exports = router;