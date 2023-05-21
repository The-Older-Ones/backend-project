const User = require("./UserModel");

async function createUser(newUser) {
    // add !newUser.email if the time has come
    if (!newUser.userID || !newUser.password) {
        throw new Error("Please fill all required fields", null) 
    }
    try {
        const createNew = await User.create(newUser);
        const subset = {
            userID: createNew.userID,
            email: createNew.email,
            profilePicture: createNew.profilePicture,
            isVerified: createNew.isVerified,
            isAdministrator: createNew.isAdministrator
            //to hide password from response
        };
        return subset;
    } catch (error) {
        if (error.name === 'ValidationError') {
            // To show the errors from the validators or the error while creating User if its something else
            const message = Object.values(error.errors).map((err) => err.message);
            throw new Error(message);
        } else {
            let user = await User.findOne({ $or: [{ userID: newUser.userID }, { email: newUser.email }] });
            // the $or is used to either check for a duplicate email or a duplicate userID
            if (user) {
                throw new Error("User with the same UserID or Email already exists");
            }
            throw new Error("Error while creating User"); //  modal schließen
        }
    }
}

async function authenticate(loginUser, callback) {
    let user = await User.findOne({userID: loginUser.username});
    if (user) {
        user.comparePassword(loginUser.password, (err, result) => {
            if (result) {
                return callback(null, user);
            } else {
                return callback(true, null);
            }
        });
    }
    else {
        return callback(true, null);
    };
};

module.exports = {
    createUser,
    authenticate
}