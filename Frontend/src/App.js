// src/App.js
import React, { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import AuthPage from "./pages/AuthPage.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import TimesheetDashboard from "./pages/TimesheetDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
// Optional manager leaves page — lazy loaded so missing file won't break compile
const ManagerLeaveDashboard = lazy(() =>
  import("./pages/ManagerLeaveDashboard.jsx").catch(() => ({ default: null }))
);
import ForceResetPassword from "./pages/ForceResetPassword.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import LandingPage from "./pages/LandingPage.jsx";

import PayrollDashboard from "./pages/PayrollDashboard.jsx";
import PayrollProfile from "./pages/PayrollProfile.jsx";
import LeaveDashboard from "./pages/LeaveDashboard.jsx";

// safe JSON parse helper
function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch (e) {
    // parsing failed, return null and log
    console.error(`Failed to parse ${key}`, e);
    return null;
  }
}

/**
 * PrivateRoute
 * - role may be a string (e.g. "manager") or an array of allowed roles (e.g. ["admin","manager"])
 */
function PrivateRoute({ children, role, token, user }) {
  const location = useLocation();

  // Not authenticated -> send to login
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Force password reset
  if (user.mustResetPassword && location.pathname !== "/force-reset") {
    return <Navigate to="/force-reset" replace state={{ from: location }} />;
  }

  // Role check: role can be undefined (no restriction), a string, or an array of strings
  if (role) {
    if (Array.isArray(role)) {
      if (!role.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
    } else {
      if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
    }
  }

  return children;
}

PrivateRoute.propTypes = {
  children: PropTypes.node,
  role: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  token: PropTypes.string,
  user: PropTypes.object,
};

export default function App() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  });
  const [user, setUser] = useState(() => safeParse("user"));

  const handleAuth = (t, u) => {
    setToken(t);
    setUser(u);
    try {
      localStorage.setItem("token", t || "");
      localStorage.setItem("user", JSON.stringify(u || {}));
    } catch (e) {
      console.warn("Unable to persist auth to localStorage", e);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("Failed to clear localStorage", e);
    }
  };

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "user") {
        try {
          setToken(localStorage.getItem("token") || "");
          setUser(safeParse("user"));
        } catch {
          setToken("");
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Public */}
        <Route path="/login" element={<AuthPage onAuth={handleAuth} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Force reset */}
        <Route path="/force-reset" element={<ForceResetPassword onLogout={handleLogout} />} />

        {/* Protected - Admin */}
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin" token={token} user={user}>
              <AdminDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Protected - Manager (main dashboard) */}
        <Route
          path="/manager"
          element={
            <PrivateRoute role="manager" token={token} user={user}>
              <ManagerDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Optional Manager: Leave approvals page (lazy loaded).
            If the file doesn't exist, the lazy import resolves to a component that renders null.
            We wrap in Suspense and render a fallback message when the lazy component is null. */}
        <Route
          path="/manager/leaves"
          element={
            <PrivateRoute role="manager" token={token} user={user}>
              <Suspense fallback={<div className="p-6">Loading manager leaves…</div>}>
                {/* ManagerLeaveDashboard may be `null` (if import failed). Render fallback message in that case. */}
                <React.Suspense fallback={<div className="p-6">Loading manager leaves…</div>}>
                  {/* The inner Suspense is harmless; we use ternary safely by rendering the component or a placeholder */}
                  {typeof ManagerLeaveDashboard === "function" ? (
                    <ManagerLeaveDashboard onLogout={handleLogout} />
                  ) : (
                    <div className="p-6">Manager Leave approvals currently unavailable.</div>
                  )}
                </React.Suspense>
              </Suspense>
            </PrivateRoute>
          }
        />

        {/* Protected - Employee (Timesheet) */}
        <Route
          path="/employee"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <TimesheetDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Protected - Employee (Payroll main) */}
        <Route
          path="/payroll"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <PayrollDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Payroll - Profile */}
        <Route
          path="/payroll/profile"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <PayrollProfile onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Payroll subpages (leave) */}
        <Route
          path="/payroll/leave"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <LeaveDashboard />
            </PrivateRoute>
          }
        />

        {/* Catch-all: if user/session present, redirect to their role dashboard; otherwise to landing */}
        <Route
          path="*"
          element={
            user
              ? user.mustResetPassword
                ? <Navigate to="/force-reset" replace />
                : <Navigate to={`/${user.role}`} replace />
              : <Navigate to="/" replace />
          }
        />
      </Routes>
    </Router>
  );
}
