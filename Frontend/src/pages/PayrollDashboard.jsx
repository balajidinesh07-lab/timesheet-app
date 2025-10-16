// src/pages/PayrollDashboard.jsx
import React, { useMemo, useState } from "react";
import {
  Bell,
  FileText,
  HelpCircle,
  Settings,
  ArrowLeft,
  DownloadCloud,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png"; // adjust path if needed

const PLACEHOLDER_AVATAR =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=60&auto=format&fit=crop";

function AnimatedGradientHeader({ title = "My Payroll", subtitle = "All rewards, payslips and tax tools in one place" }) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6">
      <div className="absolute inset-0 animate-gradient-xy opacity-95 rounded-2xl" />
      <div className="relative p-6 md:p-10 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm opacity-90">Welcome back</div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg">{title}</h1>
            <div className="mt-2 text-sm opacity-85 max-w-xl">{subtitle}</div>
            <div className="mt-4 flex gap-3">
              <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition">Employee Infostore</button>
              <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition">Form 11</button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm text-sm">Quick actions</div>
            <div className="w-[120px] h-[80px] rounded-lg bg-white/10 flex flex-col items-center justify-center text-xs">
              <div className="font-semibold">CTC</div>
              <div className="text-sm">₹10,00,000</div>
            </div>
          </div>
        </div>
      </div>

      {/* decorative svg */}
      <svg className="absolute right-0 bottom-0 w-72 h-72 opacity-20 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pg1" x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path d="M0,100 C50,0 150,0 200,100 L200,200 L0,200 Z" fill="url(#pg1)"></path>
      </svg>
    </div>
  );
}

function PayslipRow({ p, onOpen }) {
  return (
    <div
      onClick={() => onOpen(p.id)}
      className="flex items-center justify-between p-3 rounded-lg border hover:shadow-lg transition cursor-pointer bg-white"
    >
      <div>
        <div className="font-medium">{p.month}</div>
        <div className="text-xs text-slate-500">Gross: {p.gross}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`px-3 py-1 rounded-full text-xs ${p.status === "Ready" ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-600"}`}>
          {p.status}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onOpen(p.id, { download: true }); }}
          className="flex items-center gap-2 px-3 py-1 text-slate-600 rounded hover:bg-slate-50 transition"
        >
          <DownloadCloud size={14} /> Download
        </button>
      </div>
    </div>
  );
}

