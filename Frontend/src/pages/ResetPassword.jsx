// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (password.length < 6) return setErr("Password must be at least 6 characters");
    if (password !== confirm) return setErr("Passwords do not match");

    try {
      setLoading(true);
      const res = await http.post(`/auth/reset-password/${token}`, {
        newPassword: password,
      });
      setMsg(res.message || "✅ Password updated successfully! Redirecting...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (e2) {
      console.error(e2);
      setErr(e2.message || "❌ Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100 p-6">
      {/* Decorative animated shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-20 w-80 h-80 bg-gradient-to-tr from-indigo-100 to-indigo-50 rounded-full opacity-40 blur-3xl animate-float" />
        <div className="absolute -right-24 -bottom-28 w-96 h-96 bg-gradient-to-tr from-green-50 to-green-100 rounded-full opacity-40 blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <img
            src={logo}
            alt="Yvidhya"
            className="h-14 w-auto transform transition-transform hover:scale-105"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Reset your password</h1>
            <p className="text-sm text-slate-500">
              Create a new secure password to regain access to your account.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-8 border animate-slideUp">
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left Info Panel */}
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-2">Password Guidelines</h2>
              <p className="text-sm text-slate-500 mb-4">
                Choose a strong password that you haven’t used before on this site.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✅ Minimum 6 characters</li>
                <li>✅ Use upper and lowercase letters</li>
                <li>✅ Include at least one number or symbol</li>
              </ul>

              <div className="mt-6 text-xs text-slate-400">
                After resetting, you’ll be redirected to login.
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="bg-gradient-to-b from-white/90 to-white rounded-xl p-5 border shadow-sm">
              <label className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <div className="relative mt-2">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-700 text-xs"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              <label className="block text-sm font-medium text-slate-700 mt-4">
                Confirm Password
              </label>
              <div className="relative mt-2">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full pr-10 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-700 text-xs"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>

              {err && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 p-2 rounded">
                  {err}
                </div>
              )}
              {msg && (
                <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-100 p-2 rounded">
                  {msg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 font-medium transition shadow"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-3 w-full bg-slate-100 text-slate-600 rounded-lg py-2 hover:bg-slate-200 transition"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Need help? Contact <span className="font-medium">support@yvidhya.com</span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }

        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
      `}</style>
    </div>
  );
}

