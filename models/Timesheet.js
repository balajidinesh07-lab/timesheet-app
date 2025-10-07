// models/Timesheet.js
const mongoose = require("mongoose");

const EntrySchema = new mongoose.Schema({
  client: String,
  project: String,
  task: String,
  activity: String,
  hours: {
    mon: { type: Number, default: 0 },
    tue: { type: Number, default: 0 },
    wed: { type: Number, default: 0 },
    thu: { type: Number, default: 0 },
    fri: { type: Number, default: 0 },
    sat: { type: Number, default: 0 },
    sun: { type: Number, default: 0 },
  },
});

const TimesheetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: String, required: true }, // e.g. "2025-08-25"
    entries: [EntrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Timesheet", TimesheetSchema);
