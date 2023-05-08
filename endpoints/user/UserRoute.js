const express = require("express");
const router = express.Router();
const userService = require("./UserService");
const isAuthenticated = require("../utils/AuthenticationUtil");

router.post("/", async function (req, res) {
    try {
        const result = await userService.createUser(req.body);
        res.status(201).send(result);
    } catch (error) {
        res.status(400).json({ Error: error.message });
    }
});

module.exports = router;