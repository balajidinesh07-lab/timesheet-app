// src/pages/PayrollDashboard.jsx
import React, { useMemo, useState } from "react";
import {
  Bell,
  FileText,
  HelpCircle,
  Settings,
  ArrowLeft,
  DownloadCloud,
  Calendar,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png";
import { getUser as getSessionUser } from "../utils/session";

const PLACEHOLDER_AVATAR =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=60&auto=format&fit=crop";

// --- Header: animated gradient hero ---------------------------
function PayrollHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-8 shadow-lg">
      <div className="absolute inset-0 animate-gradient-xy" />
      <div className="relative px-8 py-10 md:px-12 text-white">
        <div className="max-w-5xl">
          <div className="text-sm opacity-85 mb-1">Welcome back</div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 drop-shadow-md">
            Payroll Center
          </h1>
          <p className="opacity-90 max-w-lg text-sm">
            Manage your payslips, tax forms, and leave â€” all in one secure, modern dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="bg-white/15 hover:bg-white/25 backdrop-blur-sm text-sm px-4 py-2 rounded-lg border border-white/30 transition">
              Employee InfoStore
            </button>
            <button className="bg-white/15 hover:bg-white/25 backdrop-blur-sm text-sm px-4 py-2 rounded-lg border border-white/30 transition">
              Form 11
            </button>
          </div>
        </div>
      </div>

      {/* soft white accent wave */}
      <svg
        className="absolute bottom-0 right-0 w-64 h-64 opacity-25 pointer-events-none"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,100 C50,0 150,0 200,100 L200,200 L0,200 Z"
          fill="white"
          fillOpacity="0.2"
        />
      </svg>
    </div>
  );
}

