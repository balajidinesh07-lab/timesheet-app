const mongoose = require("mongoose");

const ManagerProfileSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, trim: true },
    title: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    teamName: { type: String, trim: true },
    location: { type: String, trim: true },
    timezone: { type: String, trim: true },
    workingHoursStart: { type: String, trim: true },
    workingHoursEnd: { type: String, trim: true },
    settings: {
      emailNotifications: { type: Boolean, default: true },
      slackNotifications: { type: Boolean, default: false },
      weeklyDigest: { type: Boolean, default: true },
      autoApproveShortLeaves: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ManagerProfile", ManagerProfileSchema);
