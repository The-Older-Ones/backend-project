let mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// const validator = require('validator')

// const UserSchema = new mongoose.Schema({
//     userID: { type: String, unique: true, required: true },
//     firstName: { type: String, required: true },
//     lastName: { type: String, required: true },
//     password: { type: String, required: true },
//     // isAdministrator: { type: Boolean, default: false },
//     profilePicture: { type: String } ONLY WITH URL FROM IMAGE
// }, { timestamps: true });


// Alternative Option with Buffer for the Users to be able to upload their pictures from their pc. The above
// example only works with URL.
//
const UserSchema = new mongoose.Schema({
    userID: { type: String, unique: true, required: true },
    email: {type: String, unique: true, required: true}, 
    password: { type: String, required: true },
    isAdministrator: { type: Boolean, default: false },
    profilePicture: {
      data: Buffer,
      contentType: String,
      validate: {
        validator: function(v) {
            return v.data.length <= 6000000; // 6 MB
        }, 
        message: 'Profile picture is more than 1 MB'
      }
    },
    isVerified: {type: Boolean, default: false}
  }, { timestamps: true });

UserSchema.pre("save", async function (next) {
    var user = this;
    if (!user.isModified("password")) {
        return next();
    }
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;

    if (user.profilePicture && user.profilePicture.data) {
        user.profilePicture.contentType = user.profilePicture.contentType || 'image/jpeg'; // Set default content type
        user.profilePicture.data = Buffer.from(user.profilePicture.data, 'base64'); // Convert base64 data to buffer
      }
    next();
});

UserSchema.methods.comparePassword = function (candidatePassword, next) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err)
            return next(err, null);
        else
            next(null, isMatch);
    });
}

const User = mongoose.model("user", UserSchema);

module.exports = User;