// routes/manager.js
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Timesheet = require("../models/Timesheet");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();

// Require manager auth for all routes here
router.use(protect, requireRole("manager"));

/**
 * Normalize manager id (returns mongoose ObjectId or null)
 */
function getManagerId(req) {
  const raw = req?.user?._id || req?.user?.id || null;
  if (!raw) return null;
  try {
    // Accept strings and ObjectId-like values
    return mongoose.Types.ObjectId.isValid(String(raw)) ? new mongoose.Types.ObjectId(String(raw)) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Utility to validate ObjectId-like strings and return ObjectId or null
 */
function asObjectId(val) {
  if (!val) return null;
  try {
    return mongoose.Types.ObjectId.isValid(String(val)) ? new mongoose.Types.ObjectId(String(val)) : null;
  } catch {
    return null;
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
      return res.status(401).json({ error: "Unauthorized - manager id missing" });
    }

    const team = await User.find({
      role: "employee",
      manager: managerId,
    })
      .select("_id name email manager") // avoid returning sensitive fields
      .sort({ name: 1 })
      .lean();

    return res.json({ total: team.length, data: team });
  } catch (err) {
    console.error("manager/team error:", err);
    return res.status(500).json({ error: "Failed to load team" });
  }
});

/**
 * GET /api/manager/timesheets
 * Optional query params:
 *  - userId (must belong to manager)
 *  - status
 *  - weekStart (YYYY-MM-DD) exact day filter (UTC)
 *
 * Returns array of timesheets (populated user field)
 */
router.get("/timesheets", async (req, res) => {
  try {
    const managerId = getManagerId(req);
    if (!managerId) return res.status(401).json({ error: "Unauthorized" });

    // 1) resolve team employee ids
    const employees = await User.find({ role: "employee", manager: managerId }).select("_id").lean();
    const employeeIds = employees.map((e) => String(e._id));
    if (employeeIds.length === 0) return res.json([]);

    // 2) build query
    const q = {};

    // If a specific userId requested, ensure they belong to manager's team
    if (req.query.userId) {
      const maybeId = String(req.query.userId);
      if (!employeeIds.includes(maybeId)) {
        return res.status(403).json({ error: "Forbidden - user not in your team" });
      }
      const oid = asObjectId(maybeId);
      if (!oid) return res.status(400).json({ error: "Invalid userId" });
      q.user = oid;
    } else {
      // $in with ObjectIds
      q.user = { $in: employeeIds.map((s) => asObjectId(s)).filter(Boolean) };
    }

    if (req.query.status) q.status = String(req.query.status).trim();

    // optional exact weekStart matching (use UTC day)
    if (req.query.weekStart) {
      const d = String(req.query.weekStart);
      // minimal validation YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return res.status(400).json({ error: "weekStart expected YYYY-MM-DD" });
      const start = new Date(`${d}T00:00:00Z`);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid weekStart" });
      const next = new Date(start);
      next.setUTCDate(next.getUTCDate() + 1);
      q.weekStart = { $gte: start, $lt: next };
    }

    const sheets = await Timesheet.find(q)
      .populate("user", "name email")
      .sort({ weekStart: -1, updatedAt: -1 })
      .lean();

    return res.json(sheets);
  } catch (err) {
    console.error("manager/timesheets error:", err);
    return res.status(500).json({ error: "Failed to load timesheets" });
  }
});

/**
 * OPTIONAL: GET single timesheet (ensures ownership)
 * GET /api/manager/timesheets/:id
 */
router.get("/timesheets/:id", async (req, res) => {
  try {
    const managerId = getManagerId(req);
    if (!managerId) return res.status(401).json({ error: "Unauthorized" });

    const id = String(req.params.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid timesheet id" });

    const sheet = await Timesheet.findById(id).populate("user", "name email").lean();
    if (!sheet) return res.status(404).json({ error: "Timesheet not found" });

    // verify ownership: sheet.user must be in manager's team
    const isMember = await User.exists({ _id: sheet.user._id, manager: managerId });
    if (!isMember) return res.status(403).json({ error: "Forbidden" });

    return res.json(sheet);
  } catch (err) {
    console.error("manager/timesheets/:id error:", err);
    return res.status(500).json({ error: "Failed to load timesheet" });
  }
});

/**
 * Small whoami helper
 */
router.get("/whoami", (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
