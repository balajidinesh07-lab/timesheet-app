// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      setLoading(true);
      const res = await http.post("/auth/forgot-password", { email });
      // backend responds { message, resetLink } in dev — show friendly message
      setMsg(res.message || "✅ If that email exists, a reset link has been sent.");
      setEmail("");
    } catch (e2) {
      console.error("Forgot password error:", e2);
      const m =
        (e2 && e2.response && e2.response.data && e2.response.data.error) ||
        e2.message ||
        "❌ Failed to send reset link";
      setErr(m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 flex items-center justify-center p-6">
      {/* Background decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-28 w-72 h-72 bg-gradient-to-tr from-indigo-100 to-indigo-50 rounded-full opacity-30 blur-3xl animate-float" />
        <div className="absolute -right-28 -bottom-24 w-96 h-96 bg-gradient-to-tr from-green-50 to-green-100 rounded-full opacity-30 blur-3xl animate-float-slow" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <img src={logo} alt="logo" className="h-14 w-auto transform transition-transform hover:scale-105" />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Forgot your password?</h1>
            <p className="text-sm text-slate-500">
              Enter the email associated with your account. We'll send a secure reset link.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* left - info panel */}
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-slate-700">Reset via email</h2>
              <p className="text-sm text-slate-500">
                For security we’ll send a time-limited link to your inbox. If the email exists in our system you will receive the link.
                Check spam/junk if you don't see it.
              </p>

              <ul className="text-sm text-slate-600 space-y-2">
                <li>🔐 Secure token link (1 hour expiry)</li>
                <li>✅ Works for Admins, Managers & Employees</li>
                <li>📩 Delivered by email — no password exposure</li>
              </ul>

              <div className="mt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-slate-50 transition text-sm text-slate-700"
                >
                  Back to Login
                </button>
              </div>
            </div>

            {/* right - form */}
            <form onSubmit={submit} className="bg-gradient-to-b from-white/90 to-white rounded-xl p-4 md:p-6 border shadow-sm">
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                aria-label="Email for password reset"
              />

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

              <div className="mt-6 flex gap-3 items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition shadow"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("");
                    setErr("");
                    setMsg("");
                  }}
                  className="px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-400">
                If you don't receive the email, try again or contact your administrator.
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Need help? Reach out to support at <span className="font-medium">it@yvidhya.com</span>
        </div>
      </div>

      {/* embedded animation styles */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-14px) translateX(4px); }
          100% { transform: translateY(0px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
