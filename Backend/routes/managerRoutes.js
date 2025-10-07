const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Timesheet = require("../models/Timesheet");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// Require manager auth for all routes here
router.use(protect, requireRole("manager"));

/**
 * Get a normalized managerId from req.user regardless of middleware shape
 */
function getManagerId(req) {
  const raw = req?.user?._id || req?.user?.id; // support both _id or id
  if (!raw) return null;
  try {
    return new mongoose.Types.ObjectId(String(raw));
  } catch {
    return String(raw);
  }
}

/**
 * GET /api/manager/team
 * Returns employees assigned to the logged-in manager
 */
router.get("/team", async (req, res) => {
  try {
    const managerId = getManagerId(req);
    if (!managerId) {
      console.warn("manager/team: No managerId on req.user:", req.user);
      return res.json([]); // safe empty
    }

    const team = await User.find({
      role: "employee",
      manager: managerId,
    })
      .select("-password -resetPasswordToken -resetPasswordExpire")
      .sort({ name: 1 });

    return res.json(team);
  } catch (err) {
    console.error("❌ Manager team fetch error:", err);
    return res.status(500).json({ error: "Failed to load team" });
  }
});

/**
 * GET /api/manager/timesheets
 * Optional: ?userId=<employeeId>&status=submitted|approved|rejected&weekStart=YYYY-MM-DD
 * Returns timesheets for employees assigned to the logged-in manager
 */
router.get("/timesheets", async (req, res) => {
  try {
    const managerId = getManagerId(req);
    if (!managerId) return res.json([]);

    // 1) get team employee ids
    const employees = await User.find({
      role: "employee",
      manager: managerId,
    }).select("_id");

    const employeeIds = employees.map((e) => e._id);
    if (employeeIds.length === 0) return res.json([]);

    // 2) build query
    const q = {};

    // If a specific userId is requested, ensure it belongs to the manager's team
    if (req.query.userId) {
      const u = String(req.query.userId);
      const isMine = employeeIds.some((id) => String(id) === u);
      if (!isMine) return res.status(403).json({ error: "Forbidden" });
      q.user = u; // string is fine; Mongoose casts to ObjectId
    } else {
      q.user = { $in: employeeIds };
    }

    if (req.query.status) q.status = req.query.status;

    // Optional exact weekStart filter (UTC day)
    if (req.query.weekStart) {
      const start = new Date(req.query.weekStart + "T00:00:00Z");
      if (!Number.isNaN(start.getTime())) {
        const next = new Date(start);
        next.setUTCDate(next.getUTCDate() + 1);
        q.weekStart = { $gte: start, $lt: next };
      }
    }

    const sheets = await Timesheet.find(q)
      .populate("user", "name email")
      .sort({ weekStart: -1, updatedAt: -1 });

    return res.json(sheets);
  } catch (err) {
    console.error("❌ Manager timesheets fetch error:", err);
    return res.status(500).json({ error: "Failed to load timesheets" });
  }
});

router.get("/whoami", (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
