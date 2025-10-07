const mongoose = require("mongoose");

const RowSchema = new mongoose.Schema(
  {
    client: String,
    project: String,
    task: String,
    activity: String,
    // Mon–Sat (6 days)
    hours: {
      type: [Number],
      default: [0, 0, 0, 0, 0, 0],
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
    comments: { type: String, default: "" },
  },
  { timestamps: true }
);

// 🔒 only one timesheet per (user, weekStart)
TimesheetSchema.index({ user: 1, weekStart: 1 }, { unique: true });

/** Normalize before save:
 * - weekStart → UTC midnight
 * - rows[].hours → exactly 6 integers clamped 0..9
 */
TimesheetSchema.pre("save", function (next) {
  if (this.weekStart instanceof Date && !Number.isNaN(this.weekStart.getTime())) {
    const d = new Date(this.weekStart);
    d.setUTCHours(0, 0, 0, 0);
    this.weekStart = d;
  }

  const toInt06 = (h) => {
    const n = Number(h);
    if (!Number.isFinite(n)) return 0;
    const t = Math.trunc(n);
    return Math.max(0, Math.min(9, t));
  };

  if (Array.isArray(this.rows)) {
    this.rows = this.rows.map((r) => {
      const out = { ...r };
      const hrs = Array.isArray(out.hours) ? out.hours.slice(0, 6) : [];
      while (hrs.length < 6) hrs.push(0);
      out.hours = hrs.map(toInt06);
      return out;
    });
  }

  next();
});

module.exports = mongoose.model("Timesheet", TimesheetSchema);
