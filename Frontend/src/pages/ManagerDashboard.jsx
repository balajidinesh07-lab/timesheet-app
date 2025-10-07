// src/pages/ManagerDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
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

export default function ManagerDashboard({ onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

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

  // fetch all team timesheets (used for metrics & charts)
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

  // open timesheets for a specific user (modal)
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

  // optimistic UI update helper
  function updateRowStatusLocally(id, newStatus) {
    setTimesheets((prev) => prev.map((t) => (t._id === id ? { ...t, status: newStatus } : t)));
  }

  async function approveTimesheet(id) {
    try {
      setActionBusyId(id);
      updateRowStatusLocally(id, "approved");
      await http.patch(`/timesheets/${id}/approve`);
      // re-sync all timesheets for dashboard
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

  // Derived metrics for cards + charts
  const metrics = useMemo(() => {
    // Total projects = unique project names found in all timesheets rows
    const projectSet = new Set();
    let openTasksCount = 0;
    let overdueCount = 0;

    const now = new Date();

    (timesheets || []).forEach((ts) => {
      if (Array.isArray(ts.rows)) {
        ts.rows.forEach((r) => {
          if (r.project) projectSet.add(String(r.project).trim() || "—");
          // consider a row with some hours as an "open task"
          const rowHasHours = Array.isArray(r.hours) && r.hours.some((h) => Number(h) > 0);
          if (!rowHasHours) {
            // if no hours but task details exist, treat as open
            if (r.task || r.activity || r.client) openTasksCount++;
          } else {
            // if has hours and sheet is submitted but older than 14 days we might call overdue
            // fallback: check timesheet status + createdAt updatedAt
          }
        });
      }

      // Overdue heuristic:
      // If timesheet is 'submitted' and submittedAt older than 14 days -> overdue
      if (ts.status === "submitted") {
        const sub = ts.submittedAt ? new Date(ts.submittedAt) : null;
        if (sub) {
          const ageDays = Math.floor((now - sub) / (1000 * 60 * 60 * 24));
          if (ageDays > 14) overdueCount++;
        } else {
          // no submittedAt -> treat as potential overdue (older updatedAt)
          const upd = ts.updatedAt ? new Date(ts.updatedAt) : null;
          if (upd) {
            const ageDays = Math.floor((now - upd) / (1000 * 60 * 60 * 24));
            if (ageDays > 21) overdueCount++;
          }
        }
      }
    });

    // As a fallback for open tasks, count any timesheets with status "draft" or "submitted"
    const extraOpen = (timesheets || []).filter((t) => t.status === "submitted" || t.status === "draft").length;
    if (openTasksCount === 0) openTasksCount = extraOpen;

    const totalProjects = projectSet.size;

    return {
      totalProjects,
      openTasks: openTasksCount,
      teamMembers: employees.length,
      overdueTasks: overdueCount,
    };
  }, [timesheets, employees]);

  // Build chart data (map timesheet.status -> categories)
  const chartData = useMemo(() => {
    const counts = { Completed: 0, "In Progress": 0, "On Hold": 0, Cancelled: 0 };
    (timesheets || []).forEach((t) => {
      // map statuses:
      // approved -> Completed
      // submitted -> In Progress
      // draft -> On Hold
      // rejected -> Cancelled
      const s = (t.status || "draft").toString();
      if (s === "approved") counts.Completed++;
      else if (s === "submitted") counts["In Progress"]++;
      else if (s === "draft") counts["On Hold"]++;
      else if (s === "rejected") counts.Cancelled++;
    });

    // ensure at least some sample values to keep charts looking nice if empty
    const data = [
      { name: "Completed", value: counts.Completed },
      { name: "In Progress", value: counts["In Progress"] },
      { name: "On Hold", value: counts["On Hold"] },
      { name: "Cancelled", value: counts.Cancelled },
    ];
    return data;
  }, [timesheets]);

  // Tasks overview: display relative proportions of statuses
  const tasksOverview = useMemo(() => {
    const total = (timesheets || []).length || 1;
    const byStatus = timesheets.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {}
    );
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
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${map[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      {/* decorative floating shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-16 w-80 h-80 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-tr from-green-100 to-teal-50 rounded-full opacity-40 blur-3xl animate-float-slow" />
      </div>

      {/* NAV */}
      <nav className="relative z-10 flex justify-between items-center px-6 py-4 bg-white/80 backdrop-blur-md border-b shadow-sm">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Yvidhya" className="h-14 transform transition hover:scale-105" />
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Manager Dashboard</h1>
            <p className="text-sm text-slate-500">Overview & approvals for your team</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchTeamTimesheets}
            className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-sm transition"
            title="Refresh data"
          >
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-right" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
  <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
</svg>
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Stats Row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Projects"
            value={metrics.totalProjects}
            color={STAT_COLORS.projects}
            icon="📁"
          />
          <StatCard
            title="Open Tasks"
            value={metrics.openTasks}
            color={STAT_COLORS.open}
            icon="🟢"
          />
          <StatCard
            title="Team Members"
            value={metrics.teamMembers}
            color={STAT_COLORS.team}
            icon="👥"
          />
          <StatCard
            title="Overdue Tasks"
            value={metrics.overdueTasks}
            color={STAT_COLORS.overdue}
            icon="⚠️"
          />
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Project Status (Donut) */}
          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow border">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Project Status</h3>
            <div className="flex gap-4 items-center">
              <div style={{ width: 260, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={3}
                      label={(entry) => (entry.value ? `${entry.name}` : "")}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={`c-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1">
                <ul className="space-y-2">
                  {chartData.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-3">
                      <span
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                        className="w-3 h-3 rounded-full inline-block"
                      />
                      <span className="text-slate-700 font-medium w-32">{d.name}</span>
                      <span className="text-slate-500">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tasks Overview (Bar / progress) */}
          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow border">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Tasks Overview</h3>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tasksOverview}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
                >
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

        {/* Team Table */}
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
                  <tr>
                    <td colSpan="3" className="text-center p-6 text-slate-500">
                      Loading team...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center p-6 text-slate-500">
                      No employees assigned yet.
                    </td>
                  </tr>
                ) : (
                  employees.map((u, idx) => (
                    <tr
                      key={u._id}
                      className={`${idx % 2 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100 transition`}
                    >
                      <td className="p-3 font-medium text-slate-700">{u.name}</td>
                      <td className="p-3 text-slate-600">{u.email}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => viewTimesheets(u)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-sm transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Timesheet Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-11/12 max-w-5xl max-h-[80vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-semibold text-slate-700">
                Timesheets — {selectedUser.name}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-500 hover:text-slate-700">
                ✕
              </button>
            </div>

            {loadingSheets ? (
              <p className="text-slate-500 text-center py-4">Loading timesheets...</p>
            ) : timesheets.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No timesheets submitted yet.</p>
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
                      <tr
                        key={t._id}
                        className={`${idx % 2 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100 transition`}
                      >
                        <td className="p-3 text-slate-700">
                          {new Date(t.weekStart).toLocaleDateString("en-GB")}
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="p-3 text-center">
                          {t.status === "submitted" ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => approveTimesheet(t._id)}
                                disabled={!canAct}
                                className={`px-3 py-1 rounded text-white text-sm ${
                                  canAct ? "bg-green-600 hover:bg-green-700" : "bg-green-300 cursor-not-allowed"
                                }`}
                              >
                                {isBusy ? "..." : "Approve"}
                              </button>
                              <button
                                onClick={() => rejectTimesheet(t._id)}
                                disabled={!canAct}
                                className={`px-3 py-1 rounded text-white text-sm ${
                                  canAct ? "bg-red-600 hover:bg-red-700" : "bg-red-300 cursor-not-allowed"
                                }`}
                              >
                                {isBusy ? "..." : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">No actions</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => selectedUser && viewTimesheets(selectedUser)}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition"
              >
                Refresh
              </button>
              <button onClick={() => setSelectedUser(null)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* small styles & animations */}
      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* -------------------------
   Helper subcomponents
   ------------------------- */

function StatCard({ title, value, color, icon }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-lg border bg-white/90 backdrop-blur hover:shadow-2xl transition transform hover:-translate-y-1"
      style={{ borderColor: `${color}22` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-800">{value}</div>
        </div>
        <div
          className="p-3 rounded-xl text-white text-lg"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
        >
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
