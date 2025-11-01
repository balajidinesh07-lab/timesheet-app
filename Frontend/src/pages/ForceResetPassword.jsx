// src/pages/ForceResetPassword.jsx
import React, { useMemo, useState } from "react";
import { http } from "../api/http";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png";
import { getUser as getSessionUser } from "../utils/session";

export default function ForceResetPassword({ onLogout }) {
  const user = getSessionUser() || {};
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  // small password strength heuristic
  const pwStrength = useMemo(() => {
    const s = newPw || "";
    let score = 0;
    if (s.length >= 6) score += 1;
    if (/[0-9]/.test(s)) score += 1;
    if (/[A-Z]/.test(s)) score += 1;
    if (/[^A-Za-z0-9]/.test(s)) score += 1;
    return { score, pct: (score / 4) * 100 };
  }, [newPw]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (newPw.length < 6) return setErr("Password must be at least 6 characters");
    if (newPw !== confirmPw) return setErr("Passwords do not match");

    try {
      setLoading(true);
      await http.post("/auth/reset-password", { newPassword: newPw });
      // show small success microcopy then log out
      alert("✅ Password updated! You'll be redirected to login.");
      onLogout();
      navigate("/login");
    } catch (e) {
      console.error("Reset error:", e);
      // axios errors often have response.data.error
      const message =
        (e && e.response && e.response.data && e.response.data.error) ||
        e.message ||
        "Failed to update password";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 flex items-center justify-center p-6">
      {/* decorative floating shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-24 w-72 h-72 bg-gradient-to-tr from-indigo-100 to-indigo-50 rounded-full opacity-40 blur-3xl animate-animateFloat" />
        <div className="absolute -right-24 -bottom-20 w-96 h-96 bg-gradient-to-tr from-green-50 to-green-100 rounded-full opacity-40 blur-3xl animate-animateFloatSlow" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="logo" className="h-14 w-auto transform hover:scale-105 transition" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Set a new password</h1>
            <p className="text-sm text-slate-500">For <span className="font-medium">{user?.email || "your account"}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Left: instructions */}
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-2">Create a strong password</h2>
              <p className="text-sm text-slate-500 mb-4">
                Choose a password you'll remember. It should be at least 6 characters and include a mix of numbers,
                uppercase letters or symbols for better security.
              </p>

              <ul className="text-sm space-y-2 text-slate-600">
                <li>✅ At least 6 characters</li>
                <li>✅ Include numbers (recommended)</li>
                <li>✅ Avoid using easily guessable info (like your name)</li>
              </ul>

              <div className="mt-6">
                <div className="text-xs text-slate-500 mb-2">Password strength</div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    style={{ width: `${pwStrength.pct}%` }}
                    className={`h-2 rounded-full transition-all ${pwStrength.score >= 3 ? "bg-green-500" : pwStrength.score === 2 ? "bg-yellow-400" : "bg-red-400"}`}
                    aria-hidden
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {pwStrength.score >= 3 ? "Strong" : pwStrength.score === 2 ? "Moderate" : "Weak"}
                </div>
              </div>
            </div>

            {/* Right: form */}
            <form onSubmit={handleSubmit} className="bg-gradient-to-b from-white/80 to-white rounded-xl p-4 md:p-6 border shadow-sm">
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <div className="mt-2 relative">
                <input
                  type={show ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoFocus
                  required
                  className="w-full pr-10 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  placeholder="Enter new password"
                  aria-label="New password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-700"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>

              <label className="mt-4 block text-sm font-medium text-slate-700">Confirm password</label>
              <div className="mt-2 relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  className="w-full pr-10 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                  placeholder="Repeat new password"
                  aria-label="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-2.5 text-slate-500 hover:text-slate-700"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>

              {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

              <div className="mt-6 flex gap-3 items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition shadow"
                >
                  {loading ? "Updating…" : "Update password"}
                </button>

                <button
                  type="button"
                  onClick={() => { onLogout(); navigate("/login"); }}
                  className="px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel & Logout
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-400">
                By updating your password you will be asked to login again.
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Need help? Contact your administrator.
        </div>
      </div>

      {/* Tailwind-like keyframes for animation (embedded style) */}
      <style>{`
        @keyframes floaty {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }
        .animate-animateFloat { animation: floaty 6s ease-in-out infinite; }
        .animate-animateFloatSlow { animation: floaty 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

