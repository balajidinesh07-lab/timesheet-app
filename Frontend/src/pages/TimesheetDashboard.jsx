// src/pages/TimesheetDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png"; // update path if needed
import { getUser as getSessionUser } from "../utils/session";

// --- helpers --------------------------------------------------------------
function getWeekRange(date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(base);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  return { startDate: monday, endDate: sunday, label: `${fmt(monday)} - ${fmt(sunday)}` };
}

// --- Task / Activity mapping ----------------------------------------------
const taskActivityMap = {
  "Analysis/Design": ["Architecture", "Database", "Workflow", "UI/UX", "Mock ups", "Analysis"],
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
  Documentation: ["Business Requirements", "Development Specifications", "Test Cases", "Release Notes", "User Manual", "Use Cases"],
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

// ---- CONFIG ----
const MAX_ROWS = 5;
const MIN_ROWS = 2; // default rows to show when editor empty
const DAYS_IN_WEEK = 7; // Monday -> Sunday

const makeEmptyRow = () => ({
  client: "",
  project: "",
  task: "",
  activity: "",
  hours: Array.from({ length: DAYS_IN_WEEK }).map(() => 0), // Mon-Sun
  comments: Array.from({ length: DAYS_IN_WEEK }).map(() => null),
});

const padToMinRows = (rows) => {
  const copy = (rows || []).map((r) => {
    const hrs = Array.isArray(r.hours) ? r.hours.slice(0, DAYS_IN_WEEK) : [];
    while (hrs.length < DAYS_IN_WEEK) hrs.push(0);
    const comments = Array.isArray(r.comments) ? r.comments.slice(0, DAYS_IN_WEEK) : [];
    while (comments.length < DAYS_IN_WEEK) comments.push(null);
    return { ...r, hours: hrs, comments };
  });
  while (copy.length < MIN_ROWS) copy.push(makeEmptyRow());
  return copy.slice(0, MAX_ROWS);
};

function toIsoDateString(date) {
  if (!(date instanceof Date)) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  const adjusted = new Date(date.getTime() - offsetMs);
  return adjusted.toISOString().slice(0, 10);
}

function isoFromValue(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toIsoDateString(date);
}

// ---------- Profile helpers -----------------------------------------
function getProfileFromStorage() {
  const sessionUser = getSessionUser() || {};
  const photo = localStorage.getItem("profilePhoto") || null;
  const name =
    sessionUser.name ||
    localStorage.getItem("name") ||
    localStorage.getItem("userName") ||
    "";
  const email = sessionUser.email || localStorage.getItem("email") || "";
  return { photo, name, email };
}
function initialsFromName(name) {
  if (!name) return "EU";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || name.slice(0, 2).toUpperCase();
}

// --- component ------------------------------------------------------------
export default function TimesheetDashboard({ onLogout }) {
  const navigate = useNavigate();
  const gotoPayroll = () => navigate("/payroll");

  const [currentDate, setCurrentDate] = useState(new Date());
  const { startDate, label } = useMemo(() => getWeekRange(currentDate), [currentDate]);
  const weekStartStr = useMemo(() => toIsoDateString(new Date(startDate)), [startDate]);

  const [rows, setRows] = useState(padToMinRows([]));
  const [status, setStatus] = useState("draft");
  const [allSheets, setAllSheets] = useState([]);
  const [loadingSheetsList, setLoadingSheetsList] = useState(false);
  const [loadingCurrentWeek, setLoadingCurrentWeek] = useState(false);

  const [expandedSaved, setExpandedSaved] = useState({});
  const [savedRowSelection, setSavedRowSelection] = useState({});
  const [editingSaved, setEditingSaved] = useState(null);
  const [editingRows, setEditingRows] = useState([]);
  // commentModal.meta.readOnly will mark whether textarea is editable
  const [commentModal, setCommentModal] = useState({ open: false, sheetId: null, rowIndex: null, dayIndex: null, text: "", meta: {} });

  // profile info cached on first render
  const profile = useMemo(() => getProfileFromStorage(), []);

  // row helpers
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

  // fetch editor data for week
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCurrentWeek(true);
      try {
        const sheet = await http.get(`/timesheets/${weekStartStr}`);
        const next = sheet && Array.isArray(sheet.rows) ? padToMinRows(sheet.rows) : padToMinRows([]);
        if (alive) {
          setRows(next);
          setStatus(sheet?.status || "draft");
        }
      } catch (err) {
        console.error("fetch timesheet failed:", err);
        if (alive) {
          setRows(padToMinRows([]));
          setStatus("draft");
        }
      } finally {
        if (alive) setLoadingCurrentWeek(false);
      }
    })();
    return () => { alive = false; };
  }, [weekStartStr]);

  // fetch all sheets (history)
  const fetchAllSheets = async () => {
    try {
      setLoadingSheetsList(true);
      const res = await http.get("/timesheets");
      setAllSheets(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to fetch sheets list:", err);
      setAllSheets([]);
    } finally {
      setLoadingSheetsList(false);
    }
  };
  useEffect(() => { fetchAllSheets(); }, []);

  const editable = status !== "approved" && status !== "rejected";

  // nav
  const prevWeek = () => { const d = new Date(startDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(startDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };

  // editor row ops
  const addRow = () => { if (rows.length >= MAX_ROWS || !editable) return; setRows((r) => [...r, makeEmptyRow()]); };
  const removeRow = (idx) => { if (!editable) return; const copy = rows.filter((_, i) => i !== idx); setRows(padToMinRows(copy)); };
  const handleChange = (i, field, value) => { if (!editable) return; setRows((prev) => { const copy = [...prev]; copy[i] = { ...copy[i], [field]: value }; if (field === "task") copy[i].activity = ""; return copy; }); };
  const handleHourChange = (rowIdx, dayIdx, value) => { if (!editable) return; const n = Math.max(0, Math.min(24, Number.isFinite(+value) ? parseInt(value, 10) : 0)); setRows((prev) => { const copy = [...prev]; const hours = [...copy[rowIdx].hours]; hours[dayIdx] = n; copy[rowIdx] = { ...copy[rowIdx], hours }; return copy; }); };

  // totals
  const totalByRow = (row) => row.hours.reduce((s, h) => s + (parseInt(h, 10) || 0), 0);
  const totalByDay = (dayIdx) => rows.reduce((s, r) => s + (parseInt(r.hours[dayIdx], 10) || 0), 0);
  const grandTotal = () => rows.reduce((s, r) => s + totalByRow(r), 0);

  // save/submit (exclude empty rows)
  async function saveTimesheet() {
    if (!editable) return alert("ðŸ”’ Timesheet is locked after manager review.");
    const meaningful = (rows || []).filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) return alert("Nothing to save â€” all rows are empty.");
    try {
      const payload = { weekStart: weekStartStr, rows: meaningful.slice(0, MAX_ROWS), submit: false };
      const saved = await http.post("/timesheets", payload);
      if (saved) {
        setRows(padToMinRows(saved.rows || meaningful));
        setStatus(saved.status || status);
      }
      await fetchAllSheets();
      alert("ðŸ’¾ Timesheet saved (empty rows excluded).");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save timesheet");
    }
  }

  async function submitTimesheet() {
    if (!editable) return alert("ðŸ”’ Timesheet is locked after manager review.");
    const meaningful = (rows || []).filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) return alert("Please add at least one row with hours before submitting.");
    if (!validateForSubmit(meaningful)) return;
    try {
      const payload = { weekStart: weekStartStr, rows: meaningful.slice(0, MAX_ROWS), submit: true };
      const saved = await http.post("/timesheets", payload);
      if (saved) {
        setRows(padToMinRows(saved.rows || meaningful));
        setStatus(saved.status || "submitted");
      } else {
        setStatus("submitted");
      }
      await fetchAllSheets();
      alert("âœ… Timesheet submitted. Empty rows were not included.");
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit timesheet");
    }
  }

  const validateForSubmit = (rowsToCheck) => {
    const meaningful = rowsToCheck.filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) { alert("âš ï¸ Please enter at least one row with Client, Project, Task, Activity and some hours before submitting."); return false; }
    const firstInvalidIndex = meaningful.findIndex((r) => !isRowComplete(r));
    if (firstInvalidIndex !== -1) { alert("âš ï¸ Please complete all required fields (Client, Project, Task, Activity) and enter hours for each non-empty row before submitting."); return false; }
    return true;
  };

  // saved sheets for current week
  const sheetsForWeek = useMemo(() => {
    return allSheets
      .filter((s) => isoFromValue(s?.weekStart) === weekStartStr)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || b.weekStart) - new Date(a.updatedAt || a.createdAt || a.weekStart));
  }, [allSheets, weekStartStr]);

  // saved selection toggles
  const toggleSavedRow = (sheetId, rowIndex) => {
    setSavedRowSelection((prev) => {
      const next = { ...(prev || {}) };
      next[sheetId] = next[sheetId] || { all: false, rows: {} };
      if (next[sheetId].rows[rowIndex]) delete next[sheetId].rows[rowIndex];
      else next[sheetId].rows[rowIndex] = true;
      const totalRows = (sheetsForWeek.find((s) => (s._id || "") === sheetId)?.rows || []).length || 0;
      const selectedCount = Object.keys(next[sheetId].rows).length;
      next[sheetId].all = selectedCount > 0 && selectedCount === totalRows;
      return next;
    });
  };

  const toggleSavedSelectAll = (sheetId) => {
    setSavedRowSelection((prev) => {
      const next = { ...(prev || {}) };
      const target = sheetsForWeek.find((s) => (s._id || "") === sheetId);
      const total = (target?.rows || []).length || 0;
      next[sheetId] = next[sheetId] || { all: false, rows: {} };
      const willSelectAll = !next[sheetId].all;
      next[sheetId].all = !!willSelectAll;
      next[sheetId].rows = {};
      if (willSelectAll) for (let i = 0; i < total; i++) next[sheetId].rows[i] = true;
      return next;
    });
  };

  async function submitSelectedSavedRows() {
    try {
      const payloadBundles = [];
      for (const s of sheetsForWeek) {
        const id = s._id || "";
        const sel = savedRowSelection[id];
        if (!sel) continue;
        const indices = Object.keys(sel.rows || {}).map((k) => parseInt(k, 10)).sort((a, b) => a - b);
        if (indices.length === 0) continue;
        const selectedRows = indices.map((i) => s.rows[i]).filter((r) => r && !isRowEmpty(r));
        if (selectedRows.length === 0) continue;
        const weekIso = isoFromValue(s.weekStart);
        if (!weekIso) continue;
        payloadBundles.push({ sheetId: id, weekStart: weekIso, rows: selectedRows });
      }

      if (payloadBundles.length === 0) return alert("Select at least one non-empty row to submit.");

      for (const p of payloadBundles) {
        await http.post(`/timesheets/${p.sheetId}/submit-rows`, { weekStart: p.weekStart, rows: p.rows });
      }

      await fetchAllSheets();
      alert("Selected non-empty rows submitted.");
      setSavedRowSelection({});
    } catch (err) {
      console.error("submitSelectedSavedRows failed:", err);
      alert("Failed to submit selected rows.");
    }
  }

  // edit modal
  const openEditModal = (sheet) => { setEditingSaved(sheet); setEditingRows(padToMinRows(sheet.rows || [])); };
  const closeEditModal = () => { setEditingSaved(null); setEditingRows([]); };
  const editingAddRow = () => { if (!editingSaved) return; if (editingRows.length >= MAX_ROWS) return; setEditingRows((r) => [...r, makeEmptyRow()]); };
  const editingRemoveRow = (idx) => { if (!editingSaved) return; setEditingRows((prev) => padToMinRows(prev.filter((_, i) => i !== idx))); };
  const editingChange = (i, field, value) => { setEditingRows((prev) => { const copy = [...prev]; copy[i] = { ...copy[i], [field]: value }; if (field === "task") copy[i].activity = ""; return copy; }); };
  const editingHourChange = (rowIdx, dayIdx, value) => { const n = Math.max(0, Math.min(24, Number.isFinite(+value) ? parseInt(value, 10) : 0)); setEditingRows((prev) => { const copy = [...prev]; const hrs = [...copy[rowIdx].hours]; hrs[dayIdx] = n; copy[rowIdx] = { ...copy[rowIdx], hours: hrs }; return copy; }); };

  const saveEditedSheet = async () => {
    if (!editingSaved) return;
    const meaningful = (editingRows || []).filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) return alert("No meaningful rows to save in edited sheet.");
    try {
      const isoWeek = isoFromValue(editingSaved.weekStart);
      if (!isoWeek) throw new Error("Invalid week start");
      const payload = { weekStart: isoWeek, rows: meaningful };
      await http.put(`/timesheets/${editingSaved._id}`, payload);
      await fetchAllSheets();
      closeEditModal();
      alert("Saved changes (empty rows excluded).");
    } catch (err) {
      console.error("saveEditedSheet failed:", err);
      alert("Failed to save changes");
    }
  };

  // comments modal handlers
  // meta.readOnly === true => modal is read-only (used for saved-list)
  const openCommentModal = (sheetId, rowIndex, dayIndex, meta = {}) => {
    let initialText = "";
    const sheet = sheetsForWeek.find((s) => (s._id || "") === sheetId) || null;
    if (sheet && Array.isArray(sheet.rows) && sheet.rows[rowIndex]) {
      initialText = (sheet.rows[rowIndex].comments && sheet.rows[rowIndex].comments[dayIndex]) || "";
    } else {
      // editor or editingSaved (if sheetId === "editor" or null)
      const r = (sheetId === "editor" ? rows[rowIndex] : (editingRows && editingRows[rowIndex] ? editingRows[rowIndex] : null));
      if (r && r.comments) initialText = r.comments[dayIndex] || "";
    }

    const defaultReadOnly = (sheetId && sheetId !== "editor" && (!meta.forceEditable));
    setCommentModal({ open: true, sheetId: sheetId || "editor", rowIndex, dayIndex, text: initialText, meta: { ...meta, readOnly: !!meta.readOnly || defaultReadOnly } });
  };
  const closeCommentModal = () => setCommentModal({ open: false, sheetId: null, rowIndex: null, dayIndex: null, text: "", meta: {} });

  // IMPORTANT: call backend endpoint that will store comment into timesheet rows
  const saveComment = async () => {
    const { sheetId, rowIndex, dayIndex, text } = commentModal;
    // do not save when readOnly
    if (commentModal.meta && commentModal.meta.readOnly) {
      closeCommentModal();
      return;
    }
    try {
      // backend endpoint: POST /timesheets/comments
      await http.post("/timesheets/comments", { sheetId: sheetId === "editor" ? null : sheetId, weekStart: weekStartStr, rowIndex, dayIndex, text });

      // update local copies for UI immediately
      setAllSheets((prev) =>
        prev.map((s) => {
          if (!s) return s;
          const idMatches = sheetId === "editor" ? false : (s._id || "") === sheetId;
          if (!idMatches) return s;
          const copy = { ...s };
          copy.rows = copy.rows || [];
          while (copy.rows.length <= rowIndex) copy.rows.push(makeEmptyRow());
          copy.rows[rowIndex].comments = copy.rows[rowIndex].comments || Array(DAYS_IN_WEEK).fill(null);
          copy.rows[rowIndex].comments[dayIndex] = text;
          return copy;
        })
      );

      // If editing the editor or editingSaved, update the corresponding local rows too
      if (sheetId === "editor") {
        setRows((prev) => {
          const copy = [...prev];
          while (copy.length <= rowIndex) copy.push(makeEmptyRow());
          copy[rowIndex] = { ...copy[rowIndex], comments: [...(copy[rowIndex].comments || Array(DAYS_IN_WEEK).fill(null))] };
          copy[rowIndex].comments[dayIndex] = text;
          return copy;
        });
      } else if (editingSaved && (commentModal.sheetId === (editingSaved._id || ""))) {
        setEditingRows((prev) => {
          const copy = [...prev];
          while (copy.length <= rowIndex) copy.push(makeEmptyRow());
          copy[rowIndex] = { ...copy[rowIndex], comments: [...(copy[rowIndex].comments || Array(DAYS_IN_WEEK).fill(null))] };
          copy[rowIndex].comments[dayIndex] = text;
          return copy;
        });
      }

      closeCommentModal();
      alert("Comment saved.");
    } catch (err) {
      console.error("saveComment failed:", err);
      alert("Failed to save comment");
    }
  };

  const totalForSheet = (sheet) => {
    if (!sheet || !Array.isArray(sheet.rows)) return 0;
    return sheet.rows.reduce((acc, r) => acc + (Array.isArray(r.hours) ? r.hours.reduce((a, h) => a + (parseInt(h, 10) || 0), 0) : 0), 0);
  };

  // day labels (Mon..Sun)
  const dayLabels = Array.from({ length: DAYS_IN_WEEK }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  });

  // UI
  return (
    <div
      className="relative min-h-screen bg-animated-sky"
      style={{
        // corporate modern: subtle layered gradients and soft radial blobs
        background:
          "radial-gradient(circle at 8% 12%, rgba(59,130,246,0.06) 0%, transparent 28%), " + // blue top-left
          "radial-gradient(circle at 92% 84%, rgba(16,185,129,0.05) 0%, transparent 32%), " + // green bottom-right
          "linear-gradient(180deg, #ffffff 0%, #fbffff 40%, #f7fffb 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* subtle decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-24 w-72 h-72 rounded-full opacity-40 blur-3xl transform-gpu"
          style={{ background: "radial-gradient(circle at 30% 30%, rgba(219,234,254,0.9), rgba(219,234,254,0.1) 40%)" }}
        />
        <div
          className="absolute -bottom-28 -right-24 w-96 h-96 rounded-full opacity-30 blur-3xl transform-gpu"
          style={{ background: "radial-gradient(circle at 70% 70%, rgba(220,252,231,0.95), rgba(220,252,231,0.08) 40%)" }}
        />
      </div>

      {/* header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Company" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Timesheet Input</h1>
            <div className="text-xs text-slate-500">Organize your weekly work with clarity</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500">Signed in as</div>
              <div className="font-semibold">{profile.name || "Employee"}</div>
            </div>

            <button
              onClick={gotoPayroll}
              aria-label="Open payroll"
              title="Open payroll dashboard"
              className="relative group"
              style={{ outline: "none", border: "none", background: "transparent" }}
            >
              {profile.photo ? (
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-md transform transition group-hover:scale-105">
                  <img src={profile.photo} alt={profile.name || "Employee"} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                  {initialsFromName(profile.name)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white animate-pulse" />
            </button>

            <button onClick={onLogout} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow transition ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-box-arrow-right" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Week nav + actions - styled as a glass bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="glass-card px-3 py-2 flex items-center gap-3 rounded-lg shadow-sm border">
          <button onClick={prevWeek} aria-label="Previous week" className="p-2 rounded-md hover:bg-slate-50 transition">
            <ChevronLeft />
          </button>

          <div className="mx-4 text-base md:text-lg font-semibold text-slate-800 select-none">
            <div className="text-xs text-slate-400">Week</div>
            <div className="text-indigo-700">{label}</div>
          </div>

          <button onClick={nextWeek} aria-label="Next week" className="p-2 rounded-md hover:bg-slate-50 transition">
            <ChevronRight />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={addRow} disabled={rows.length >= MAX_ROWS || !editable}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${rows.length >= MAX_ROWS || !editable ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50"}`}>
            <Plus size={16} /> Add Row ({rows.length}/{MAX_ROWS})
          </button>

          <div className="flex gap-2">
            <button onClick={saveTimesheet} disabled={!editable} className={`px-4 py-2 rounded-lg ${editable ? "bg-slate-800 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Save</button>
            <button onClick={submitTimesheet} disabled={!editable} className={`px-4 py-2 rounded-lg ${editable ? "bg-emerald-600 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Submit</button>
          </div>
        </div>
      </div>

      {/* Editor (main card) */}
      <div className="overflow-x-auto shadow-2xl rounded-2xl bg-white/80 backdrop-blur-sm p-4 border border-white/40">
        <table className="w-full border-collapse text-sm table-fixed">
          <colgroup>
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "18%" }} />
            {Array.from({ length: DAYS_IN_WEEK }).map((_, i) => <col key={i} style={{ width: "4.5rem" }} />)}
            <col style={{ width: "4.5rem" }} />
            <col style={{ width: "3rem" }} />
          </colgroup>

          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Project</th>
              <th className="p-3 text-left">Task</th>
              <th className="p-3 text-left">Activity</th>
              {dayLabels.map((d, i) => (
                <th key={i} className="p-3 text-center relative">
                  <div className="text-xs">{d.split(" ")[0]}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{d.split(" ")[1]}</div>
                </th>
              ))}
              <th className="p-3 text-center">Total</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b hover:bg-slate-50 transition">
                <td className="p-2">
                  <input aria-label={`Client ${rowIdx+1}`} className="w-full border rounded-lg p-2 pr-10 bg-white" value={row.client} disabled={!editable} onChange={(e) => handleChange(rowIdx, "client", e.target.value)} />
                </td>
                <td className="p-2">
                  <input aria-label={`Project ${rowIdx+1}`} className="w-full border rounded-lg p-2 pr-10 bg-white" value={row.project} disabled={!editable} onChange={(e) => handleChange(rowIdx, "project", e.target.value)} />
                </td>
                <td className="p-2">
                  <select aria-label={`Task ${rowIdx+1}`} className="w-full border rounded-lg p-2 bg-white" value={row.task} disabled={!editable} onChange={(e) => handleChange(rowIdx, "task", e.target.value)}>
                    <option value="">-- Select --</option>
                    {taskOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </td>
                <td className="p-2">
                  <select aria-label={`Activity ${rowIdx+1}`} className="w-full border rounded-lg p-2 bg-white" value={row.activity} disabled={!editable || !row.task} onChange={(e) => handleChange(rowIdx, "activity", e.target.value)}>
                    <option value="">-- Select --</option>
                    {(taskActivityMap[row.task] || []).map((a) => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </td>

                {row.hours.map((h, dayIdx) => (
                  <td key={dayIdx} className="p-2 text-center relative">
                    <input aria-label={`Hours r${rowIdx+1} d${dayIdx+1}`} type="number" min="0" max="24" value={h} disabled={!editable} onChange={(e) => handleHourChange(rowIdx, dayIdx, e.target.value)} className="w-14 border rounded-lg text-center pr-8" />
                    <button onClick={() => openCommentModal("editor", rowIdx, dayIdx, { readOnly: false })} className="comment-btn" title="Add / view comment" aria-label="Add comment">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {row.comments && row.comments[dayIdx] ? (<span className="comment-dot" />) : null}
                  </td>
                ))}

                <td className="p-2 text-center font-medium">{totalByRow(row)}</td>
                <td className="p-2 text-center">
                  <button onClick={() => removeRow(rowIdx)} disabled={!editable} className={`p-2 rounded ${editable ? "hover:bg-gray-100" : "cursor-not-allowed text-gray-400"}`} title="Remove row"><Trash2 size={16} /></button>
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

      {/* Saved / Submitted list */}
      <section className="max-w-6xl mx-auto mt-6">
        <div className="bg-white rounded-2xl border shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">Saved / Submitted for this week</h3>
            <div className="text-sm text-slate-500">{loadingSheetsList ? "Loadingâ€¦" : `${sheetsForWeek.length} record(s)`}</div>
          </div>

          {loadingSheetsList ? (
            <div className="text-center py-6 text-slate-500">Loading saved itemsâ€¦</div>
          ) : sheetsForWeek.length === 0 ? (
            <div className="text-center py-6 text-slate-500">No saved or submitted data for this week.</div>
          ) : (
            <div className="space-y-4">
              {sheetsForWeek.map((s, idx) => {
                const id = s._id || `${s.weekStart}-${idx}`;
                const total = totalForSheet(s);
                const when = new Date(s.updatedAt || s.createdAt || s.weekStart).toLocaleString();
                const expanded = (expandedSaved[id] === undefined) ? true : !!expandedSaved[id];
                const selection = savedRowSelection[id] || { all: false, rows: {} };

                // preserve original row indices so comments & selections map correctly
                const rowsWithIndex = (s.rows || []).map((r, i) => ({ r, i }));
                const visibleRows = rowsWithIndex.filter(({ r }) => {
                  const rowTotal = Array.isArray(r.hours) ? r.hours.reduce((a, h) => a + (parseInt(h, 10) || 0), 0) : 0;
                  return rowTotal > 0 || (r.client || r.project || r.task || r.activity);
                });

                return (
                  <div key={id} className="border rounded-lg p-3 bg-slate-50 relative">
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
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!selection.all} onChange={() => toggleSavedSelectAll(id)} />
                          <span>Select all</span>
                        </label>

                        <button onClick={() => openEditModal(s)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg">Edit</button>
                        <button onClick={() => setExpandedSaved((p) => ({ ...p, [id]: !p[id] }))} className="bg-white border px-3 py-1 rounded-lg">{expanded ? "Hide" : "Details"}</button>
                        <button onClick={() => submitSelectedSavedRows()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg">Submit</button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-3 bg-white rounded p-3 border">
                        <div className="overflow-x-auto" style={{ paddingBottom: 6 }}>
                          <table className="w-full text-sm saved-table" style={{ minWidth: 920 }}>
                            <colgroup>
                              <col style={{ width: "18%" }} />
                              <col style={{ width: "18%" }} />
                              <col style={{ width: "14%" }} />
                              <col style={{ width: "14%" }} />
                              {Array.from({ length: DAYS_IN_WEEK }).map((_, i) => <col key={i} style={{ width: "6.5rem" }} />)}
                              <col style={{ width: "6rem" }} />
                              <col style={{ width: "3.5rem" }} />
                            </colgroup>

                            <thead className="text-slate-600 bg-slate-100">
                              <tr>
                                <th className="p-2 text-left">Client</th>
                                <th className="p-2 text-left">Project</th>
                                <th className="p-2 text-left">Task</th>
                                <th className="p-2 text-left">Activity</th>
                                {Array.from({ length: DAYS_IN_WEEK }).map((_, i) => <th key={i} className="p-2 text-center">{dayLabels[i].split(" ")[0]}</th>)}
                                <th className="p-2 text-center">Total</th>
                                <th className="p-2 text-center">Select</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRows.length > 0 ? visibleRows.map(({ r, i: ridx }) => {
                                const rowTotal = Array.isArray(r.hours) ? r.hours.reduce((a, h) => a + (parseInt(h, 10) || 0), 0) : 0;
                                const isChecked = !!(selection.rows && selection.rows[ridx]);
                                return (
                                  <tr key={ridx} className="border-b">
                                    <td className="p-2 align-top text-sm text-slate-700">{r.client}</td>
                                    <td className="p-2 align-top text-sm text-slate-700">{r.project}</td>
                                    <td className="p-2 align-top text-sm text-slate-700">{r.task}</td>
                                    <td className="p-2 align-top text-sm text-slate-700">{r.activity}</td>

                                    {Array.from({ length: DAYS_IN_WEEK }).map((_, di) => {
                                      const hoursVal = (r.hours && r.hours[di] != null) ? r.hours[di] : 0;
                                      return (
                                        <td key={di} className="p-2 text-center saved-day-cell-no-comments">
                                          {/* visible hours element (centered) */}
                                          <div className="hours-val" aria-hidden>{hoursVal}</div>
                                          {/* per your request, comments removed from saved view */}
                                        </td>
                                      );
                                    })}

                                    <td className="p-2 text-center font-medium align-top">{rowTotal}</td>
                                    <td className="p-2 text-center align-top"><input type="checkbox" checked={isChecked} onChange={() => toggleSavedRow(id, ridx)} /></td>
                                  </tr>
                                );
                              }) : (
                                <tr><td colSpan={12} className="p-3 text-center text-slate-500">No rows</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Edit modal */}
      {editingSaved && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[92%] max-w-6xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Saved Timesheet â€” {new Date(editingSaved.weekStart).toLocaleDateString("en-GB")}</h3>
              <div className="flex gap-2">
                <button onClick={() => closeEditModal()} className="bg-red-600 text-white px-3 py-1 rounded-lg">Close</button>
              </div>
            </div>

            <div className="mb-4"><div className="text-sm text-slate-500">Status: <StatusBadge s={editingSaved.status} /></div></div>

            {/* --- Edit modal uses saved-table styling so rows match saved-list visuals --- */}
            <div className="overflow-x-auto bg-white border rounded p-3">
              <table className="w-full text-sm saved-table edit-table" style={{ minWidth: 920 }}>
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  {Array.from({ length: DAYS_IN_WEEK }).map((_, i) => (<col key={i} style={{ width: "6.5rem" }} />))}
                  <col style={{ width: "6rem" }} />
                </colgroup>

                <thead className="text-slate-600 bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Client</th>
                    <th className="p-2 text-left">Project</th>
                    <th className="p-2 text-left">Task</th>
                    <th className="p-2 text-left">Activity</th>
                    {Array.from({ length: DAYS_IN_WEEK }).map((_, i) => <th key={i} className="p-2 text-center">{dayLabels[i].split(" ")[0]}</th>)}
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {editingRows.map((r, ridx) => (
                    <tr key={ridx} className="border-b">
                      <td className="p-2 align-top text-sm text-slate-700">
                        <input value={r.client} onChange={(e) => editingChange(ridx, "client", e.target.value)} className="w-full border rounded px-2 py-2 text-sm" />
                      </td>
                      <td className="p-2 align-top text-sm text-slate-700">
                        <input value={r.project} onChange={(e) => editingChange(ridx, "project", e.target.value)} className="w-full border rounded px-2 py-2 text-sm" />
                      </td>
                      <td className="p-2 align-top text-sm text-slate-700">
                        <select value={r.task} onChange={(e) => editingChange(ridx, "task", e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
                          <option value="">-- Select --</option>
                          {taskOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </td>
                      <td className="p-2 align-top text-sm text-slate-700">
                        <select value={r.activity} onChange={(e) => editingChange(ridx, "activity", e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
                          <option value="">-- Select --</option>
                          {(taskActivityMap[r.task] || []).map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </td>

                      {r.hours.map((h, di) => {
                        const savedComment = (r.comments && r.comments[di]) || "";
                        return (
                          <td key={di} className="p-2 text-center relative edit-day-cell">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              value={h}
                              onChange={(e) => editingHourChange(ridx, di, e.target.value)}
                              className="w-14 h-8 border rounded text-center text-sm"
                            />

                            {/* floating comment button (editable in edit modal) */}
                            <button
                              onClick={() => openCommentModal(editingSaved._id || "", ridx, di, { readOnly: false, forceEditable: true })}
                              className="comment-btn edit-comment-btn"
                              title={savedComment ? "View / edit comment" : "Add comment"}
                              aria-label="Edit comment"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={savedComment ? "#16a34a" : "#0ea5e9"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>

                            {/* indicator dot in edit modal (optional) */}
                            {savedComment ? (<span className="comment-dot" />) : null}
                          </td>
                        );
                      })}

                      <td className="p-2 text-center align-top">
                        <button onClick={() => editingRemoveRow(ridx)} className="bg-red-100 text-red-700 px-3 py-1 rounded">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={editingAddRow} className="px-4 py-2 rounded-lg bg-white border">Add Row</button>
              <button onClick={saveEditedSheet} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Comments modal */}
      {commentModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[560px] max-w-[96%]">
            <div className="bg-indigo-700 rounded-t-xl px-6 py-3 text-white">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Comments</h4>
                <button onClick={() => closeCommentModal()} className="text-white/90">âœ•</button>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-slate-500">Timesheet for</div>
                  <div className="font-medium">{commentModal.meta?.task || commentModal.meta?.project || "â€”"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Date</div>
                  <div className="font-medium">{new Date(startDate).toLocaleDateString("en-GB")}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Ticket No</div>
                  <div className="font-medium">{commentModal.meta?.ticketNo || "N/A"}</div>
                </div>
              </div>

              <textarea
                value={commentModal.text}
                onChange={(e) => setCommentModal((c) => ({ ...c, text: e.target.value }))}
                rows={6}
                placeholder="Enter comments..."
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none"
                disabled={!!(commentModal.meta && commentModal.meta.readOnly)}
              />

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => closeCommentModal()} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button
                  onClick={() => saveComment()}
                  className={`px-4 py-2 rounded-lg ${commentModal.meta && commentModal.meta.readOnly ? "bg-gray-200 text-gray-600 cursor-not-allowed" : "bg-emerald-600 text-white"}`}
                  disabled={!!(commentModal.meta && commentModal.meta.readOnly)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* styles */}
      <style>{`
        /* Glass card utility */
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.55));
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 4px 18px rgba(15,23,42,0.06);
          backdrop-filter: blur(6px) saturate(120%);
        }

        .comment-btn{
          position: absolute;
          top: 6px;
          right: 6px;
          background: white;
          border-radius: 6px;
          padding: 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(2,6,23,0.08);
          border: 1px solid rgba(16,24,40,0.06);
          cursor: pointer;
          z-index: 6;
          transition: transform .12s ease, background .12s ease;
        }
        .comment-btn:hover { transform: translateY(-3px); background:#f8fafc; }

        .comment-dot {
          position: absolute;
          left: 8px;
          top: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563EB;
          box-shadow: 0 2px 6px rgba(37,99,235,0.18);
        }

        /* ===== SAVED TABLE: cleaned â€” no comment icons/dots =====
           - hours visible and centered
           - no reserved space for comment icons in saved-list
        */
        .saved-table td, .saved-table th { vertical-align: middle; color: #374151; }
        .saved-table td { position: relative; padding-right: 12px; }
        .saved-table .hours-val { display: block; font-weight: 600; font-size: 14px; line-height: 1; margin-top: 6px; }

        .saved-day-cell-no-comments { padding: 10px 12px; }

        /* edit modal specific - match saved-list sizes but keep comment UI */
        .edit-table td, .edit-table th { vertical-align: middle; }
        .edit-table td { position: relative; padding-right: 56px; } /* reserve space for comment button in edit modal */
        .edit-day-cell { position: relative; padding-right: 64px; }
        .edit-comment-btn { top:6px; right:8px; z-index: 8; }

        tfoot tr td { border-top: 0; text-align: center; }

        /* Tiny animation for floating blobs â€” gentle movement */
        @keyframes floatY {
          0% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0); }
        }
        .pointer-events-none > div { animation: floatY 9s ease-in-out infinite; }

        /* responsive tweaks */
        @media (max-width: 1100px) {
          .saved-table { min-width: 820px; }
          .edit-table { min-width: 820px; }
        }
        @media (max-width: 900px) {
          .comment-btn { right: 5px; top: 5px; transform: scale(0.95); }
          .comment-dot { left: 6px; top: 6px; width: 7px; height: 7px; }
        }

        /* status badges */
        .status-draft { background: #f1f5f9; color: #475569; }
        .status-submitted { background: #fff7ed; color: #92400e; }
        .status-approved { background: #ecfdf5; color: #064e3b; }
        .status-rejected { background: #fff1f2; color: #7f1d1d; }

        /* small polished focus styles */
        input:focus, select:focus, textarea:focus, button:focus {
          outline: 2px solid rgba(99,102,241,0.12);
          outline-offset: 2px;
        }

        /* rounded card shadow polish */
        .shadow-2xl { box-shadow: 0 10px 30px rgba(2,6,23,0.06); }
      `}</style>
    </div>
  );
}

// small helper component
function StatusBadge({ s }) {
  const map = {
    draft: "status-draft",
    submitted: "status-submitted",
    approved: "status-approved",
    rejected: "status-rejected",
  };
  const label = (s || "draft").charAt(0).toUpperCase() + (s || "draft").slice(1);
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s] || "status-draft"}`}>{label}</span>;
}

