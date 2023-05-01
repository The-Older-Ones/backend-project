var express = require("express");
var router = express.Router();
var userService = require("./UserService");
var AuthenticationUtil = require("../utils/AuthenticationUtil");

router.post("/", AuthenticationUtil.isAuthenticated, function (req, res) {
    userService.createUser(req.body, function (err, result) {
        if (result) {
            res.status(201).send(result);
        } else {
            res.status(400).json({ Error: err });
        }
    });
});

module.exports = router;