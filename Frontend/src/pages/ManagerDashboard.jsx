// src/pages/ManagerDashboard.jsx
import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from "react";
import ReactDOM from "react-dom";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

// icons
import {
  Menu,
  X,
  Layers,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  MoreHorizontal,
} from "lucide-react";

// Lazy-load optional manager leaves page (won't break if file missing)
const ManagerLeaveDashboard = lazy(() =>
  import("./ManagerLeaveDashboard.jsx").catch(() => ({ default: null }))
);

const STAT_COLORS = {
  projects: "#2563eb",
  open: "#16a34a",
  team: "#f59e0b",
  overdue: "#ef4444",
};
const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"];
const DAYS_IN_WEEK = 7;

export default function ManagerDashboard({ onLogout }) {
  // data state
  const [employees, setEmployees] = useState([]); // always prefer array
  const [timesheets, setTimesheets] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingSheet, setViewingSheet] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  // sidebar + navigation state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "profile" | "leaves"

  // comment modal state
  const [commentModal, setCommentModal] = useState({
    open: false,
    sheetId: null,
    rowIndex: null,
    dayIndex: null,
    text: "",
    meta: {},
  });

  const sidebarRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
    fetchTeamTimesheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // click outside to close sidebar on small screens
  useEffect(() => {
    function handleClick(e) {
      if (!sidebarOpen) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sidebarOpen]);

  // Defensive: normalise API result to an array of employees
  const normalizeEmployeesResponse = (resp) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    // Common wrappers
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.users)) return resp.users;
    if (Array.isArray(resp.team)) return resp.team;
    // If it's a single object representing one user, return array with it
    if (typeof resp === "object") {
      if (resp._id || resp.id) return [resp];
      console.warn("Manager/team: unexpected response shape:", resp);
      return [];
    }
    console.warn("Manager/team: unexpected primitive response:", resp);
    return [];
  };

  async function fetchEmployees() {
    try {
      setLoadingTeam(true);
      const team = await http.get("/manager/team");
      const normalized = normalizeEmployeesResponse(team);
      setEmployees(normalized);
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
      setTimesheets(Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []));
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
      const data = await http.get(`/manager/timesheets?userId=${user._id || user.id}`);
      setTimesheets(Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []));
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

  // Metrics for top cards (safe when employees isn't an array)
  const metrics = useMemo(() => {
    const projectSet = new Set();
    let openTasksCount = 0;
    let overdueCount = 0;
    const now = new Date();

    (Array.isArray(timesheets) ? timesheets : []).forEach((ts) => {
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
      teamMembers: Array.isArray(employees) ? employees.length : 0,
      overdueTasks: overdueCount,
    };
  }, [timesheets, employees]);

  // chart data
  const chartData = useMemo(() => {
    const counts = { Completed: 0, "In Progress": 0, "On Hold": 0, Cancelled: 0 };
    (Array.isArray(timesheets) ? timesheets : []).forEach((t) => {
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
    const total = (Array.isArray(timesheets) ? timesheets.length : 0) || 1;
    const byStatus = (Array.isArray(timesheets) ? timesheets : []).reduce((acc, t) => {
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

  // ---------- Render (layout with sidebar) ----------
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-green-50 border-r border-green-100 flex flex-col shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-100">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-8" />
            <div>
              <h2 className="text-green-800 font-semibold text-sm">Manager Panel</h2>
              <p className="text-green-600 text-xs">Overview & approvals</p>
            </div>
          </div>

          {/* X close button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-green-700 hover:text-green-900"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-4 text-sm">
          <SidebarLink
            label="Dashboard"
            icon={<Layers size={18} />}
            active={activeTab === "dashboard"}
            onClick={() => {
              setActiveTab("dashboard");
              setSidebarOpen(false);
            }}
          />
          <SidebarLink
            label="Profile"
            icon={<User size={18} />}
            active={activeTab === "profile"}
            onClick={() => {
              setActiveTab("profile");
              setSidebarOpen(false);
            }}
          />
          <SidebarLink
            label="Leaves"
            icon={<CalendarIcon size={18} />}
            active={activeTab === "leaves"}
            onClick={() => {
              setActiveTab("leaves");
              setSidebarOpen(false);
            }}
          />
        </nav>

        <div className="mt-auto p-4">
          <button onClick={onLogout} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <nav className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm">
          <div className="flex items-center gap-4">
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="md:hidden text-slate-700 hover:text-slate-900"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>

            <img src={logo} alt="Logo" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold text-slate-700">Manager Dashboard</h1>
              <p className="text-sm text-slate-500">Overview & approvals for your team</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchTeamTimesheets} className="bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg text-sm">
              Refresh
            </button>
            <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow">
              Logout
            </button>
          </div>
        </nav>

        {/* Main content body */}
        <main className="flex-1 overflow-y-auto px-6 py-10">
          {activeTab === "dashboard" && (
            <>
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
                      ) : !Array.isArray(employees) || employees.length === 0 ? (
                        <tr><td colSpan="3" className="text-center p-6 text-slate-500">No employees assigned yet.</td></tr>
                      ) : employees.map((u, idx) => (
                        <tr key={u._id || u.id || idx} className={`${idx % 2 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100 transition`}>
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
                    ) : (Array.isArray(timesheets) && timesheets.length === 0) ? (
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
                          {(Array.isArray(timesheets) ? timesheets : []).map((t, idx) => {
                            const isBusy = actionBusyId === t._id;
                            const canAct = t.status === "submitted" && !isBusy;
                            return (
                              <tr key={t._id || `${idx}`} className={`${idx % 2 ? "bg-white" : "bg-slate-50"} hover:bg-slate-100 transition`}>
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
                    <div className="bg-white rounded-xl shadow-2xl w-[560px] max-w-[96%]">
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

                        <div
                          className="border rounded p-3 min-h-[120px] text-sm text-slate-800 comment-content"
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            maxHeight: 360,
                            overflowY: "auto",
                          }}
                        >
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
            </>
          )}

          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl p-6 shadow border">
              <h2 className="text-lg font-semibold mb-2">Profile</h2>
              <p className="text-sm text-slate-600">Manager profile & settings go here.</p>
            </div>
          )}

          {activeTab === "leaves" && (
            <Suspense fallback={<div className="p-6 bg-white rounded-2xl shadow text-slate-600">Loading leaves…</div>}>
              <ManagerLeaveDashboard />
            </Suspense>
          )}
        </main>
      </div>

      <style>{`
        @keyframes float { 0% { transform: translateY(0px);} 50% { transform: translateY(-10px);} 100% { transform: translateY(0px);} }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .shadow-2xl { box-shadow: 0 10px 30px rgba(2,6,23,0.06); }

        /* Extra safe CSS for comment content to prevent overflow with unbroken strings */
        .comment-content {
          -webkit-hyphens: auto;
          -ms-word-break: break-word;
          word-break: break-word;
          overflow-wrap: anywhere;
          word-wrap: break-word;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
}

/* Helper subcomponents kept at bottom (unchanged appearance) */
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

/* Compact sidebar link component */
function SidebarLink({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-left w-full transition ${
        active ? "bg-green-700 text-white shadow" : "text-green-800 hover:bg-green-100"
      }`}
    >
      <div className={`p-2 rounded ${active ? "bg-white/10" : "bg-transparent"}`}>{icon}</div>
      <div className="font-medium">{label}</div>
    </button>
  );
}
