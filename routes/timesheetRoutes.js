// routes/timesheetRoutes.js
const express = require("express");
const Timesheet = require("../models/Timesheet");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// helper to normalize incoming weekStart string -> Date (midnight)
const toDate = (s) => {
  const d = new Date(s);
  d.setHours(0,0,0,0);
  return d;
};

// GET my timesheet for a week (weekStart format: YYYY-MM-DD)
router.get("/:weekStart", async (req, res) => {
  try {
    const weekStart = toDate(req.params.weekStart);
    const sheet = await Timesheet.findOne({ user: req.user.id, weekStart });
    if (!sheet) return res.json({ entries: [] });
    res.json(sheet);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST create or update my timesheet for a week
router.post("/:weekStart", async (req, res) => {
  try {
    const weekStart = toDate(req.params.weekStart);
    const { entries } = req.body;
    if (!Array.isArray(entries)) return res.status(400).json({ error: "entries must be an array" });

    let sheet = await Timesheet.findOne({ user: req.user.id, weekStart });
    if (sheet) {
      sheet.entries = entries;
    } else {
      sheet = new Timesheet({ user: req.user.id, weekStart, entries });
    }
    await sheet.save();
    res.json(sheet);
  } catch (err) {
    // if duplicate key error (shouldn't happen with current logic) return nice message
    if (err.code === 11000) return res.status(409).json({ error: "Timesheet already exists" });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
