// src/pages/TimesheetDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { http } from "../api/http";

// --- helpers --------------------------------------------------------------

function getWeekRange(date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(base);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);

  // Mon–Sat week (remove Sunday)
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  const fmt = (d) => {
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return {
    startDate: monday,
    endDate: saturday,
    label: `${fmt(monday)} - ${fmt(saturday)}`,
  };
}


// --- Task / Activity mapping from PDF -------------------------------------

const taskActivityMap = {
  "Analysis/Design": [
    "Architecture",
    "Database",
    "Workflow",
    "UI/UX",
    "Mock ups",
    "Analysis",
  ],
  Deployment: ["QA", "UAT", "Production"],
  Development: [
    "Documentation",
    "Follow-up",
    "Issue Resolution",
    "KT",
    "Troubleshooting",
    "API",
    "Development",
    "Design",
    "Interview",
    "Invoice",
    "Presentations",
    "Re-work",
    "Training",
    "Team Meeting",
  ],
  Documentation: [
    "Business Requirements",
    "Development Specifications",
    "Test Cases",
    "Release Notes",
    "User Manual",
    "Use Cases",
  ],
  "HR Interview": ["HR Interview", "Offer Rollout", "Negotiations"],
  Meetings: ["Organisations Meeting", "Coordination"],
  Interviews: ["L1 Interview", "L2 Interview", "Client Interview", "Followups"],
  Monitoring: ["Presentation check list", "Resolve Issue", "Release", "Data Fix", "Data load"],
  "Leave/Holiday": ["Holiday", "Leave-PTO"],
  PTO: ["PTO"],
  Onboarding: ["Collecting Documents"],
  QA: ["Test Case Execution", "Re-Testing", "Defect Logging", "Release testing"],
  Audit: ["Level 1 Audit", "Level 2 Audit"],
  PoC: ["Workflow Desgin", "Demo"],
  Reviews: ["Design Review", "Code Review", "Documentation Review"],
};

const taskOptions = Object.keys(taskActivityMap);

const MAX_ROWS = 5;
const MIN_ROWS = 2;

const makeEmptyRow = () => ({
  client: "",
  project: "",
  task: "",
  activity: "",
  // 6 days (Mon–Sat)
  hours: [0, 0, 0, 0, 0, 0],
});

const padToMinRows = (rows) => {
  // normalize any incoming rows to 6 days for perfect totals alignment
  const copy = (rows || []).map((r) => {
    const hrs = Array.isArray(r.hours) ? r.hours.slice(0, 6) : [];
    while (hrs.length < 6) hrs.push(0);
    return { ...r, hours: hrs };
  });
  while (copy.length < MIN_ROWS) copy.push(makeEmptyRow());
  return copy.slice(0, MAX_ROWS);
};

// --- component ------------------------------------------------------------

