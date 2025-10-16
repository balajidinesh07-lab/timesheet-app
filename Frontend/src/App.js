// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import AuthPage from "./pages/AuthPage.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import TimesheetDashboard from "./pages/TimesheetDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import ForceResetPassword from "./pages/ForceResetPassword.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import LandingPage from "./pages/LandingPage.jsx";

import PayrollDashboard from "./pages/PayrollDashboard.jsx"; // payroll main page
import PayrollProfile from "./pages/PayrollProfile.jsx";     // payroll profile page (new)
import LeaveDashboard from "./pages/LeaveDashboard.jsx";     // payroll -> leave subpage
// (Optional) if you create these later you can import them:
// import PayslipPage from "./pages/PayslipPage.jsx";
// import Form16Page from "./pages/Form16Page.jsx";

// safe JSON parse helper
function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${key}`, e);
    return null;
  }
}

function PrivateRoute({ children, role, token, user }) {
  const location = useLocation();

  // Not authenticated -> send to login
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;

  // Force password reset
  if (user.mustResetPassword && location.pathname !== "/force-reset") {
    return <Navigate to="/force-reset" replace state={{ from: location }} />;
  }

  // Role mismatch -> redirect to user's role dashboard
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

        {/* Protected - Manager */}
        <Route
          path="/manager"
          element={
            <PrivateRoute role="manager" token={token} user={user}>
              <ManagerDashboard onLogout={handleLogout} />
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

        {/* Payroll subpages (leave, payslip, forms etc.) */}
        <Route
          path="/payroll/leave"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <LeaveDashboard />
            </PrivateRoute>
          }
        />

        {/* Example additional payroll subroutes you may add later */}
        {/* <Route
          path="/payroll/payslip"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <PayslipPage />
            </PrivateRoute>
          }
        /> */}
        {/* <Route
          path="/payroll/form16"
          element={
            <PrivateRoute role="employee" token={token} user={user}>
              <Form16Page />
            </PrivateRoute>
          }
        /> */}

        {/* Catch-all: if user/session present redirect to role dashboard otherwise to landing */}
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
