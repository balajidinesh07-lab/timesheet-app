// src/pages/ForceResetPassword.jsx
import React, { useState } from "react";
import { http } from "../api/http";
import { useNavigate } from "react-router-dom";

export default function ForceResetPassword({ onLogout }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (newPw.length < 6) return setErr("Password must be at least 6 characters");
    if (newPw !== confirmPw) return setErr("Passwords do not match");

    try {
      setLoading(true);
      await http.post("/auth/reset-password", { newPassword: newPw });
      alert("✅ Password updated! Please log in again.");
      onLogout();
      navigate("/login");
    } catch (e) {
      setErr(e.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center">Set New Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Confirm Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {err && <p className="text-red-500 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
        <button
          onClick={onLogout}
          className="w-full mt-4 bg-gray-500 text-white py-2 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
