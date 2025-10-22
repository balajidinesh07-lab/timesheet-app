// models/Timesheet.js
const mongoose = require("mongoose");

const DAYS_IN_WEEK = 7; // Monday -> Sunday

const RowSchema = new mongoose.Schema(
  {
    client: { type: String, default: "" },
    project: { type: String, default: "" },
    task: { type: String, default: "" },
    activity: { type: String, default: "" },
    // Mon–Sun (7 days)
    hours: {
      type: [Number],
      default: Array.from({ length: DAYS_IN_WEEK }).map(() => 0),
    },
    // per-day comments (strings or null)
    comments: {
      type: [String],
      default: Array.from({ length: DAYS_IN_WEEK }).map(() => null),
    },
  },
  { _id: false }
);

const TimesheetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    weekStart: { type: Date, required: true, index: true }, // Monday 00:00:00Z for the week

    rows: { type: [RowSchema], default: [] },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },

    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    comments: { type: String, default: "" }, // sheet-level comments / admin notes
  },
  { timestamps: true }
);

// unique constraint: one timesheet per user / weekStart
TimesheetSchema.index({ user: 1, weekStart: 1 }, { unique: true });

/** Normalize before save:
 * - weekStart → UTC midnight
 * - rows[].hours → exactly 7 integers clamped 0..24
 * - rows[].comments → exactly 7 items (strings or null)
 */
TimesheetSchema.pre("save", function (next) {
  if (this.weekStart instanceof Date && !Number.isNaN(this.weekStart.getTime())) {
    const d = new Date(this.weekStart);
    d.setUTCHours(0, 0, 0, 0);
    this.weekStart = d;
  }

  const toInt07 = (h) => {
    const n = Number(h);
    if (!Number.isFinite(n)) return 0;
    const t = Math.trunc(n);
    return Math.max(0, Math.min(24, t)); // clamp to 0..24
  };

  if (Array.isArray(this.rows)) {
    this.rows = this.rows.map((r) => {
      // r may be a plain object or mongoose subdoc - normalize
      const out = r && r.toObject ? r.toObject() : { ...(r || {}) };

      const hrs = Array.isArray(out.hours) ? out.hours.slice(0, DAYS_IN_WEEK) : [];
      while (hrs.length < DAYS_IN_WEEK) hrs.push(0);
      out.hours = hrs.map(toInt07);

      const cms = Array.isArray(out.comments) ? out.comments.slice(0, DAYS_IN_WEEK) : [];
      while (cms.length < DAYS_IN_WEEK) cms.push(null);
      out.comments = cms.map((c) => (c == null ? null : String(c)));

      return out;
    });
  }

  next();
});

module.exports = mongoose.model("Timesheet", TimesheetSchema);
