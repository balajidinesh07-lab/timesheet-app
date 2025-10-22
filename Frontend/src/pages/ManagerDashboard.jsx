// src/pages/ManagerDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

const STAT_COLORS = {
  projects: "#2563eb", // blue
  open: "#16a34a", // green
  team: "#f59e0b", // yellow
  overdue: "#ef4444", // red
};

const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"];
const DAYS_IN_WEEK = 7;

export default function ManagerDashboard({ onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingSheet, setViewingSheet] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  // read-only comment modal state
  const [commentModal, setCommentModal] = useState({
    open: false,
    sheetId: null,
    rowIndex: null,
    dayIndex: null,
    text: "",
    meta: {},
  });

  useEffect(() => {
    fetchEmployees();
    fetchTeamTimesheets();
  }, []);

  async function fetchEmployees() {
    try {
      setLoadingTeam(true);
      const team = await http.get("/manager/team");
      setEmployees(team || []);
    } catch (err) {
      console.error("Manager team fetch error:", err);
      setEmployees([]);
    } finally {
      setLoadingTeam(false);
    }
  }

  async function fetchTeamTimesheets() {
    try {
      setLoadingSheets(true);
      const data = await http.get("/manager/timesheets");
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Manager timesheets fetch error:", err);
      setTimesheets([]);
    } finally {
      setLoadingSheets(false);
    }
  }

  // load timesheets for specific user (modal)
  async function viewTimesheets(user) {
    try {
      setLoadingSheets(true);
      setSelectedUser(user);
      const data = await http.get(`/manager/timesheets?userId=${user._id}`);
      setTimesheets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Manager timesheets fetch error:", err);
      setTimesheets([]);
    } finally {
      setLoadingSheets(false);
    }
  }

  function updateRowStatusLocally(id, newStatus) {
    setTimesheets((prev) => prev.map((t) => (t._id === id ? { ...t, status: newStatus } : t)));
    setViewingSheet((s) => (s && s._id === id ? { ...s, status: newStatus } : s));
  }

  async function approveTimesheet(id) {
    try {
      setActionBusyId(id);
      updateRowStatusLocally(id, "approved");
      await http.patch(`/timesheets/${id}/approve`);
      await fetchTeamTimesheets();
      if (selectedUser) viewTimesheets(selectedUser);
    } catch (err) {
      console.error(err);
      alert("Failed to approve timesheet");
      if (selectedUser) viewTimesheets(selectedUser);
    } finally {
      setActionBusyId(null);
    }
  }

  async function rejectTimesheet(id) {
    try {
      setActionBusyId(id);
      updateRowStatusLocally(id, "rejected");
      await http.patch(`/timesheets/${id}/reject`);
      await fetchTeamTimesheets();
      if (selectedUser) viewTimesheets(selectedUser);
    } catch (err) {
      console.error(err);
      alert("Failed to reject timesheet");
      if (selectedUser) viewTimesheets(selectedUser);
    } finally {
      setActionBusyId(null);
    }
  }

  // Metrics for top cards
  const metrics = useMemo(() => {
    const projectSet = new Set();
    let openTasksCount = 0;
    let overdueCount = 0;
    const now = new Date();

    (timesheets || []).forEach((ts) => {
      if (Array.isArray(ts.rows)) {
        ts.rows.forEach((r) => {
          if (r.project) projectSet.add(String(r.project).trim() || "—");
          const rowHasHours = Array.isArray(r.hours) && r.hours.some((h) => Number(h) > 0);
          if (!rowHasHours) {
            if (r.task || r.activity || r.client) openTasksCount++;
          }
        });
      }
      if (ts.status === "submitted") {
        const sub = ts.submittedAt ? new Date(ts.submittedAt) : null;
        if (sub) {
          const ageDays = Math.floor((now - sub) / (1000 * 60 * 60 * 24));
          if (ageDays > 14) overdueCount++;
        }
      }
    });

    const totalProjects = projectSet.size;
    return {
      totalProjects,
      openTasks: openTasksCount,
      teamMembers: employees.length,
      overdueTasks: overdueCount,
    };
  }, [timesheets, employees]);

  // chart data
  const chartData = useMemo(() => {
    const counts = { Completed: 0, "In Progress": 0, "On Hold": 0, Cancelled: 0 };
    (timesheets || []).forEach((t) => {
      const s = (t.status || "draft").toString();
      if (s === "approved") counts.Completed++;
      else if (s === "submitted") counts["In Progress"]++;
      else if (s === "draft") counts["On Hold"]++;
      else if (s === "rejected") counts.Cancelled++;
    });
    return [
      { name: "Completed", value: counts.Completed },
      { name: "In Progress", value: counts["In Progress"] },
      { name: "On Hold", value: counts["On Hold"] },
      { name: "Cancelled", value: counts.Cancelled },
    ];
  }, [timesheets]);

  // overview stats for bar chart
  const tasksOverview = useMemo(() => {
    const total = (timesheets || []).length || 1;
    const byStatus = timesheets.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: "Submitted", value: byStatus["submitted"] || 0 },
      { name: "Approved", value: byStatus["approved"] || 0 },
      { name: "Rejected", value: byStatus["rejected"] || 0 },
      { name: "Draft", value: byStatus["draft"] || 0 },
    ].map((d) => ({ ...d, percent: Math.round(((d.value || 0) / total) * 100) }));
  }, [timesheets]);

  function StatusBadge({ status }) {
    const map = {
      draft: "bg-gray-100 text-gray-700",
      submitted: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${map[status] || "bg-gray-100"}`}>{status}</span>;
  }

  // ---------- Comment modal (read-only for manager) ----------
  const openCommentModal = (sheetId, rowIndex, dayIndex, meta = {}) => {
    let initialText = "";
    if (viewingSheet && Array.isArray(viewingSheet.rows) && viewingSheet.rows[rowIndex]) {
      initialText = (viewingSheet.rows[rowIndex].comments && viewingSheet.rows[rowIndex].comments[dayIndex]) || "";
    }
    setCommentModal({ open: true, sheetId: sheetId || null, rowIndex, dayIndex, text: initialText, meta });
  };

  const closeCommentModal = () => {
    setCommentModal({ open: false, sheetId: null, rowIndex: null, dayIndex: null, text: "", meta: {} });
  };

  const totalsForRow = (r) => (Array.isArray(r.hours) ? r.hours.reduce((s, h) => s + (parseInt(h, 10) || 0), 0) : 0);

  // ---------- Render ----------
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      {/* NAV */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Logo" className="h-14" />
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Manager Dashboard</h1>
            <p className="text-sm text-slate-500">Overview & approvals for your team</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTeamTimesheets} className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-sm">Refresh</button>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow">Logout</button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Stats row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Projects" value={metrics.totalProjects} color={STAT_COLORS.projects} icon="📁" />
          <StatCard title="Open Tasks" value={metrics.openTasks} color={STAT_COLORS.open} icon="🟢" />
          <StatCard title="Team Members" value={metrics.teamMembers} color={STAT_COLORS.team} icon="👥" />
          <StatCard title="Overdue Tasks" value={metrics.overdueTasks} color={STAT_COLORS.overdue} icon="⚠️" />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow border">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Project Status</h3>
            <div className="flex gap-4">
              <div style={{ width: 260, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                      {chartData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <ul className="space-y-2">
                  {chartData.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-3">
                      <span style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} className="w-3 h-3 rounded-full inline-block" />
                      <span className="text-slate-700 font-medium w-32">{d.name}</span>
                      <span className="text-slate-500">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow border">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Tasks Overview</h3>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksOverview} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                  <XAxis type="number" hide domain={[0, "dataMax"]} />
                  <YAxis dataKey="name" type="category" width={110} />
                  <Bar dataKey="value" isAnimationActive fill="#2563eb" barSize={18}>
                    <LabelList dataKey="percent" position="right" formatter={(v) => `${v}%`} />
                  </Bar>
                  <ReTooltip formatter={(v) => `${v} times`} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-slate-500">
                <div className="flex gap-4 items-center">
                  <LegendItem color="#2563eb" label="Submitted" />
                  <LegendItem color="#16a34a" label="Approved" />
                  <LegendItem color="#ef4444" label="Rejected" />
                  <LegendItem color="#94a3b8" label="Draft" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team table */}
        <section className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow border">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Your Team</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-center">Timesheets</th>
                </tr>
              </thead>
              <tbody>
                {loadingTeam ? (
                  <tr><td colSpan="3" className="text-center p-6 text-slate-500">Loading team...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan="3" className="text-center p-6 text-slate-500">No employees assigned yet.</td></tr>
                ) : employees.map((u, idx) => (
                  <tr key={u._id} className={`${idx % 2 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100 transition`}>
                    <td className="p-3 font-medium text-slate-700">{u.name}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => viewTimesheets(u)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm transition">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Selected user's timesheets modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-11/12 max-w-5xl max-h-[80vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-700">Timesheets — {selectedUser.name}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            {loadingSheets ? (
              <p className="text-center text-slate-500 py-4">Loading timesheets...</p>
            ) : timesheets.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No timesheets submitted yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="p-3 text-left">Week Start</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((t, idx) => {
                    const isBusy = actionBusyId === t._id;
                    const canAct = t.status === "submitted" && !isBusy;
                    return (
                      <tr key={t._id} className={`${idx % 2 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100 transition`}>
                        <td className="p-3 text-slate-700">{new Date(t.weekStart).toLocaleDateString("en-GB")}</td>
                        <td className="p-3 text-center"><StatusBadge status={t.status} /></td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => setViewingSheet(t)} className="px-3 py-1 rounded text-white text-sm bg-blue-600 hover:bg-blue-700">View</button>
                            {t.status === "submitted" && (
                              <>
                                <button onClick={() => approveTimesheet(t._id)} disabled={!canAct} className={`px-3 py-1 rounded text-white text-sm ${canAct ? "bg-green-600 hover:bg-green-700" : "bg-green-300"}`}>{isBusy ? "..." : "Approve"}</button>
                                <button onClick={() => rejectTimesheet(t._id)} disabled={!canAct} className={`px-3 py-1 rounded text-white text-sm ${canAct ? "bg-red-600 hover:bg-red-700" : "bg-red-300"}`}>{isBusy ? "..." : "Reject"}</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => selectedUser && viewTimesheets(selectedUser)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition">Refresh</button>
              <button onClick={() => setSelectedUser(null)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet detail modal */}
      {viewingSheet && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-11/12 max-w-6xl max-h-[85vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-700">Timesheet Details — {new Date(viewingSheet.weekStart).toLocaleDateString("en-GB")}</h3>
              <button onClick={() => setViewingSheet(null)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>

            {Array.isArray(viewingSheet.rows) && viewingSheet.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="p-2">Client</th>
                      <th className="p-2">Project</th>
                      <th className="p-2">Task</th>
                      <th className="p-2">Activity</th>
                      <th className="p-2">Mon</th>
                      <th className="p-2">Tue</th>
                      <th className="p-2">Wed</th>
                      <th className="p-2">Thu</th>
                      <th className="p-2">Fri</th>
                      <th className="p-2">Sat</th>
                      <th className="p-2">Sun</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingSheet.rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2">{r.client || "-"}</td>
                        <td className="p-2">{r.project || "-"}</td>
                        <td className="p-2">{r.task || "-"}</td>
                        <td className="p-2">{r.activity || "-"}</td>

                        {Array.from({ length: DAYS_IN_WEEK }).map((_, di) => {
                          const hasComment = r.comments && r.comments[di];
                          return (
                            <td key={di} className="p-2 text-center relative">
                              <div>{(r.hours && r.hours[di] != null) ? r.hours[di] : 0}</div>

                              <button
                                onClick={() => openCommentModal(viewingSheet._id, i, di, { client: r.client, project: r.project, task: r.task })}
                                className="absolute -top-2 -right-2 bg-white p-1 rounded shadow-sm hover:bg-slate-50"
                                title="View comment"
                                aria-label="View comment"
                                style={{ width: 26, height: 26 }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>

                              {hasComment ? (<span className="absolute left-2 top-2 w-2.5 h-2.5 rounded-full bg-blue-600" />) : null}
                            </td>
                          );
                        })}

                        <td className="p-2 text-center font-medium">{totalsForRow(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-500 py-4">No rows found in this timesheet.</p>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setViewingSheet(null)} className="px-4 py-2 rounded-lg border bg-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENT VIEW MODAL (portal, read-only) */}
      {commentModal.open &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 99999 }} role="dialog" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-[480px] max-w-[94%]">
              <div className="bg-indigo-700 rounded-t-xl px-6 py-3 text-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold">Comment</h4>
                  <button onClick={() => closeCommentModal()} className="text-white/90">✕</button>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-slate-500">Context</div>
                    <div className="font-medium">{commentModal.meta.project || commentModal.meta.client || commentModal.meta.task || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Date</div>
                    <div className="font-medium">{viewingSheet ? new Date(viewingSheet.weekStart).toLocaleDateString("en-GB") : "—"}</div>
                  </div>
                </div>

                <div className="border rounded p-3 min-h-[120px] text-sm text-slate-800" style={{ whiteSpace: "pre-wrap" }}>
                  {commentModal.text ? commentModal.text : <span className="text-slate-400">No comment.</span>}
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button onClick={() => closeCommentModal()} className="px-4 py-2 rounded-lg border">Close</button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      <style>{`
        @keyframes float { 0% { transform: translateY(0px);} 50% { transform: translateY(-10px);} 100% { transform: translateY(0px);} }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .shadow-2xl { box-shadow: 0 10px 30px rgba(2,6,23,0.06); }
      `}</style>
    </div>
  );
}

/* Helper subcomponents */
function StatCard({ title, value, color, icon }) {
  return (
    <div className="rounded-2xl p-5 shadow-lg border bg-white/90 backdrop-blur hover:shadow-2xl transition transform hover:-translate-y-1" style={{ borderColor: `${color}22` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-800">{value}</div>
        </div>
        <div className="p-3 rounded-xl text-white text-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}>
          <span style={{ fontSize: 20 }}>{icon || "•"}</span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ background: color }} className="w-3 h-3 rounded-full inline-block" />
      <span className="text-slate-600 text-sm">{label}</span>
    </div>
  );
}
