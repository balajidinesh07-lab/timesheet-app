
const mongoose = require("mongoose");

const timesheetSchema = new mongoose.Schema({
  client: { type: String, required: true },
  project: { type: String, required: true },
  task: { type: String, required: true },
  activity: { type: String, required: true },
  hours: { type: Number, required: true },
  date: { type: Date, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // who created it
});

module.exports = mongoose.model("Timesheet", timesheetSchema);


