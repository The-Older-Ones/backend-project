const User = require("./UserModel");

async function createUser(newUser) {
    if (!newUser.userID || !newUser.password || !newUser.email) {
        throw new Error("Please fill all required fields", null)
    }
    try {
        const createNew = await User.create(newUser);
        return createNew;
    } catch (error) {
        if (error.name === 'ValidationError') {
            // To show the errors from the validators or the error while creating User if its something else
            const message = Object.values(error.errors).map((err) => err.message).join('; ');
            throw new Error(message);
        } else {
            let user = await User.findOne({ $or: [{ userID: newUser.userID }, { email: newUser.email }] });
            // the $or is used to either check for a duplicate email or a duplicate userID
            if (user) {
                throw new Error("User with the same UserID or Email already exists");
            }
            throw new Error("Error while creating User");
        }
    }
}

module.exports = {
    createUser
}