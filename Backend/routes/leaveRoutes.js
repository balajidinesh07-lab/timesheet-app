const express = require("express");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const DEFAULT_ALLOWANCES = {
  Casual: 12,
  Sick: 10,
  "Paid Time Off": 15,
  "Comp Off": 5,
};

const ALLOWED_TYPES = Object.keys(DEFAULT_ALLOWANCES);

const isoDate = (value) => {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const calcDaysInclusive = (from, to) => {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${(to || from)}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return { start, end, diff };
};

const canManageLeaves = (user) => {
  if (!user) return false;
  return user.role === "manager" || user.role === "admin";
};

// All leave routes require authentication
router.use(protect);

/**
 * GET /api/leaves/summary
 * Returns leave balances, stats, and request history for logged-in user.
 */
router.get("/summary", async (req, res) => {
  try {
    const requests = await LeaveRequest.find({ employee: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: "manager", select: "name email role" });

    const now = new Date();
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

    const usedByType = {};
    const stats = {
      pending: 0,
      approvedDays: 0,
      upcomingApproved: 0,
      totalRequests: requests.length,
    };

    const formatted = requests.map((reqDoc) => {
      if (reqDoc.status === "Pending") stats.pending += 1;
      if (reqDoc.status === "Approved") {
        stats.approvedDays += reqDoc.days;
        if (reqDoc.startDate >= now) stats.upcomingApproved += 1;
        if (reqDoc.startDate >= yearStart && reqDoc.startDate < yearEnd) {
          usedByType[reqDoc.type] = (usedByType[reqDoc.type] || 0) + reqDoc.days;
        }
      }

      return {
        id: reqDoc._id,
        type: reqDoc.type,
        from: isoDate(reqDoc.startDate),
        to: isoDate(reqDoc.endDate),
        days: reqDoc.days,
        status: reqDoc.status,
        reason: reqDoc.reason || "",
        managerNote: reqDoc.managerNote || "",
        requestedAt: reqDoc.createdAt,
        decidedAt: reqDoc.decidedAt,
        manager:
          reqDoc.manager && reqDoc.manager.name
            ? {
                id: reqDoc.manager._id,
                name: reqDoc.manager.name,
                email: reqDoc.manager.email,
              }
            : null,
      };
    });

    const balances = {};
    const breakdown = {};
    for (const [type, total] of Object.entries(DEFAULT_ALLOWANCES)) {
      const used = usedByType[type] || 0;
      const remaining = Math.max(0, total - used);
      balances[type] = remaining;
      breakdown[type] = { total, used, remaining };
    }

    return res.json({ balances, breakdown, requests: formatted, stats, types: ALLOWED_TYPES });
  } catch (err) {
    console.error("Leave summary error:", err);
    return res.status(500).json({ error: "Failed to load leave summary" });
  }
});

/**
 * POST /api/leaves
 * Body: { type, from, to, reason }
 */
router.post("/", async (req, res) => {
  try {
    const { type, from, to, reason } = req.body || {};

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid leave type" });
    }

    const range = calcDaysInclusive(from, to || from);
    if (!range) return res.status(400).json({ error: "Invalid dates supplied" });

    const leave = new LeaveRequest({
      employee: req.user._id,
      manager: req.user.manager || null,
      type,
      startDate: range.start,
      endDate: range.end,
      days: range.diff,
      reason: reason || "",
      status: "Pending",
    });

    await leave.save();
    return res.status(201).json({
      id: leave._id,
      type: leave.type,
      from: isoDate(leave.startDate),
      to: isoDate(leave.endDate),
      days: leave.days,
      status: leave.status,
      reason: leave.reason,
      managerNote: "",
      requestedAt: leave.createdAt,
    });
  } catch (err) {
    console.error("Create leave error:", err);
    return res.status(500).json({ error: "Failed to submit leave request" });
  }
});

/**
 * PATCH /api/leaves/:id/cancel
 * Allows employees to cancel their own pending leave requests.
 */
router.patch("/:id/cancel", async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: "Leave request not found" });
    if (String(leave.employee) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (leave.status !== "Pending") {
      return res.status(400).json({ error: "Only pending requests can be cancelled" });
    }

    leave.status = "Cancelled";
    leave.decidedAt = new Date();
    await leave.save();

    return res.json({
      id: leave._id,
      status: leave.status,
      decidedAt: leave.decidedAt,
    });
  } catch (err) {
    console.error("Cancel leave error:", err);
    return res.status(500).json({ error: "Failed to cancel leave request" });
  }
});

/**
 * GET /api/leaves/requests/manager
 * Returns leave requests for direct reports (manager/admin only).
 */
router.get("/requests/manager", async (req, res) => {
  try {
    if (!canManageLeaves(req.user)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let query = {};
    if (req.user.role === "manager") {
      const directReports = await User.find({ manager: req.user._id }).select("_id name email");
      const employeeIds = directReports.map((u) => u._id);
      const orConditions = [];
      if (employeeIds.length) {
        orConditions.push({ employee: { $in: employeeIds } });
      }
      orConditions.push({ manager: req.user._id });
      query = orConditions.length > 1 ? { $or: orConditions } : orConditions[0];
    }

    const leaves = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: "employee", select: "name email" });

    const formatted = leaves.map((item) => ({
      id: item._id,
      employee: item.employee?.name || "Unknown",
      employeeId: item.employee?._id,
      type: item.type,
      from: isoDate(item.startDate),
      to: isoDate(item.endDate),
      days: item.days,
      reason: item.reason || "",
      status: item.status,
      requestedAt: item.createdAt,
      managerNote: item.managerNote || "",
    }));
    return res.json(formatted);
  } catch (err) {
    console.error("Manager leave list error:", err);
    return res.status(500).json({ error: "Failed to load leave requests" });
  }
});

/**
 * POST /api/leaves/:id/approve
 * POST /api/leaves/:id/reject
 */
router.post("/:id/approve", async (req, res) => {
  if (!canManageLeaves(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  await handleDecision(req, res, "Approved");
});

router.post("/:id/reject", async (req, res) => {
  if (!canManageLeaves(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  await handleDecision(req, res, "Rejected");
});

const handleDecision = async (req, res, status) => {
  try {
    const { note = "" } = req.body || {};
    const leave = await LeaveRequest.findById(req.params.id).populate({
      path: "employee",
      select: "manager name",
    });
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (req.user.role === "manager") {
      const managerId = String(req.user._id);
      const permitted = [];
      if (leave.manager) permitted.push(String(leave.manager));
      if (leave.employee && leave.employee.manager) {
        permitted.push(String(leave.employee.manager));
      }
      if (permitted.length && !permitted.includes(managerId)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({ error: "Only pending requests can be updated" });
    }

    leave.status = status;
    leave.manager = req.user._id;
    leave.managerNote = note || "";
    leave.decidedAt = new Date();
    await leave.save();

    return res.json({
      id: leave._id,
      status: leave.status,
      managerNote: leave.managerNote,
      decidedAt: leave.decidedAt,
    });
  } catch (err) {
    console.error(`${status.toLowerCase()} leave error:`, err);
    return res.status(500).json({ error: `Failed to ${status.toLowerCase()} leave request` });
  }
};

module.exports = router;
