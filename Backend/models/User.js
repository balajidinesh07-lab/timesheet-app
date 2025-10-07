// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
    },

    mustResetPassword: {
      type: Boolean,
      default: false,
    },

    // if this user is an employee, store their manager
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // password reset token + expiry (for forgot-password flow)
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // remove sensitive fields when converting to JSON
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        return ret;
      },
    },
  }
);

// Hash password before saving (only if modified and not already hashed)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // If password already looks like a bcrypt hash, skip re-hashing
  if (typeof this.password === "string" && (this.password.startsWith("$2a$") || this.password.startsWith("$2b$") || this.password.startsWith("$2y$"))) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Instance method: compare plaintext password with stored hash
UserSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Instance method: generate a secure reset token, store on user and expiry, return the plain token
UserSchema.methods.generatePasswordReset = function () {
  // create random token (hex)
  const token = crypto.randomBytes(32).toString("hex");

  // set token & expiry (1 hour)
  this.resetPasswordToken = token;
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

  // note: caller should `await user.save()` after calling this
  return token;
};

module.exports = mongoose.model("User", UserSchema);
