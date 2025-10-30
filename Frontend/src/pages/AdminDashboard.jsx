// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Colors for Pie Chart
const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444"];

export default function AdminDashboard({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", role: "employee" });
  const [error, setError] = useState("");
  const [timesheets, setTimesheets] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignBusy, setAssignBusy] = useState(null); // track which user is being updated
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await http.get("/users");
      setUsers(data || []);
      setManagers((data || []).filter((u) => u.role === "manager"));
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Create user with temp password (force reset on first login)
  async function createUser() {
    if (!form.name || !form.email) {
      setError("Name and Email are required");
      return;
    }
    try {
      setError("");
      await http.post("/users", {
        ...form,
        mustResetPassword: true, // ensure force reset
      });
      alert(`✅ User created! Temp password has been sent to ${form.email}`);
      setForm({ name: "", email: "", role: "employee" });
      fetchUsers();
    } catch (err) {
      console.error("Create user error:", err);
      setError(err.message || "Failed to create user");
    }
  }

  async function deleteUser(id) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await http.del(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  }

  // Assign or unassign manager (empty -> null)
  async function assignToManager(userId, managerIdRaw) {
    try {
      setAssignBusy(userId);

      const managerId =
        managerIdRaw && managerIdRaw.trim() !== "" ? managerIdRaw : null;

      // Guard: if same as current, avoid no-op request
      const current = users.find((u) => u._id === userId);
      const currentManagerId = current?.manager?._id || null;
      if (currentManagerId === managerId) {
        // no change
        setAssignBusy(null);
        return;
      }

      // optimistic UI update
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, manager: managerId ? { _id: managerId } : null } : u
        )
      );

      const updated = await http.put(`/users/${userId}/assign`, { managerId });

      // Refresh list so the dropdown reflects the latest assignment (server truth)
      await fetchUsers();

      const assignedName =
        managers.find((m) => m._id === managerId)?.name || "Unassigned";
      if (managerId) {
        alert(`✅ Assigned to ${assignedName}`);
      } else {
        alert("✅ Manager cleared");
      }

      console.log("Assign response:", updated);
    } catch (err) {
      console.error("Assign Manager error:", err);
      alert(err.message || "Failed to assign Manager");
      // reload to recover state
      fetchUsers();
    } finally {
      setAssignBusy(null);
    }
  }

  async function viewTimesheets(userId) {
    try {
      const data = await http.get(`/timesheets/user/${userId}`);
      setTimesheets(data || []);
      const user = users.find((u) => u._id === userId);
      setSelectedUser(user);
    } catch (err) {
      console.error("Fetch timesheets error:", err);
      alert("Failed to fetch timesheets");
    }
  }

  // KPI Cards
  const totalEmployees = users.filter((u) => u.role === "employee").length;
  const totalManagers = managers.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;

  // Pie Chart Data
  const roleData = [
    { name: "Employees", value: totalEmployees },
    { name: "Managers", value: totalManagers },
    { name: "Admins", value: totalAdmins },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <img src={logo} alt="logo" className="h-12 w-auto transform transition-transform hover:scale-105" />
          <div>
            <h1 className="text-lg font-semibold text-slate-700">Admin Console</h1>
            <p className="text-xs text-slate-400">Manage users, assign managers, and view timesheets</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow-sm transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-right" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
  <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
</svg>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">
        {/* Top KPIs */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Total Users"
            value={users.length}
            subtitle="All registered accounts"
            color="blue"
            loading={loading}
          />
          <KpiCard
            title="Employees"
            value={totalEmployees}
            subtitle="Active employees"
            color="green"
            loading={loading}
          />
          <KpiCard
            title="Managers"
            value={totalManagers}
            subtitle="Users with manager role"
            color="yellow"
            loading={loading}
          />
        </section>

        {/* Middle: Chart + Create user */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 bg-white/70 backdrop-blur rounded-2xl p-6 shadow-lg border">
            <h3 className="text-lg font-semibold mb-4">User Role Distribution</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label
                  >
                    {roleData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-slate-500">Hover or click slices to see counts. Data updates when users change.</div>
          </div>

          {/* Create user / filter card */}
          <div className="bg-white/70 backdrop-blur rounded-2xl p-6 shadow-lg border flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Create User</h3>
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 transition"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 transition"
              type="email"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={createUser}
              className="mt-2 bg-gradient-to-r from-blue-600 to-green-500 text-white px-4 py-2 rounded-lg hover:opacity-95 transition"
            >
              Create user
            </button>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="mt-auto text-xs text-slate-400">Created users receive a temporary password and are required to reset it on first login.</div>
          </div>
        </section>

        {/* Users table */}
        <section className="mt-8 bg-white/70 backdrop-blur rounded-2xl p-6 shadow-lg border">
          <h3 className="text-xl font-semibold mb-4">Manage Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left text-sm text-slate-600">Name</th>
                  <th className="p-3 text-left text-sm text-slate-600">Email</th>
                  <th className="p-3 text-left text-sm text-slate-600">Role</th>
                  <th className="p-3 text-left text-sm text-slate-600">Manager</th>
                  <th className="p-3 text-right text-sm text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-400 animate-pulse">Loading users…</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-slate-400">No users yet.</td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr
                      key={u._id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="p-3 text-slate-700">{u.name}</td>
                      <td className="p-3 text-slate-600">{u.email}</td>
                      <td className="p-3 text-slate-600 capitalize">{u.role}</td>
                      <td className="p-3">
                        {u.role === "employee" ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={u.manager?._id || ""}
                              onChange={(e) => assignToManager(u._id, e.target.value)}
                              disabled={assignBusy === u._id}
                              className="border rounded px-3 py-1 text-sm transition"
                            >
                              <option value="">-- Assign Manager --</option>
                              {managers.map((m) => (
                                <option key={m._id} value={m._id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            {assignBusy === u._id && (
                              <span className="text-xs text-slate-500">Updating…</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          {u.role === "employee" && (
                            <button
                              onClick={() => viewTimesheets(u._id)}
                              className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
                            >
                              View Timesheets
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(u._id)}
                            className="px-3 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Timesheet Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Timesheets for {selectedUser.name} ({selectedUser.email})
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              {timesheets.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No timesheets found</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">Week Start</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((t) => (
                      <tr key={t._id} className="odd:bg-white even:bg-slate-50">
                        <td className="p-3">{new Date(t.weekStart).toLocaleDateString("en-GB")}</td>
                        <td className="p-3 capitalize">{t.status}</td>
                        <td className="p-3">{(t.rows || []).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// KPI Card component
function KpiCard({ title, value, subtitle, color = "blue", loading }) {
  const bg = {
    blue: "bg-gradient-to-r from-blue-50 to-blue-100",
    green: "bg-gradient-to-r from-green-50 to-green-100",
    yellow: "bg-gradient-to-r from-yellow-50 to-yellow-100",
  }[color];

  const text = {
    blue: "text-blue-700",
    green: "text-green-700",
    yellow: "text-yellow-700",
  }[color];

  return (
    <div
      className={`rounded-2xl p-5 shadow-lg border ${bg} hover:scale-[1.01] transition-transform`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className={`mt-2 text-3xl font-bold ${text}`}>
            {loading ? <span className="animate-pulse text-slate-400">—</span> : value}
          </div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
        <div className="self-center">
          <div className="bg-white/60 px-3 py-2 rounded-lg shadow-sm text-sm text-slate-600">Now</div>
        </div>
      </div>
    </div>
  );
}
