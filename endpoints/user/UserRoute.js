var express = require("express");
var router = express.Router();
var userService = require("./UserService");

router.post("/", async function (req, res) {
    try {
        const result = await userService.createUser(req.body);
        const subset = {
            userID: result.userID,
            email: result.email,
            profilePicture: result.profilePicture,
            isVerified: result.isVerified,
            isAdministrator: result.isAdministrator
            //to hide password from response
        };
        res.status(201).send(subset);
    } catch (error) {
        res.status(400).json({ Error: error.message });
    }
});

module.exports = router;