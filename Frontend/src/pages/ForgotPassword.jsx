// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      setLoading(true);
      const res = await http.post("/auth/forgot-password", { email });
      setMsg(res.message || "✅ Password reset link sent to your email.");
    } catch (e2) {
      setErr(e2.message || "❌ Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Yvidhya" className="h-14 mb-3" />
          <h2 className="text-2xl font-bold text-gray-700">Forgot Password</h2>
          <p className="text-sm text-gray-500 text-center mt-1">
            Enter your email address and we’ll send you a password reset link.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {err && <p className="text-red-500 text-sm">{err}</p>}
          {msg && <p className="text-green-600 text-sm">{msg}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white rounded-lg py-2 font-medium 
              hover:bg-blue-700 transition disabled:opacity-50`}
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
