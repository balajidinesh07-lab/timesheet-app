// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const data = await http.get("/users");
      setUsers(data);
      setManagers(data.filter((u) => u.role === "manager"));
    } catch (err) {
      console.error(err);
    }
  }

  // ✅ Create user with temp password (force reset on first login)
  async function createUser() {
    if (!form.name || !form.email) {
      setError("Name and Email are required");
      return;
    }
    try {
      setError("");
      await http.post("/users", {
        ...form,
        mustResetPassword: true, // 👈 ensure force reset
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

  // 🔧 Assign or unassign manager (empty -> null)
  async function assignToManager(userId, managerIdRaw) {
    try {
      setAssignBusy(userId);

      const managerId = managerIdRaw && managerIdRaw.trim() !== "" ? managerIdRaw : null;

      // Guard: if same as current, avoid no-op request
      const current = users.find((u) => u._id === userId);
      const currentManagerId = current?.manager?._id || null;
      if (currentManagerId === managerId) {
        alert("No change: selected manager is the same.");
        setAssignBusy(null);
        return;
      }

      const updated = await http.put(`/users/${userId}/assign`, { managerId });

      // ✅ Feedback
      const assignedName =
        managers.find((m) => m._id === managerId)?.name || "Unassigned";
      alert(`✅ Manager ${managerId ? "assigned" : "cleared"}: ${assignedName}`);

      // Refresh list so the dropdown reflects the latest assignment
      await fetchUsers();

      // Optional: console log the backend response for debugging
      console.log("Assign response:", updated);
    } catch (err) {
      console.error("Assign Manager error:", err);
      alert(err.message || "Failed to assign Manager");
    } finally {
      setAssignBusy(null);
    }
  }

  async function viewTimesheets(userId) {
    try {
      const data = await http.get(`/timesheets/user/${userId}`);
      setTimesheets(data);
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
  const pendingTimesheets = timesheets.filter((t) => t.status === "draft").length;

  // Pie Chart Data
  const roleData = [
    { name: "Employees", value: totalEmployees },
    { name: "Managers", value: totalManagers },
    { name: "Admins", value: users.filter((u) => u.role === "admin").length },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow">
        <img src={logo} alt="Yvidhya" className="h-12" />
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Stats Section */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <CardStat title="Total Users" value={users.length} color="blue" />
        <CardStat title="Employees" value={totalEmployees} color="green" />
        <CardStat title="Managers" value={totalManagers} color="yellow" />
      </div>

      {/* Pie Chart */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md mt-8 p-6">
        <h3 className="text-lg font-semibold mb-4">User Role Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Main Card */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md mt-8 p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Manage Users</h2>

        {/* Create User Form */}
        <div className="flex gap-2 mb-4">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex-1 border rounded px-3 py-2"
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="flex-1 border rounded px-3 py-2"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="flex-1 border rounded px-3 py-2"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={createUser}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create
          </button>
        </div>
        {error && <p className="text-red-600 mb-4">{error}</p>}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full border rounded">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Manager</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u._id} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">
                    {u.role === "employee" ? (
                      <select
                        value={u.manager?._id || ""}
                        onChange={(e) => assignToManager(u._id, e.target.value)}
                        className="border rounded px-2 py-1"
                        disabled={assignBusy === u._id}
                      >
                        <option value="">-- Assign Manager --</option>
                        {managers.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2">
                    {u.role === "employee" && (
                      <button
                        onClick={() => viewTimesheets(u._id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded mr-2 hover:bg-blue-700"
                      >
                        View Timesheets
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(u._id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timesheet Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 w-3/4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Timesheets for {selectedUser.name} ({selectedUser.email})
            </h3>
            {timesheets.length === 0 ? (
              <p>No timesheets found</p>
            ) : (
              <table className="w-full border rounded">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-2">Week Start</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((t) => (
                    <tr key={t._id}>
                      <td className="p-2">
                        {new Date(t.weekStart).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-2">{t.status}</td>
                      <td className="p-2">{t.rows.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              onClick={() => setSelectedUser(null)}
              className="bg-red-600 text-white px-4 py-2 rounded mt-4 hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function CardStat({ title, value, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
  };
  return (
    <div className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center">
      <h4 className="text-lg font-semibold">{title}</h4>
      <p className={`mt-2 text-3xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}
