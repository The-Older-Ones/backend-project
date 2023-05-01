let mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

const UserSchema = new mongoose.Schema({
  userID: {
    type: String,
    unique: true,
    required: true,
    minlength: 4,
    validate: {
      validator: function(v) {
        // Check if the input value contains only valid characters
        return /^[a-zA-Z0-9_-]*$/.test(v);
      },
      message: 'UserID contains invalid characters',
    },
  },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: function (v) {
        // Regular expression pattern for email validation
        const emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
        return emailRegex.test(v);
      },
      message: 'Please enter a valid email address',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    validate: {
      validator: function(v) {
        // Checking if password has ASCII characters
        const passRegex = /^[\x00-\x7F]*$/;
        return passRegex.test(v);
      },
      message: 'Please enter a valid password'
    }
  },
  isAdministrator: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    data: Buffer,
    contentType: String,
    validate: {
      validator: function (v) {
        // Check that the picture size is less than 6 MB
        return v.data.length <= 6000000; // 6 MB
      },
      message: 'Profile picture is more than 1 MB'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  }
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