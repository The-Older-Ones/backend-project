let mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  userID: {
    type: String,
    unique: true,
    required: true,
    minlength: 4,
    validate: {
      validator: function (v) {
        // Check if the input value contains only valid characters
        return /^[a-zA-Z0-9_-]*$/.test(v);
      },
      message: 'UserID contains invalid characters',
    },
  },
  email: {
    type: String,
    // unique: true,
    //required: true,
    validate: {
      validator: function (v) {
        // Regular expression pattern for email validation
        return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(v);
      },
      message: 'Please enter a valid email address',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: [8,'Password is shorter than the minimum allowed length (8).'],
    validate: {
      validator: function (v) {
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
    data: {
      type: Buffer,
      validate: [
        {
          validator: function (v) {
            // Check that the picture size is less than 6 MB
            return v.length <= 6000000; // 6 MB
          },
          message: 'Profile picture is more than 6 MB',
        },
      ],
    },
    contentType: {
      type: String,
      validate: [
        {
          validator: function (v) {
            // Regular expression pattern for content type validation
            return /^image\/(png|jpeg|gif)$/.test(v);
          },
          message: 'Please upload a valid image file (png, jpeg or gif)',
        },
      ],
    },
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
  // if (user.profilePicture && user.profilePicture.data) {
  //   user.profilePicture.contentType = user.profilePicture.contentType || 'image/jpeg'; // Set default content type
  //   user.profilePicture.data = Buffer.from(user.profilePicture.data, 'base64'); // Convert base64 data to buffer
  // }
  next();
});

UserSchema.method("comparePassword", function (compass, callback) {
  bcrypt.compare(compass, this.password, (err, result) => {
      result ? callback(null, result) : callback(err, null);
  });
});

const User = mongoose.model("user", UserSchema);

module.exports = User;