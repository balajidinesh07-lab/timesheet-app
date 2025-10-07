// frontend/src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import AuthPage from "./pages/AuthPage.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import TimesheetDashboard from "./pages/TimesheetDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ForceResetPassword from "./pages/ForceResetPassword.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

// --- Safe parser for localStorage values ---
function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Failed to parse ${key} from localStorage`, e);
    return null;
  }
}

function PrivateRoute({ children, role, token, user }) {
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 🔒 Force reset gate (allow the force-reset page itself)
  if (user.mustResetPassword && location.pathname !== "/force-reset") {
    return <Navigate to="/force-reset" replace state={{ from: location }} />;
  }

  // If a role is required and doesn't match, send them to *their* dashboard
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => safeParse("user"));

  const handleAuth = (t, u) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("token", t || "");
    localStorage.setItem("user", JSON.stringify(u || {}));
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.clear();
  };

  // Keep sessions in sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "user") {
        setToken(localStorage.getItem("token") || "");
        setUser(safeParse("user"));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<AuthPage onAuth={handleAuth} />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Force reset password */}
        <Route
          path="/force-reset"
          element={<ForceResetPassword onLogout={handleLogout} />}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin" token={token} user={user}>
              <AdminDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Manager */}
        <Route
          path="/manager"
          element={
            <PrivateRoute role="manager" token={token} user={user}>
              <ManagerDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Employee */}
        <Route
          path="/employee"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <TimesheetDashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            user ? (
              user.mustResetPassword ? (
                <Navigate to="/force-reset" replace />
              ) : (
                <Navigate to={`/${user.role}`} replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all → send to correct place */}
        <Route
          path="*"
          element={
            user ? (
              user.mustResetPassword ? (
                <Navigate to="/force-reset" replace />
              ) : (
                <Navigate to={`/${user.role}`} replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}
