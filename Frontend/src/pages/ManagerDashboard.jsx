// src/pages/ManagerDashboard.jsx
import React, { useState, useEffect } from "react";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";

export default function ManagerDashboard({ onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null); // which timesheet is being acted on

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoadingTeam(true);
      const team = await http.get("/manager/team");
      setEmployees(team);
    } catch (err) {
      console.error("Manager team fetch error:", err);
      setEmployees([]);
    } finally {
      setLoadingTeam(false);
    }
  }

  async function viewTimesheets(user) {
    try {
      setLoadingSheets(true);
      setSelectedUser(user);
      const data = await http.get(`/manager/timesheets?userId=${user._id}`);
      setTimesheets(data);
    } catch (err) {
      console.error("Manager timesheets fetch error:", err);
      setTimesheets([]);
    } finally {
      setLoadingSheets(false);
    }
  }

  // Optimistically update a row's status locally
  function updateRowStatusLocally(id, newStatus) {
    setTimesheets((prev) =>
      prev.map((t) => (t._id === id ? { ...t, status: newStatus } : t))
    );
  }

  async function approveTimesheet(id) {
    try {
      setActionBusyId(id);
      // Optimistic UI
      updateRowStatusLocally(id, "approved");
      await http.patch(`/timesheets/${id}/approve`);
      // Re-sync to be safe
      if (selectedUser) viewTimesheets(selectedUser);
    } catch (err) {
      console.error(err);
      alert("Failed to approve timesheet");
      // revert optimistic change by reloading list
      if (selectedUser) viewTimesheets(selectedUser);
    } finally {
      setActionBusyId(null);
    }
  }

  async function rejectTimesheet(id) {
    try {
      setActionBusyId(id);
      // Optimistic UI
      updateRowStatusLocally(id, "rejected");
      await http.patch(`/timesheets/${id}/reject`);
      // Re-sync
      if (selectedUser) viewTimesheets(selectedUser);
    } catch (err) {
      console.error(err);
      alert("Failed to reject timesheet");
      // revert optimistic change by reloading list
      if (selectedUser) viewTimesheets(selectedUser);
    } finally {
      setActionBusyId(null);
    }
  }

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
    <div className="bg-gray-50 min-h-screen">
      {/* Navbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Yvidhya" className="h-10" />
          <span className="text-xl font-semibold text-gray-700">Manager Panel</span>
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md mt-8 p-6">
        <h2 className="text-2xl font-bold text-center mb-6">Manager Dashboard</h2>

        {/* Employees Table */}
        <h3 className="text-lg font-semibold mb-4">Your Employees</h3>
        <table className="w-full border rounded">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Timesheets</th>
            </tr>
          </thead>
          <tbody>
            {loadingTeam ? (
              <tr>
                <td colSpan="3" className="text-center py-4 text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center py-4 text-gray-500">
                  No employees assigned.
                </td>
              </tr>
            ) : (
              employees.map((u, idx) => (
                <tr key={u._id} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">
                    <button
                      onClick={() => viewTimesheets(u)}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      View Timesheets
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Timesheets Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 w-3/4 max-h-[80vh] overflow-y-auto shadow-lg">
              <h3 className="text-lg font-semibold mb-4">
                Timesheets — {selectedUser.name} ({selectedUser.email})
              </h3>
              {loadingSheets ? (
                <p className="text-gray-600">Loading timesheets…</p>
              ) : timesheets.length === 0 ? (
                <p className="text-gray-600">No timesheets submitted.</p>
              ) : (
                <table className="w-full border rounded">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2">Week Start</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((t, idx) => {
                      const isBusy = actionBusyId === t._id;
                      const canAct = t.status === "submitted" && !isBusy;

                      return (
                        <tr key={t._id} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-2">
                            {new Date(t.weekStart).toLocaleDateString("en-GB")}
                          </td>
                          <td className="p-2">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="p-2">
                            {t.status === "submitted" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveTimesheet(t._id)}
                                  disabled={!canAct}
                                  className={`px-3 py-1 rounded text-white ${
                                    canAct
                                      ? "bg-green-600 hover:bg-green-700"
                                      : "bg-green-300 cursor-not-allowed"
                                  }`}
                                  title={isBusy ? "Working..." : "Approve"}
                                >
                                  {isBusy ? "…" : "Approve"}
                                </button>
                                <button
                                  onClick={() => rejectTimesheet(t._id)}
                                  disabled={!canAct}
                                  className={`px-3 py-1 rounded text-white ${
                                    canAct
                                      ? "bg-red-600 hover:bg-red-700"
                                      : "bg-red-300 cursor-not-allowed"
                                  }`}
                                  title={isBusy ? "Working..." : "Reject"}
                                >
                                  {isBusy ? "…" : "Reject"}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">No actions</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <div className="mt-4 flex justify-between">
                <button
                  onClick={() => selectedUser && viewTimesheets(selectedUser)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