// --- Reusable Payslip Row -------------------------------------
function PayslipRow({ p, onOpen }) {
  return (
    <div
      onClick={() => onOpen(p.id)}
      className="group bg-white rounded-xl p-4 flex items-center justify-between border border-slate-100 hover:shadow-md transition cursor-pointer"
    >
      <div>
        <div className="font-medium text-slate-800">{p.month}</div>
        <div className="text-xs text-slate-500">Gross: {p.gross}</div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`px-3 py-1 text-xs rounded-full ${
            p.status === "Ready"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {p.status}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen(p.id, { download: true });
          }}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 px-3 py-1 rounded-lg transition"
        >
          <DownloadCloud size={14} />
          <span className="text-xs font-medium">Download</span>
        </button>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT --------------------------------------------
export default function PayrollDashboard() {
  const navigate = useNavigate();

  const payslips = useMemo(
    () => [
      { id: "p-2025-09", month: "Sep 2025", gross: "â‚¹82,500", status: "Ready" },
      { id: "p-2025-08", month: "Aug 2025", gross: "â‚¹79,200", status: "Ready" },
      { id: "p-2025-07", month: "Jul 2025", gross: "â‚¹81,100", status: "Ready" },
    ],
    []
  );

  const quickLinks = [
    { key: "payslip", title: "Payslip", icon: <FileText size={16} /> },
    { key: "tax", title: "Tax Regime", icon: <Settings size={16} /> },
    { key: "helpdesk", title: "Helpdesk", icon: <HelpCircle size={16} /> },
    { key: "form16", title: "Form 16", icon: <FileText size={16} /> },
    { key: "leave", title: "Leave System", icon: <Calendar size={16} /> },
  ];

  const sessionUser = getSessionUser() || {};
  const profile = {
    name: sessionUser.name || localStorage.getItem("name") || "Employee",
    email: sessionUser.email || localStorage.getItem("email") || "employee@company.com",
    photo: localStorage.getItem("profilePhoto") || PLACEHOLDER_AVATAR,
  };

  const openPayslip = (id, opts = {}) => {
    if (opts.download) {
      const blob = new Blob([`Payslip ${id}`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    navigate(`/payroll/payslip/${id}`);
  };

  return (
    <div
      className="min-h-screen bg-animated-sky"
      style={{
        background:
          "linear-gradient(180deg, #f9fafb 0%, #f1f5f9 40%, #f8fafc 100%)",
      }}
    >
      {/* HEADER BAR */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Company Logo"
            className="h-12 md:h-14 object-contain drop-shadow-sm"
          />
          <div>
            <div className="text-xs text-slate-500">Company Portal</div>
            <div className="font-semibold text-slate-800 text-lg">
              Payroll Dashboard
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/employee")}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 hover:shadow-md transition"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Timesheet</span>
          </button>

          <button
            onClick={() => alert("Notifications demo")}
            className="relative p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 transition"
          >
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          <button
            onClick={() => navigate("/payroll/profile")}
            className="flex items-center gap-3"
            title="View profile"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500">Signed in as</div>
              <div className="font-semibold">{profile.name}</div>
            </div>
            <div className="relative">
              <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                <img
                  src={profile.photo}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white animate-pulse" />
            </div>
          </button>
        </div>
      </header>

      {/* HERO */}
      <PayrollHeader />

      <main className="max-w-7xl mx-auto">
        {/* Top summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              icon={<FileText size={18} />}
              color="indigo"
              title="Payslip"
              value="Sep 2025"
              subtitle="Latest generated"
            />
            <SummaryCard
              icon={<Settings size={18} />}
              color="amber"
              title="Tax regime"
              value="Old Regime"
              subtitle="FY 2025â€“26"
            />
            <SummaryCard
              icon={<HelpCircle size={18} />}
              color="violet"
              title="Helpdesk"
              value="1 Open"
              subtitle="Support Tickets"
            />
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border p-6 flex flex-col gap-4 shadow">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-500">Payroll Summary</div>
              <div className="text-xs text-slate-400">Updated just now</div>
            </div>

            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-slate-400">CTC</div>
                <div className="text-lg font-semibold text-slate-800">
                  â‚¹10,00,000
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Gross (YTD)</div>
                <div className="text-lg font-semibold text-slate-800">
                  â‚¹6,24,100
                </div>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => navigate("/payroll/payslip")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition"
                >
                  All Payslips
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payslip + Quicklinks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white rounded-3xl p-6 shadow border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Recent Payslips
                </h2>
                <p className="text-xs text-slate-500">Download or view details</p>
              </div>
              <div className="text-xs text-slate-400">3 records</div>
            </div>
            <div className="space-y-3">
              {payslips.map((p) => (
                <PayslipRow key={p.id} p={p} onOpen={openPayslip} />
              ))}
            </div>
          </section>

          <aside className="bg-white rounded-3xl p-6 shadow border border-slate-100 flex flex-col gap-6">
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">
                Quick Links
              </div>
              <div className="grid grid-cols-2 gap-3">
                {quickLinks.map((k) => (
                  <button
                    key={k.key}
                    onClick={() => {
                      if (k.key === "payslip") navigate("/payroll/payslip");
                      else if (k.key === "tax") navigate("/payroll/tax");
                      else if (k.key === "helpdesk") navigate("/payroll/helpdesk");
                      else if (k.key === "form16") navigate("/payroll/form16");
                      else if (k.key === "leave") navigate("/payroll/leave");
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 flex items-center gap-3 transition"
                  >
                    <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center text-indigo-600">
                      {k.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-slate-800">
                        {k.title}
                      </div>
                      <div className="text-xs text-slate-400">Open</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm text-slate-500 mb-2">Forms</div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate("/payroll/form16")}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-left transition"
                >
                  Form 16
                </button>
                <button
                  onClick={() => navigate("/payroll/form11")}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-left transition"
                >
                  Form 11
                </button>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-400">
          Payroll system â€¢ Confidential â€¢ Internal use only
        </footer>
      </main>

      <style>{`
        /* animated gradient for header */
        @keyframes gradientXY {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-xy {
          background-image: linear-gradient(100deg, #06b6d4, #3b82f6, #8b5cf6);
          background-size: 200% 200%;
          animation: gradientXY 9s ease infinite;
        }
      `}</style>
    </div>
  );
}

// --- Small helper for summary cards ------------------------------
function SummaryCard({ icon, color, title, value, subtitle }) {
  const colorMap = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    violet: { bg: "bg-violet-50", text: "text-violet-600" },
  };
  const col = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 transition">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${col.bg} ${col.text}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-slate-500">{title}</div>
          <div className="font-semibold text-slate-800">{value}</div>
          <div className="text-xs text-slate-400">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

