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

  // All saved sheets (we'll filter by weekStart)
  const [allSheets, setAllSheets] = useState([]);
  const [loadingSheetsList, setLoadingSheetsList] = useState(false);
  const [loadingCurrentWeek, setLoadingCurrentWeek] = useState(false);

  // expanded state for detailed view of saved items
  const [expandedSaved, setExpandedSaved] = useState({});

  // Fetch the specific week from server (the editor content)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCurrentWeek(true);
      try {
        const sheet = await http.get(`/timesheets/${weekStartStr}`);
        const next =
          sheet && Array.isArray(sheet.rows)
            ? padToMinRows(sheet.rows)
            : padToMinRows([]);
        if (alive) {
          setRows(next);
          const s = sheet?.status;
          setStatus(s === "new" || !s ? "draft" : s);
        }
      } catch (e) {
        console.error("❌ fetch timesheet failed:", e);
        if (alive) {
          setRows(padToMinRows([]));
          setStatus("draft");
        }
      } finally {
        setLoadingCurrentWeek(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [weekStartStr]);

  // Fetch all timesheets (history). We'll filter locally for the current week.
  const fetchAllSheets = async () => {
    try {
      setLoadingSheetsList(true);
      const res = await http.get("/timesheets"); // expects array
      setAllSheets(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to fetch sheets list:", err);
      setAllSheets([]);
    } finally {
      setLoadingSheetsList(false);
    }
  };

  useEffect(() => {
    fetchAllSheets();
  }, []);

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
    try {
      const payload = { weekStart: weekStartStr, rows: rows.slice(0, MAX_ROWS), submit: false };
      const saved = await http.post("/timesheets", payload);
      if (saved) {
        setRows(padToMinRows(saved.rows || []));
        setStatus(saved.status || status);
      }
      await fetchAllSheets(); // refresh list so saved item appears
      alert("💾 Timesheet saved.");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save timesheet");
    }
  }

  async function submitTimesheet() {
    if (!editable) return alert("🔒 Timesheet is locked after manager review.");
    const trimmed = rows.slice(0, MAX_ROWS);
    if (!validateForSubmit(trimmed)) return;
    try {
      const payload = { weekStart: weekStartStr, rows: trimmed, submit: true };
      const saved = await http.post("/timesheets", payload);
      if (saved) {
        setRows(padToMinRows(saved.rows || []));
        setStatus(saved.status || "submitted");
      } else {
        setStatus("submitted");
      }
      await fetchAllSheets();
      alert("✅ Timesheet submitted! You can still edit until your manager completes the review.");
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit timesheet");
    }
  }

  // load a saved timesheet into the editor
  const loadSaved = (sheet) => {
    if (!sheet) return;
    const d = new Date(sheet.weekStart);
    setCurrentDate(d);
    setRows(padToMinRows(sheet.rows || []));
    setStatus(sheet.status || "draft");
  };

  // derive sheets for current week (saved + submitted). Many systems store one timesheet per week per user,
  // but if backend keeps multiple revisions we filter allSheets by weekStart to show them here.
  const sheetsForWeek = useMemo(() => {
    return allSheets.filter((s) => {
      // s.weekStart expected ISO date string yyyy-mm-dd
      return s && s.weekStart && s.weekStart.slice(0, 10) === weekStartStr;
    }).sort((a,b) => new Date(b.updatedAt || b.createdAt || b.weekStart) - new Date(a.updatedAt || a.createdAt || a.weekStart));
  }, [allSheets, weekStartStr]);

  // Mon–Sat only labels
  const dayLabels = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  });

  function StatusBadge({ s }) {
    const map = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    const label = (s || "draft").charAt(0).toUpperCase() + (s || "draft").slice(1);
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s] || "bg-gray-100"}`}>{label}</span>;
  }

  // toggle expand saved item
  const toggleExpand = (id) => {
    setExpandedSaved((prev)=> ({ ...prev, [id]: !prev[id]}));
  };

  // compute total hours inside a saved sheet
  const totalForSheet = (sheet) => {
    if (!sheet || !Array.isArray(sheet.rows)) return 0;
    return sheet.rows.reduce((acc, r) => acc + (Array.isArray(r.hours) ? r.hours.reduce((a,h)=> a + (parseInt(h,10)||0), 0) : 0), 0);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 p-6">
      {/* floating decor */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 w-72 h-72 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute -bottom-28 -right-24 w-96 h-96 bg-gradient-to-tr from-green-100 to-teal-50 rounded-full opacity-30 blur-3xl animate-float-slow" />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Timesheet Input</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600 mr-3">Week: <span className="font-medium">{label}</span></div>
          <div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-white border p-2 rounded-lg shadow hover:shadow-md transition"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z" fill="#1f2937"/>
                <path d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z" fill="#1f2937"/>
              </svg>
              <span className="text-slate-700 font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Controls row */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevWeek} className="p-2 rounded-lg border bg-white hover:bg-slate-50">
          <ChevronLeft />
        </button>
        <button onClick={nextWeek} className="p-2 rounded-lg border bg-white hover:bg-slate-50">
          <ChevronRight />
        </button>

        <div className="ml-auto flex items-center gap-3">
          <div>
            <button
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS || !editable}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${rows.length >= MAX_ROWS || !editable ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50"}`}
            >
              <Plus size={16} /> Add Row ({rows.length}/{MAX_ROWS})
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={saveTimesheet} disabled={!editable} className={`px-4 py-2 rounded-lg ${editable ? "bg-gray-700 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Save</button>
            <button onClick={submitTimesheet} disabled={!editable} className={`px-4 py-2 rounded-lg ${editable ? "bg-green-600 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Submit</button>
          </div>
        </div>
      </div>

      {/* Main panel (editor) */}
      <div className="overflow-x-auto shadow-lg rounded-2xl bg-white p-4 border">
        <table className="w-full border-collapse text-sm table-fixed">
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
            {Array.from({ length: 6 }).map((_, i) => (
              <col key={`daycol-${i}`} style={{ width: "5.5rem" }} />
            ))}
            <col style={{ width: "4.5rem" }} />
            <col style={{ width: "3rem" }} />
          </colgroup>

          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Project</th>
              <th className="p-3 text-left">Task</th>
              <th className="p-3 text-left">Activity</th>
              {dayLabels.map((d, i) => <th key={i} className="p-3 text-center">{d}</th>)}
              <th className="p-3 text-center">Total</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b hover:bg-slate-50">
                <td className="p-2">
                  <input className="w-full border rounded-lg p-2" value={row.client} disabled={!editable} onChange={(e) => handleChange(rowIdx, "client", e.target.value)} />
                </td>
                <td className="p-2">
                  <input className="w-full border rounded-lg p-2" value={row.project} disabled={!editable} onChange={(e) => handleChange(rowIdx, "project", e.target.value)} />
                </td>
                <td className="p-2">
                  <select className="w-full border rounded-lg p-2" value={row.task} disabled={!editable} onChange={(e) => handleChange(rowIdx, "task", e.target.value)}>
                    <option value="">-- Select --</option>
                    {taskOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full border rounded-lg p-2" value={row.activity} disabled={!editable || !row.task} onChange={(e) => handleChange(rowIdx, "activity", e.target.value)}>
                    <option value="">-- Select --</option>
                    {(taskActivityMap[row.task] || []).map((a) => (<option key={a} value={a}>{a}</option>))}
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
                  <button onClick={() => removeRow(rowIdx)} disabled={!editable} className={`p-2 rounded ${editable ? "hover:bg-gray-100" : "cursor-not-allowed text-gray-400"}`} title="Remove row">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan="4" className="p-3">Totals</td>
              {dayLabels.map((_, i) => (<td key={i} className="p-3 text-center">{totalByDay(i)}</td>))}
              <td className="p-3 text-center">{grandTotal()}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Saved/submitted detail list for the current week */}
      <section className="max-w-6xl mx-auto mt-6">
        <div className="bg-white rounded-2xl border shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">Saved / Submitted for this week</h3>
            <div className="text-sm text-slate-500">
              {loadingSheetsList ? "Loading…" : `${sheetsForWeek.length} record(s)`}
            </div>
          </div>

          {loadingSheetsList ? (
            <div className="text-center py-6 text-slate-500">Loading saved items…</div>
          ) : sheetsForWeek.length === 0 ? (
            <div className="text-center py-6 text-slate-500">No saved or submitted data for this week.</div>
          ) : (
            <div className="space-y-4">
              {sheetsForWeek.map((s, idx) => {
                const id = s._id || `${s.weekStart}-${idx}`;
                const total = totalForSheet(s);
                const when = new Date(s.updatedAt || s.createdAt || s.weekStart).toLocaleString();
                const expanded = !!expandedSaved[id];
                return (
                  <div key={id} className="border rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm text-slate-500">Saved on</div>
                          <div className="text-sm font-medium">{when}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Week</div>
                          <div className="font-medium">{new Date(s.weekStart).toLocaleDateString("en-GB")}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Total hours</div>
                          <div className="font-medium">{total}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500">Status</div>
                          <div><StatusBadge s={s.status} /></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => loadSaved(s)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg">Load into editor</button>
                        <button onClick={() => toggleExpand(id)} className="bg-white border px-3 py-1 rounded-lg"> {expanded ? "Hide" : "Details"} </button>
                      </div>
                    </div>

                    {/* details (expanded) */}
                    {expanded && (
                      <div className="mt-3 bg-white rounded p-3 border">
                        <table className="w-full text-sm">
                          <thead className="text-slate-600 bg-slate-100">
                            <tr>
                              <th className="p-2 text-left">Client</th>
                              <th className="p-2 text-left">Project</th>
                              <th className="p-2 text-left">Task</th>
                              <th className="p-2 text-left">Activity</th>
                              {Array.from({ length: 6 }).map((_, i) => <th key={i} className="p-2 text-center">{dayLabels[i].split(" ")[0]}</th>)}
                              <th className="p-2 text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(s.rows) && s.rows.length > 0 ? s.rows.map((r, ridx) => {
                              const rowTotal = Array.isArray(r.hours) ? r.hours.reduce((a,h)=> a + (parseInt(h,10)||0), 0) : 0;
                              return (
                                <tr key={ridx} className="border-b">
                                  <td className="p-2">{r.client}</td>
                                  <td className="p-2">{r.project}</td>
                                  <td className="p-2">{r.task}</td>
                                  <td className="p-2">{r.activity}</td>
                                  {Array.from({ length: 6 }).map((_, di) => <td key={di} className="p-2 text-center">{(r.hours && r.hours[di] != null) ? r.hours[di] : 0}</td>)}
                                  <td className="p-2 text-center font-medium">{rowTotal}</td>
                                </tr>
                              );
                            }) : (
                              <tr><td colSpan={12} className="p-3 text-center text-slate-500">No rows</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* animations */}
      <style>{`
        @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-12px); } 100% { transform: translateY(0); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
