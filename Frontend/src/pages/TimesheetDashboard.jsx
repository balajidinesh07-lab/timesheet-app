// src/pages/TimesheetDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png"; // update path if needed

// --- helpers --------------------------------------------------------------
function getWeekRange(date) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = base.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(base);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(diff);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  return { startDate: monday, endDate: saturday, label: `${fmt(monday)} - ${fmt(saturday)}` };
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

const makeEmptyRow = () => ({
  client: "",
  project: "",
  task: "",
  activity: "",
  hours: [0, 0, 0, 0, 0, 0], // Mon-Sat
  comments: [null, null, null, null, null, null],
});

const padToMinRows = (rows) => {
  const copy = (rows || []).map((r) => {
    const hrs = Array.isArray(r.hours) ? r.hours.slice(0, 6) : [];
    while (hrs.length < 6) hrs.push(0);
    const comments = Array.isArray(r.comments) ? r.comments.slice(0, 6) : [];
    while (comments.length < 6) comments.push(null);
    return { ...r, hours: hrs, comments };
  });
  while (copy.length < MIN_ROWS) copy.push(makeEmptyRow());
  return copy.slice(0, MAX_ROWS);
};

// ---------- Profile helpers (new) -----------------------------------------
function getProfileFromLocalStorage() {
  // attempt to read common keys the app might store
  const photo = localStorage.getItem("profilePhoto") || null;
  const name = localStorage.getItem("name") || localStorage.getItem("userName") || "";
  const email = localStorage.getItem("email") || "";
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
  const weekStartStr = useMemo(() => new Date(startDate).toISOString().slice(0, 10), [startDate]);

  const [rows, setRows] = useState(padToMinRows([]));
  const [status, setStatus] = useState("draft");

  const [allSheets, setAllSheets] = useState([]);
  const [loadingSheetsList, setLoadingSheetsList] = useState(false);
  const [loadingCurrentWeek, setLoadingCurrentWeek] = useState(false);

  const [expandedSaved, setExpandedSaved] = useState({});
  const [savedRowSelection, setSavedRowSelection] = useState({});
  const [editingSaved, setEditingSaved] = useState(null);
  const [editingRows, setEditingRows] = useState([]);
  const [commentModal, setCommentModal] = useState({ open: false, sheetId: null, rowIndex: null, dayIndex: null, text: "", meta: {} });

  // profile info cached on first render
  const profile = useMemo(() => getProfileFromLocalStorage(), []);

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
  const handleHourChange = (rowIdx, dayIdx, value) => { if (!editable) return; const n = Math.max(0, Math.min(9, Number.isFinite(+value) ? parseInt(value, 10) : 0)); setRows((prev) => { const copy = [...prev]; const hours = [...copy[rowIdx].hours]; hours[dayIdx] = n; copy[rowIdx] = { ...copy[rowIdx], hours }; return copy; }); };

  // totals
  const totalByRow = (row) => row.hours.reduce((s, h) => s + (parseInt(h, 10) || 0), 0);
  const totalByDay = (dayIdx) => rows.reduce((s, r) => s + (parseInt(r.hours[dayIdx], 10) || 0), 0);
  const grandTotal = () => rows.reduce((s, r) => s + totalByRow(r), 0);

  // save/submit (exclude empty rows)
  async function saveTimesheet() {
    if (!editable) return alert("🔒 Timesheet is locked after manager review.");
    const meaningful = (rows || []).filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) return alert("Nothing to save — all rows are empty.");
    try {
      const payload = { weekStart: weekStartStr, rows: meaningful.slice(0, MAX_ROWS), submit: false };
      const saved = await http.post("/timesheets", payload);
      if (saved) {
        setRows(padToMinRows(saved.rows || meaningful));
        setStatus(saved.status || status);
      }
      await fetchAllSheets();
      alert("💾 Timesheet saved (empty rows excluded).");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save timesheet");
    }
  }

  async function submitTimesheet() {
    if (!editable) return alert("🔒 Timesheet is locked after manager review.");
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
      alert("✅ Timesheet submitted. Empty rows were not included.");
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Failed to submit timesheet");
    }
  }

  const validateForSubmit = (rowsToCheck) => {
    const meaningful = rowsToCheck.filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) { alert("⚠️ Please enter at least one row with Client, Project, Task, Activity and some hours before submitting."); return false; }
    const firstInvalidIndex = meaningful.findIndex((r) => !isRowComplete(r));
    if (firstInvalidIndex !== -1) { alert("⚠️ Please complete all required fields (Client, Project, Task, Activity) and enter hours for each non-empty row before submitting."); return false; }
    return true;
  };

  // saved sheets for current week
  const sheetsForWeek = useMemo(() => {
    return allSheets.filter((s) => s && s.weekStart && s.weekStart.slice(0, 10) === weekStartStr)
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
        payloadBundles.push({ sheetId: id, weekStart: s.weekStart, rows: selectedRows });
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
  const editingHourChange = (rowIdx, dayIdx, value) => { const n = Math.max(0, Math.min(9, Number.isFinite(+value) ? parseInt(value, 10) : 0)); setEditingRows((prev) => { const copy = [...prev]; const hrs = [...copy[rowIdx].hours]; hrs[dayIdx] = n; copy[rowIdx] = { ...copy[rowIdx], hours: hrs }; return copy; }); };

  const saveEditedSheet = async () => {
    if (!editingSaved) return;
    const meaningful = (editingRows || []).filter((r) => !isRowEmpty(r));
    if (meaningful.length === 0) return alert("No meaningful rows to save in edited sheet.");
    try {
      const payload = { weekStart: editingSaved.weekStart, rows: meaningful };
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
  const openCommentModal = (sheetId, rowIndex, dayIndex, meta = {}) => {
    let initialText = "";
    const sheet = sheetsForWeek.find((s) => (s._id || "") === sheetId) || null;
    if (sheet && Array.isArray(sheet.rows) && sheet.rows[rowIndex]) {
      initialText = (sheet.rows[rowIndex].comments && sheet.rows[rowIndex].comments[dayIndex]) || "";
    } else {
      const r = rows[rowIndex];
      if (r && r.comments) initialText = r.comments[dayIndex] || "";
    }
    setCommentModal({ open: true, sheetId: sheetId || "editor", rowIndex, dayIndex, text: initialText, meta });
  };
  const closeCommentModal = () => setCommentModal({ open: false, sheetId: null, rowIndex: null, dayIndex: null, text: "", meta: {} });

  // IMPORTANT: call backend endpoint that will store comment into timesheet rows
  const saveComment = async () => {
    const { sheetId, rowIndex, dayIndex, text } = commentModal;
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
          copy.rows[rowIndex].comments = copy.rows[rowIndex].comments || Array(6).fill(null);
          copy.rows[rowIndex].comments[dayIndex] = text;
          return copy;
        })
      );

      setRows((prev) => {
        const copy = [...prev];
        while (copy.length <= rowIndex) copy.push(makeEmptyRow());
        copy[rowIndex] = { ...copy[rowIndex], comments: [...(copy[rowIndex].comments || Array(6).fill(null))] };
        copy[rowIndex].comments[dayIndex] = text;
        return copy;
      });

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

  // day labels (Mon..Sat)
  const dayLabels = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" });
  });

  // UI
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-24 w-72 h-72 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute -bottom-28 -right-24 w-96 h-96 bg-gradient-to-tr from-green-100 to-teal-50 rounded-full opacity-30 blur-3xl animate-float-slow" />
      </div>

      {/* header */} 
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Company" className="h-12 w-auto object-contain" />
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Timesheet Input</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-base text-slate-600 mr-3 hidden md:block">
            Week: <span className="font-semibold text-indigo-700">{label}</span>
          </div>

          {/* PROFILE AVATAR — clicking goes to Payroll Dashboard */}
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-right" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
  <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
</svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={prevWeek} className="p-2 rounded-lg border bg-white hover:bg-slate-50"><ChevronLeft /></button>
        <div className="text-xl font-semibold text-slate-800 tracking-wide md:hidden">Week: <span className="text-indigo-700">{label}</span></div>
        <button onClick={nextWeek} className="p-2 rounded-lg border bg-white hover:bg-slate-50"><ChevronRight /></button>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={addRow} disabled={rows.length >= MAX_ROWS || !editable}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${rows.length >= MAX_ROWS || !editable ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50"}`}>
            <Plus size={16} /> Add Row ({rows.length}/{MAX_ROWS})
          </button>

          <div className="flex gap-2">
            <button onClick={saveTimesheet} disabled={!editable} className={`px-4 py-2 rounded-lg ${editable ? "bg-gray-700 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Save</button>
            <button onClick={submitTimesheet} disabled={!editable} className={`px-4 py-2 rounded-lg ${editable ? "bg-green-600 text-white hover:opacity-90" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>Submit</button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="overflow-x-auto shadow-lg rounded-2xl bg-white p-4 border">
        <table className="w-full border-collapse text-sm table-fixed">
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
            {Array.from({ length: 6 }).map((_, i) => <col key={i} style={{ width: "5.5rem" }} />)}
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
              <tr key={rowIdx} className="border-b hover:bg-slate-50">
                <td className="p-2">
                  <input className="w-full border rounded-lg p-2 pr-10 bg-white" value={row.client} disabled={!editable} onChange={(e) => handleChange(rowIdx, "client", e.target.value)} />
                </td>
                <td className="p-2">
                  <input className="w-full border rounded-lg p-2 pr-10 bg-white" value={row.project} disabled={!editable} onChange={(e) => handleChange(rowIdx, "project", e.target.value)} />
                </td>
                <td className="p-2">
                  <select className="w-full border rounded-lg p-2 bg-white" value={row.task} disabled={!editable} onChange={(e) => handleChange(rowIdx, "task", e.target.value)}>
                    <option value="">-- Select --</option>
                    {taskOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </td>
                <td className="p-2">
                  <select className="w-full border rounded-lg p-2 bg-white" value={row.activity} disabled={!editable || !row.task} onChange={(e) => handleChange(rowIdx, "activity", e.target.value)}>
                    <option value="">-- Select --</option>
                    {(taskActivityMap[row.task] || []).map((a) => (<option key={a} value={a}>{a}</option>))}
                  </select>
                </td>

                {row.hours.map((h, dayIdx) => (
                  <td key={dayIdx} className="p-2 text-center relative">
                    <input type="number" min="0" max="9" value={h} disabled={!editable} onChange={(e) => handleHourChange(rowIdx, dayIdx, e.target.value)} className="w-14 border rounded-lg text-center pr-8" />
                    <button onClick={() => openCommentModal((sheetsForWeek[0] && sheetsForWeek[0]._id) || "", rowIdx, dayIdx, { client: row.client, project: row.project, task: row.task })} className="comment-btn" title="Add / view comment" aria-label="Add comment">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
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
            <div className="text-sm text-slate-500">{loadingSheetsList ? "Loading…" : `${sheetsForWeek.length} record(s)`}</div>
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
                // default visible/expanded = true unless user toggled
                const expanded = (expandedSaved[id] === undefined) ? true : !!expandedSaved[id];
                const selection = savedRowSelection[id] || { all: false, rows: {} };

                // keep UI compact - show only meaningful rows but if there's only one row show only it
                const visibleRows = (s.rows || []).filter((r, i) => {
                  const rowTotal = Array.isArray(r.hours) ? r.hours.reduce((a, h) => a + (parseInt(h, 10) || 0), 0) : 0;
                  return rowTotal > 0 || i === 0 || (r.client || r.project || r.task || r.activity);
                });

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
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!selection.all} onChange={() => toggleSavedSelectAll(id)} />
                          <span>Select all</span>
                        </label>

                        <button onClick={() => openEditModal(s)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg">Edit</button>
                        <button onClick={() => setExpandedSaved((p) => ({ ...p, [id]: !p[id] }))} className="bg-white border px-3 py-1 rounded-lg">{expanded ? "Hide" : "Details"}</button>
                        <button onClick={() => submitSelectedSavedRows()} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg">Submit</button>
                      </div>
                    </div>

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
                              <th className="p-2 text-center">Select</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleRows.length > 0 ? visibleRows.map((r, ridx) => {
                              const rowTotal = Array.isArray(r.hours) ? r.hours.reduce((a, h) => a + (parseInt(h, 10) || 0), 0) : 0;
                              const isChecked = !!(selection.rows && selection.rows[ridx]);
                              return (
                                <tr key={ridx} className="border-b">
                                  <td className="p-2">{r.client}</td>
                                  <td className="p-2">{r.project}</td>
                                  <td className="p-2">{r.task}</td>
                                  <td className="p-2">{r.activity}</td>
                                  {Array.from({ length: 6 }).map((_, di) => <td key={di} className="p-2 text-center">{(r.hours && r.hours[di] != null) ? r.hours[di] : 0}</td>)}
                                  <td className="p-2 text-center font-medium">{rowTotal}</td>
                                  <td className="p-2 text-center"><input type="checkbox" checked={isChecked} onChange={() => toggleSavedRow(id, ridx)} /></td>
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

      {/* Edit modal */}
      {editingSaved && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[92%] max-w-6xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Saved Timesheet — {new Date(editingSaved.weekStart).toLocaleDateString("en-GB")}</h3>
              <div className="flex gap-2">
                <button onClick={() => closeEditModal()} className="bg-red-600 text-white px-3 py-1 rounded-lg">Close</button>
              </div>
            </div>

            <div className="mb-4"><div className="text-sm text-slate-500">Status: <StatusBadge s={editingSaved.status} /></div></div>

            <div className="overflow-x-auto bg-white border rounded p-3">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "18%" }} />
                  {Array.from({ length: 6 }).map((_, i) => (<col key={i} style={{ width: "5.5rem" }} />))}
                  <col style={{ width: "5rem" }} />
                </colgroup>
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2 text-left">Client</th>
                    <th className="p-2 text-left">Project</th>
                    <th className="p-2 text-left">Task</th>
                    <th className="p-2 text-left">Activity</th>
                    {dayLabels.map((d, i) => <th key={i} className="p-2 text-center">{d.split(" ")[0]}</th>)}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {editingRows.map((r, ridx) => (
                    <tr key={ridx} className="border-b">
                      <td className="p-2"><input value={r.client} onChange={(e) => editingChange(ridx, "client", e.target.value)} className="w-full border rounded p-2" /></td>
                      <td className="p-2"><input value={r.project} onChange={(e) => editingChange(ridx, "project", e.target.value)} className="w-full border rounded p-2" /></td>
                      <td className="p-2">
                        <select value={r.task} onChange={(e) => editingChange(ridx, "task", e.target.value)} className="w-full border rounded p-2">
                          <option value="">-- Select --</option>
                          {taskOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </td>
                      <td className="p-2">
                        <select value={r.activity} onChange={(e) => editingChange(ridx, "activity", e.target.value)} className="w-full border rounded p-2">
                          <option value="">-- Select --</option>
                          {(taskActivityMap[r.task] || []).map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </td>
                      {r.hours.map((h, di) => (
                        <td key={di} className="p-2 text-center">
                          <input type="number" min="0" max="9" value={h} onChange={(e) => editingHourChange(ridx, di, e.target.value)} className="w-14 border rounded text-center" />
                        </td>
                      ))}
                      <td className="p-2 text-center"><button onClick={() => editingRemoveRow(ridx)} className="bg-red-100 text-red-700 px-2 py-1 rounded">Delete</button></td>
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
          <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[94%]">
            <div className="bg-blue-600 rounded-t-xl px-6 py-3 text-white">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Comments</h4>
                <button onClick={() => closeCommentModal()} className="text-white/90">✕</button>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-slate-500">Timesheet for</div>
                  <div className="font-medium">{commentModal.meta.task || commentModal.meta.project || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Date</div>
                  <div className="font-medium">{new Date(startDate).toLocaleDateString("en-GB")}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Ticket No</div>
                  <div className="font-medium">{commentModal.meta.ticketNo || "N/A"}</div>
                </div>
              </div>

              <textarea value={commentModal.text} onChange={(e) => setCommentModal((c) => ({ ...c, text: e.target.value }))} rows={6} placeholder="Enter comments..." className="w-full border rounded px-3 py-2 text-sm focus:outline-none" />

              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => closeCommentModal()} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={() => saveComment()} className="px-4 py-2 rounded-lg bg-green-600 text-white">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .comment-btn{
          position: absolute;
          top: 8px;
          right: 8px;
          background: white;
          border-radius: 6px;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(16,24,40,0.06);
          border: 1px solid rgba(16,24,40,0.06);
          cursor: pointer;
        }
        .comment-btn:hover { background: #f8fafc; }
        .comment-dot {
          position: absolute;
          left: 8px;
          top: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2563EB;
          box-shadow: 0 1px 2px rgba(37,99,235,0.2);
        }
        tfoot tr td { border-top: 0; text-align: center; }
        @media (max-width: 900px) {
          .comment-btn { right: 6px; top: 6px; transform: scale(0.95); }
          .comment-dot { left: 6px; top: 6px; width: 7px; height: 7px; }
        }
        @keyframes float { 0%{transform:translateY(0)}50%{transform:translateY(-12px)}100%{transform:translateY(0)} }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// small helper component
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
