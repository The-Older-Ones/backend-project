const User = require("./UserModel");

function createUser(newUser, callback) {
    if (!newUser.userID || !newUser.password || !newUser.email) {
        return callback("Please fill all required fields", null)
    }
    User.findOne({ userID: newUser.userID }), (err, obj) => {;
        if (obj) {
            return callback("User with the same UserID already exists: " + newUser.userID, null);
        } else {
            User.create(newUser, (err, obj) => {
                obj ? callback(null, obj) : callback("Create Error", null) 
            });
        }
    }
}

module.exports = {
    createUser
}