export default function TimesheetDashboard({ onLogout }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { startDate, label } = useMemo(() => getWeekRange(currentDate), [currentDate]);
  const weekStartStr = useMemo(
    () => new Date(startDate).toISOString().slice(0, 10),
    [startDate]
  );

  const [rows, setRows] = useState(padToMinRows([]));
  const [status, setStatus] = useState("draft"); // draft | submitted | approved | rejected

  // Fetch from API per week
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sheet = await http.get(`/timesheets/${weekStartStr}`);
        const next =
          sheet && Array.isArray(sheet.rows)
            ? padToMinRows(sheet.rows)
            : padToMinRows([]);
        if (alive) {
          setRows(next);
          setStatus(sheet?.status || "draft");
        }
      } catch (e) {
        console.error("❌ fetch timesheet failed:", e);
        if (alive) {
          setRows(padToMinRows([]));
          setStatus("draft");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [weekStartStr]);

  // allow editing until manager review completes (approved/rejected)
  const editable = status !== "approved" && status !== "rejected";

  // navigation
  const prevWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const nextWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  // row operations
  const addRow = () => {
    if (rows.length >= MAX_ROWS || !editable) return;
    setRows((r) => [...r, makeEmptyRow()]);
  };
  const removeRow = (idx) => {
    if (!editable) return;
    const copy = rows.filter((_, i) => i !== idx);
    setRows(padToMinRows(copy));
  };

  const handleChange = (i, field, value) => {
    if (!editable) return;
    setRows((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      if (field === "task") copy[i].activity = "";
      return copy;
    });
  };
  const handleHourChange = (rowIdx, dayIdx, value) => {
    if (!editable) return;
    const n = Math.max(0, Math.min(9, Number.isFinite(+value) ? parseInt(value, 10) : 0));
    setRows((prev) => {
      const copy = [...prev];
      const hours = [...copy[rowIdx].hours];
      hours[dayIdx] = n;
      copy[rowIdx] = { ...copy[rowIdx], hours };
      return copy;
    });
  };

  // validation helpers (for submit)
  const isRowEmpty = (r) =>
    (r.client || "").trim() === "" &&
    (r.project || "").trim() === "" &&
    (r.task || "").trim() === "" &&
    (r.activity || "").trim() === "" &&
    r.hours.every((h) => (parseInt(h, 10) || 0) === 0);

  const isRowComplete = (r) =>
    (r.client || "").trim() !== "" &&
    (r.project || "").trim() !== "" &&
    (r.task || "").trim() !== "" &&
    (r.activity || "").trim() !== "" &&
    r.hours.some((h) => (parseInt(h, 10) || 0) > 0);

  const validateForSubmit = (rowsToCheck) => {
    const meaningful = rowsToCheck.filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) {
      alert("⚠️ Please enter at least one row with Client, Project, Task, Activity and some hours before submitting.");
      return false;
    }
    const firstInvalidIndex = meaningful.findIndex((r) => !isRowComplete(r));
    if (firstInvalidIndex !== -1) {
      alert("⚠️ Please complete all required fields (Client, Project, Task, Activity) and enter hours for each non-empty row before submitting.");
      return false;
    }
    return true;
  };

  // totals
  const totalByRow = (row) => row.hours.reduce((s, h) => s + (parseInt(h, 10) || 0), 0);
  const totalByDay = (dayIdx) =>
    rows.reduce((s, r) => s + (parseInt(r.hours[dayIdx], 10) || 0), 0);
  const grandTotal = () => rows.reduce((s, r) => s + totalByRow(r), 0);

  async function saveTimesheet() {
    if (!editable) return alert("🔒 Timesheet is locked after manager review.");
    // 👇 send submit: false, and reflect server status back into UI
    const payload = { weekStart: weekStartStr, rows: rows.slice(0, MAX_ROWS), submit: false };
    const saved = await http.post("/timesheets", payload);
    setStatus(saved?.status || status);
    alert("💾 Timesheet saved.");
  }

  async function submitTimesheet() {
    if (!editable) return alert("🔒 Timesheet is locked after manager review.");
    const trimmed = rows.slice(0, MAX_ROWS);
    if (!validateForSubmit(trimmed)) return;
    // 👇 send submit: true (NOT status: "submitted")
    const payload = { weekStart: weekStartStr, rows: trimmed, submit: true };
    const saved = await http.post("/timesheets", payload);
    setStatus(saved?.status || "submitted");
    alert("✅ Timesheet submitted! You can still edit until your manager completes the review.");
  }

  // Mon–Sat only
  const dayLabels = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  });

  return (
    <div className="p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Timesheet Input</h1>
        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </header>

      {/* Week navigation + Add row + Status */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevWeek} className="p-2 rounded hover:bg-gray-100 border">
          <ChevronLeft />
        </button>
        <button onClick={nextWeek} className="p-2 rounded hover:bg-gray-100 border">
          <ChevronRight />
        </button>
        <span className="font-semibold">Week: {label}</span>
        <span
          className={`ml-2 text-xs px-2 py-1 rounded-full ${
            status === "approved"
              ? "bg-green-100 text-green-700"
              : status === "rejected"
              ? "bg-red-100 text-red-700"
              : status === "submitted"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-700"
          }`}
          title="Timesheet status"
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>

        <div className="ml-auto">
          <button
            onClick={addRow}
            disabled={rows.length >= MAX_ROWS || !editable}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              rows.length >= MAX_ROWS || !editable
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <Plus size={18} /> Add Row ({rows.length}/{MAX_ROWS})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-lg rounded-2xl bg-white">
        <table className="w-full border-collapse text-sm table-fixed">
          {/* 🔒 Lock column widths so footer aligns with header/body */}
          <colgroup>
            <col style={{ width: "8rem" }} />   {/* Client */}
            <col style={{ width: "8rem" }} />   {/* Project */}
            <col style={{ width: "10rem" }} />  {/* Task */}
            <col style={{ width: "11rem" }} />  {/* Activity */}
            {Array.from({ length: 6 }).map((_, i) => (
              <col key={`daycol-${i}`} style={{ width: "3.5rem" }} />
            ))}
            <col style={{ width: "3.5rem" }} />  {/* Row Total */}
            <col style={{ width: "2.5rem" }} />  {/* Actions */}
          </colgroup>

          <thead>
            <tr className="bg-gray-200 text-gray-700">
              <th className="p-2">Client</th>
              <th className="p-2">Project</th>
              <th className="p-2">Task</th>
              <th className="p-2">Activity</th>
              {dayLabels.map((d, i) => (
                <th key={i} className="p-2 text-center">{d}</th>
              ))}
              <th className="p-2">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <input
                    className="border rounded-lg p-2 w-32"
                    value={row.client}
                    disabled={!editable}
                    onChange={(e) => handleChange(rowIdx, "client", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="border rounded-lg p-2 w-32"
                    value={row.project}
                    disabled={!editable}
                    onChange={(e) => handleChange(rowIdx, "project", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <select
                    className="border rounded-lg p-2 w-40"
                    value={row.task}
                    disabled={!editable}
                    onChange={(e) => handleChange(rowIdx, "task", e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {taskOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="border rounded-lg p-2 w-44"
                    value={row.activity}
                    disabled={!editable || !row.task}
                    onChange={(e) => handleChange(rowIdx, "activity", e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {(taskActivityMap[row.task] || []).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </td>
                {row.hours.map((h, dayIdx) => (
                  <td key={dayIdx} className="p-2 text-center">
                    <input
                      type="number"
                      min="0"
                      max="9"
                      value={h}
                      disabled={!editable}
                      onChange={(e) => handleHourChange(rowIdx, dayIdx, e.target.value)}
                      className="w-14 border rounded-lg text-center"
                    />
                  </td>
                ))}
                <td className="p-2 text-center">{totalByRow(row)}</td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => removeRow(rowIdx)}
                    disabled={!editable}
                    className={`p-2 rounded ${
                      editable ? "hover:bg-gray-100" : "cursor-not-allowed text-gray-400"
                    }`}
                    title="Remove row"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan="4" className="p-2">Totals</td>
              {dayLabels.map((_, i) => (
                <td key={i} className="p-2 text-center">{totalByDay(i)}</td>
              ))}
              <td className="p-2 text-center">{grandTotal()}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={saveTimesheet}
          disabled={!editable}
          className={`px-4 py-2 rounded-lg ${
            editable ? "bg-gray-500 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Save
        </button>
        <button
          onClick={submitTimesheet}
          disabled={!editable}
          className={`px-4 py-2 rounded-lg ${
            editable ? "bg-green-600 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