export default function PayrollDashboard() {
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const payslips = useMemo(() => [
    { id: "p-2025-09", month: "Sep 2025", gross: "₹82,500", status: "Ready" },
    { id: "p-2025-08", month: "Aug 2025", gross: "₹79,200", status: "Ready" },
    { id: "p-2025-07", month: "Jul 2025", gross: "₹81,100", status: "Ready" },
  ], []);

  const quickLinks = [
    { key: "payslip", title: "Payslip", icon: <FileText size={16}/> },
    { key: "tax", title: "Tax regime", icon: <Settings size={16}/> },
    { key: "helpdesk", title: "Helpdesk Queries", icon: <HelpCircle size={16}/> },
    { key: "form16", title: "Form 16", icon: <FileText size={16}/> },
    { key: "leave", title: "Apply Leave", icon: <Calendar size={16}/> },
  ];

  const profile = {
    name: localStorage.getItem("name") || "Employee",
    email: localStorage.getItem("email") || "employee@company.com",
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
    <div className="min-h-screen p-6 bg-slate-50">
      {/* HEADER */}
      <header className="flex items-center gap-4 mb-6">
        {/* LOGO: left corner (bigger) */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="logo" className="h-16 md:h-20 object-contain" />
        </div>

        {/* spacer */}
        <div className="flex-1" />

        {/* RIGHT controls: Back to Timesheet, Notifications, Avatar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/employee")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow hover:shadow-md transition transform hover:-translate-y-0.5"
            aria-label="Back to timesheet"
            title="Back to Timesheet"
          >
            <ArrowLeft size={16} /> Back to Timesheet
          </button>

          <button
            className="relative p-2 rounded-lg hover:bg-white/10 transition"
            title="Notifications"
            onClick={() => alert("Notifications (demo)")}
          >
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Avatar: clicking opens profile page */}
          <button
            onClick={() => navigate("/payroll/profile")}
            className="flex items-center gap-3 cursor-pointer"
            title="Open profile"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500">Signed in as</div>
              <div className="font-semibold">{profile.name}</div>
            </div>

            <div className="relative group">
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white shadow-md transform transition group-hover:scale-105">
                <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white animate-pulse" />
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        <AnimatedGradientHeader title="My Payroll" subtitle="Payslips, tax, reimbursements — everything in one modern dashboard" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow hover:-translate-y-1 transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Payslip</div>
                  <div className="font-semibold">Sep 2025</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow hover:-translate-y-1 transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Settings size={18} />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Tax regime</div>
                  <div className="font-semibold">Old regime submitted</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow hover:-translate-y-1 transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <div className="text-sm text-slate-500">Helpdesk Queries</div>
                  <div className="font-semibold">1 open</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Payroll Summary</div>
              <div className="text-xs text-slate-400">Updated now</div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-400">CTC</div>
                <div className="font-semibold text-lg">₹10,00,000</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Gross (YTD)</div>
                <div className="font-semibold text-lg">₹6,24,100</div>
              </div>
              <div className="ml-auto">
                <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:opacity-90" onClick={() => navigate("/payroll/payslip")}>All Payslips</button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-slate-500">Recent payslips</div>
                <h2 className="font-semibold text-lg">Payslips</h2>
              </div>
              <div className="text-sm text-slate-400">Download / View</div>
            </div>

            <div className="space-y-3">
              {payslips.map((p) => (
                <PayslipRow key={p.id} p={p} onOpen={openPayslip} />
              ))}
            </div>
          </div>

          <aside className="bg-white rounded-2xl p-6 shadow space-y-4">
            <div>
              <div className="text-sm text-slate-500">Quick links</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {quickLinks.map(k => (
                  <button
                    key={k.key}
                    onClick={() => {
                      if (k.key === "payslip") navigate("/payroll/payslip");
                      else if (k.key === "tax") navigate("/payroll/tax");
                      else if (k.key === "helpdesk") navigate("/payroll/helpdesk");
                      else if (k.key === "form16") navigate("/payroll/form16");
                      else if (k.key === "leave") navigate("/payroll/leave"); // navigate to leave subpage
                    }}
                    className="p-3 bg-slate-50 rounded-lg text-left hover:bg-slate-100 transition flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded bg-white flex items-center justify-center text-indigo-600">{k.icon}</div>
                    <div>
                      <div className="text-sm font-medium">{k.title}</div>
                      <div className="text-xs text-slate-400">Open</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-slate-500 mb-2">Forms</div>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate("/payroll/form16")} className="p-3 bg-slate-50 rounded-lg text-left hover:bg-slate-100">Form 16</button>
                <button onClick={() => navigate("/payroll/form11")} className="p-3 bg-slate-50 rounded-lg text-left hover:bg-slate-100">Form 11</button>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">Payroll system • Confidential • For internal use only</div>
      </main>

      <style>{`
        /* animated gradient background for header */
        @keyframes gradientXY {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-xy {
          background-image: linear-gradient(90deg, #06b6d4 0%, #3b82f6 35%, #8b5cf6 100%);
          background-size: 200% 200%;
          animation: gradientXY 9s ease infinite;
        }

        /* utility color fallbacks (in case Tailwind config lacks these) */
        .bg-indigo-50 { background-color: rgba(79,70,229,0.06); }
        .text-indigo-600 { color: #4f46e5; }
        .bg-amber-50 { background-color: rgba(245,158,11,0.06); }
        .text-amber-600 { color: #d97706; }
        .bg-violet-50 { background-color: rgba(139,92,246,0.06); }
        .text-violet-600 { color: #7c3aed; }

        /* small polish */
        header img { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.06)); }
      `}</style>
    </div>
  );
}
