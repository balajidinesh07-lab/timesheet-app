// routes/timesheets.js
const express = require("express");
const Timesheet = require("../models/Timesheet");
const { protect, requireRole } = require("../middleware/auth");

const router = express.Router();
const DAYS_IN_WEEK = 7;

/** No-cache headers */
router.use((_, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

/** Build UTC day-range from YYYY-MM-DD (start of day) */
function dayRange(isoDateStr) {
  if (!isoDateStr || typeof isoDateStr !== "string") return null;
  const start = new Date(`${isoDateStr}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  return { start, next };
}

/** GET all timesheets for logged-in user */
router.get("/", protect, async (req, res) => {
  try {
    const sheets = await Timesheet.find({ user: req.user._id }).sort({ weekStart: -1 });
    res.json(sheets);
  } catch (err) {
    console.error("Fetch all error", err);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
});

/** Admin: GET timesheets for a specific user */
router.get("/user/:userId", protect, requireRole("admin"), async (req, res) => {
  try {
    const sheets = await Timesheet.find({ user: req.params.userId }).sort({ weekStart: -1 });
    res.json(sheets);
  } catch (err) {
    console.error("Fetch user timesheets error", err);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
});

/** GET timesheet for a specific week (self) */
router.get("/:weekStart", protect, async (req, res) => {
  try {
    const range = dayRange(req.params.weekStart);
    if (!range) return res.status(400).json({ error: "Invalid weekStart. Expected YYYY-MM-DD" });

    const sheet = await Timesheet.findOne({
      user: req.user._id,
      weekStart: { $gte: range.start, $lt: range.next },
    });

    if (!sheet) return res.json({ rows: [], status: "new" });
    res.json(sheet);
  } catch (err) {
    console.error("Fetch error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST create/update timesheet with atomic upsert and NO-DOWNGRADE guard
 * Body: { weekStart: "YYYY-MM-DD", rows: [...], submit?: boolean, status?: "submitted" }
 */
router.post("/", protect, async (req, res) => {
  try {
    const { weekStart, rows, submit, status: reqStatus } = req.body;
    const range = dayRange(weekStart);
    if (!range) return res.status(400).json({ error: "Invalid or missing weekStart (YYYY-MM-DD)" });

    const wantsSubmit =
      submit === true ||
      (typeof reqStatus === "string" && reqStatus.toLowerCase() === "submitted");

    const existing = await Timesheet.findOne({
      user: req.user._id,
      weekStart: { $gte: range.start, $lt: range.next },
    }).select("status");

    let nextStatus = "draft";
    if (wantsSubmit) nextStatus = "submitted";
    else if (existing) nextStatus = existing.status !== "draft" ? existing.status : "draft";

    const update = {
      user: req.user._id,
      weekStart: range.start,
      rows: Array.isArray(rows) ? rows : [],
      status: nextStatus,
    };
    if (wantsSubmit) update.submittedAt = new Date();

    const saved = await Timesheet.findOneAndUpdate(
      { user: req.user._id, weekStart: { $gte: range.start, $lt: range.next } },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json(saved);
  } catch (err) {
    if (err && err.code === 11000) {
      console.error("Duplicate week record:", err.keyValue);
      return res.status(409).json({ error: "Duplicate week record. Please retry." });
    }
    console.error("Save error", err);
    res.status(500).json({ error: "Failed to save" });
  }
});

// inside routes/timesheets.js (replace previous handler)
router.post("/:id/submit-rows", protect, async (req, res) => {
  try {
    const sourceId = req.params.id;
    const { weekStart, rows } = req.body;

    console.log("[submit-rows] incoming", { sourceId, weekStart, rowsType: Array.isArray(rows) ? `array(${rows.length})` : typeof rows });

    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "Invalid payload: 'rows' must be an array." });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid payload: 'rows' must be a non-empty array." });
    }

    // find source sheet (to validate existence & permission)
    const source = await Timesheet.findById(sourceId);
    if (!source) return res.status(404).json({ error: "Source timesheet not found" });

    if (String(source.user) !== String(req.user._id) && req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({ error: "Forbidden to submit rows from this sheet" });
    }

    // Accept weekStart from body; if missing, try to derive from source.weekStart
    const effectiveWeekStart = typeof weekStart === "string" && weekStart.length >= 10
      ? weekStart.slice(0, 10)
      : (source.weekStart ? new Date(source.weekStart).toISOString().slice(0,10) : null);

    const range = dayRange(effectiveWeekStart);
    if (!range) return res.status(400).json({ error: "Invalid or missing weekStart (expected YYYY-MM-DD)." });

    // normalize and validate rows shape early to give better errors
    const normalized = rows.map((r, idx) => {
      if (!r || typeof r !== "object") throw new Error(`Row at index ${idx} is not an object`);
      const hours = Array.isArray(r.hours) ? r.hours.slice(0, 7).map(h => {
        const n = Number(h);
        return Number.isFinite(n) ? Math.max(0, Math.min(24, Math.trunc(n))) : 0;
      }) : Array.from({ length: 7 }).map(() => 0);
      const comments = Array.isArray(r.comments) ? r.comments.slice(0, 7).map(c => (c == null ? null : String(c))) : Array.from({ length: 7 }).map(() => null);
      return {
        client: r.client || "",
        project: r.project || "",
        task: r.task || "",
        activity: r.activity || "",
        hours,
        comments,
      };
    });

    // find or create destination timesheet for the logged-in user and the weekStart
    let dest = await Timesheet.findOne({
      user: req.user._id,
      weekStart: { $gte: range.start, $lt: range.next },
    });

    if (!dest) {
      dest = new Timesheet({
        user: req.user._id,
        weekStart: range.start,
        rows: normalized,
        status: "submitted",
        submittedAt: new Date(),
      });
      await dest.save();
    } else {
      dest.rows = dest.rows.concat(normalized).slice(0, 1000);
      dest.status = "submitted";
      dest.submittedAt = new Date();
      await dest.save();
    }

    return res.json({ ok: true, destId: dest._id });
  } catch (err) {
    console.error("[submit-rows] error:", err && err.message ? err.message : err);
    // If the error is the thrown row-shape error above, return its message
    return res.status(500).json({ error: err.message || "Failed to submit selected rows" });
  }
});


/**
 * POST /comments
 * Body:
 *   {
 *     sheetId: string | null,       // if falsy (null/undefined) the server will find/create by weekStart+user
 *     weekStart: "YYYY-MM-DD",      // required if sheetId is falsy
 *     rowIndex: number,
 *     dayIndex: number,             // 0..6
 *     text: string
 *   }
 */
router.post("/comments", protect, async (req, res) => {
  try {
    const { sheetId, weekStart, rowIndex, dayIndex, text } = req.body;

    if (typeof rowIndex !== "number" || typeof dayIndex !== "number") {
      return res.status(400).json({ error: "rowIndex and dayIndex must be numbers" });
    }
    if (dayIndex < 0 || dayIndex >= DAYS_IN_WEEK) {
      return res.status(400).json({ error: "dayIndex out of range" });
    }

    let sheet = null;
    if (sheetId) {
      sheet = await Timesheet.findById(sheetId);
      if (!sheet) return res.status(404).json({ error: "Timesheet not found" });
      // only owner or manager/admin may update an arbitrary sheet
      if (String(sheet.user) !== String(req.user._id) && req.user.role !== "admin" && req.user.role !== "manager") {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      const range = dayRange(weekStart);
      if (!range) return res.status(400).json({ error: "Missing or invalid weekStart (YYYY-MM-DD)" });

      sheet = await Timesheet.findOne({
        user: req.user._id,
        weekStart: { $gte: range.start, $lt: range.next },
      });

      if (!sheet) {
        // create a new blank sheet for this week
        const emptyRow = {
          client: "",
          project: "",
          task: "",
          activity: "",
          hours: Array.from({ length: DAYS_IN_WEEK }).map(() => 0),
          comments: Array.from({ length: DAYS_IN_WEEK }).map(() => null),
        };
        sheet = new Timesheet({
          user: req.user._id,
          weekStart: range.start,
          rows: [emptyRow],
          status: "draft",
        });
      }
    }

    // ensure rows array is large enough
    while (sheet.rows.length <= rowIndex) {
      sheet.rows.push({
        client: "",
        project: "",
        task: "",
        activity: "",
        hours: Array.from({ length: DAYS_IN_WEEK }).map(() => 0),
        comments: Array.from({ length: DAYS_IN_WEEK }).map(() => null),
      });
    }

    // ensure comments array exists for target row
    if (!Array.isArray(sheet.rows[rowIndex].comments)) {
      sheet.rows[rowIndex].comments = Array.from({ length: DAYS_IN_WEEK }).map(() => null);
    }

    sheet.rows[rowIndex].comments[dayIndex] = (text === "" ? null : String(text));

    await sheet.save();

    res.json({ ok: true, sheet });
  } catch (err) {
    console.error("save comment error", err);
    res.status(500).json({ error: "Failed to save comment" });
  }
});

/** Manager approves a submitted sheet */
router.patch("/:id/approve", protect, requireRole("manager"), async (req, res) => {
  try {
    const doc = await Timesheet.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Timesheet not found" });

    if (doc.status === "submitted" || doc.status === "rejected") {
      doc.status = "approved";
      doc.reviewedAt = new Date();
      doc.reviewedBy = req.user._id;
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    console.error("Approve error", err);
    res.status(500).json({ error: "Approve failed" });
  }
});

/** Manager rejects a submitted sheet */
router.patch("/:id/reject", protect, requireRole("manager"), async (req, res) => {
  try {
    const doc = await Timesheet.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Timesheet not found" });

    if (doc.status === "submitted" || doc.status === "approved") {
      doc.status = "rejected";
      doc.reviewedAt = new Date();
      doc.reviewedBy = req.user._id;
      await doc.save();
    }
    res.json(doc);
  } catch (err) {
    console.error("Reject error", err);
    res.status(500).json({ error: "Reject failed" });
  }
});

module.exports = router;
