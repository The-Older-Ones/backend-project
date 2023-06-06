const User = require("./UserModel");
const logger = require("../../logger")

async function createUser(newUser) {
    logger.debug("methode : createUser called")
    // add !newUser.email if the time has come
    if (!newUser.userID || !newUser.password) {
        const errorMessage = "Please fill all required fields";
        logger.error(errorMessage)
        throw new Error(errorMessage, null);
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
        logger.info("User created:", subset);
        logger.debug("exit methode : createUser")
        return subset;
    } catch (error) {
        if (error.name === 'ValidationError') {
            // To show the errors from the validators or the error while creating User if its something else
            const message = Object.values(error.errors).map((err) => err.message);
            logger.error("Validation error:", message);
            throw new Error(message);
        } else {
            let user = await User.findOne({ userID: newUser.userID });
            // the $or is used to either check for a duplicate email or a duplicate userID
            if (user) {
                const errorMessage = "User with the same UserID or Email already exists";
                logger.error(errorMessage);
                throw new Error(errorMessage);
            }
            const errorMessage = "Error while creating User";
            logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }
}

async function authenticate(loginUser, callback) {
    logger.debug("methode : authenticate called")
    let user = await User.findOne({userID: loginUser.username});
    if (user) {
        user.comparePassword(loginUser.password, (err, result) => {
            if (result) {
                logger.info("Authentication successful:", user);
                return callback(null, user);
            } else {
                logger.error("Authentication failed");
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