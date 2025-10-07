// routes/timesheetRoutes.js
const express = require("express");
const Timesheet = require("../models/Timesheet");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// helper to normalize incoming weekStart string -> Date (midnight)
const toDate = (s) => {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

// GET my timesheet for a week (return flat {date, hours} rows)
router.get("/:weekStart", async (req, res) => {
  try {
    const weekStart = toDate(req.params.weekStart);
    const sheet = await Timesheet.findOne({ user: req.user.id, weekStart });
    if (!sheet) return res.json({ entries: [] });

    // grouped DB -> flat frontend rows
    const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const monday = new Date(weekStart);

    const flatEntries = [];

    for (const e of sheet.entries) {
      map.forEach((dayKey, idx) => {
        const hours = e.hours?.[dayKey] || 0;
        if (hours > 0) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + idx); // move forward idx days
          flatEntries.push({
            client: e.client,
            project: e.project,
            task: e.task,
            activity: e.activity,
            date: d.toISOString().slice(0, 10), // YYYY-MM-DD
            hours,
          });
        }
      });
    }

    res.json({ entries: flatEntries });
  } catch (err) {
    console.error("Error fetching timesheet:", err);
    res.status(400).json({ error: err.message });
  }
});

// POST create or update my timesheet for a week
router.post("/:weekStart", async (req, res) => {
  try {
    const weekStart = toDate(req.params.weekStart);
    let { entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: "entries must be an array" });
    }

    // Group by row (client+project+task+activity)
    const grouped = {};

    for (const e of entries) {
      const rowKey = [e.client, e.project, e.task, e.activity].join("|");
      if (!grouped[rowKey]) {
        grouped[rowKey] = {
          client: e.client || "",
          project: e.project || "",
          task: e.task || "",
          activity: e.activity || "",
          hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
        };
      }

      // Map JS day index -> key (Sun=0 ... Sat=6)
      const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const keyDay = map[new Date(e.date).getDay()];
      grouped[rowKey].hours[keyDay] = Number(e.hours || 0);
    }

    const finalEntries = Object.values(grouped);

    let sheet = await Timesheet.findOne({ user: req.user.id, weekStart });
    if (sheet) {
      sheet.entries = finalEntries;
    } else {
      sheet = new Timesheet({ user: req.user.id, weekStart, entries: finalEntries });
    }

    await sheet.save();
    res.json(sheet);
  } catch (err) {
    console.error("Error saving timesheet:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;