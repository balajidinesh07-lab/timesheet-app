// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import logo from "../assets/logo-dark.png";
import { Eye, EyeOff } from "lucide-react"; // 👁 import eye icons

export default function AuthPage({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");

    try {
      const { token, user } = await http.post("/auth/login", { email, password });
      if (!token) throw new Error("No token returned");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user || {}));

      onAuth(token, user);

      if (user.mustResetPassword) return navigate("/force-reset");
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "manager") navigate("/manager");
      else navigate("/employee");
    } catch (error) {
      console.error(error);
      setErr(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // helper: floating label style fix
  const labelBase = (filled) =>
    `absolute left-4 transition-all px-1 rounded bg-white/70 ${
      filled
        ? "-top-2 text-xs text-blue-600"
        : "top-3.5 text-base text-gray-500"
    } peer-focus:-top-2 peer-focus:text-xs peer-focus:text-blue-600`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute -top-40 -left-32 w-96 h-96 bg-blue-300 rounded-full opacity-30 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-200 rounded-full opacity-40 blur-3xl animate-pulse"></div>

      {/* Login Card */}
      <div className="relative z-10 bg-white/70 backdrop-blur-2xl shadow-2xl rounded-3xl w-full max-w-md p-10 border border-white/30 transform transition-all duration-300 hover:shadow-blue-100 hover:-translate-y-1">
        {/* Logo + Heading */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={logo}
            alt="Yvidhya"
            className="h-20 w-auto mb-4 drop-shadow-md transition-transform duration-300 hover:scale-105"
          />
          <h2 className="text-3xl font-extrabold text-gray-800 bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-500 mt-2">Sign in to your Timesheet account</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-6 mt-4">
          {/* Email Field */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=" "
              className="peer w-full border border-gray-300 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder-transparent"
            />
            <label
              htmlFor="email"
              className={labelBase(Boolean(email && String(email).trim().length > 0))}
            >
              Email Address
            </label>
          </div>

          {/* Password Field with Eye Button */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder=" "
              className="peer w-full border border-gray-300 bg-white/60 backdrop-blur-md rounded-xl px-4 py-3 pr-12 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder-transparent"
            />
            <label
              htmlFor="password"
              className={labelBase(Boolean(password && String(password).trim().length > 0))}
            >
              Password
            </label>

            {/* Eye / EyeOff toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-blue-600 transition"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Error Message */}
          {err && (
            <p className="text-red-500 text-sm text-center animate-fade-in">
              ⚠️ {err}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-semibold text-lg shadow-md transform transition-all duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-500 hover:to-green-400 hover:shadow-lg hover:-translate-y-0.5"
            }`}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Forgot Password */}
        <div className="mt-5 text-center">
          <a
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline transition-colors"
          >
            Forgot your password?
          </a>
        </div>

        {/* Back to Landing Page */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            ← Back to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}
