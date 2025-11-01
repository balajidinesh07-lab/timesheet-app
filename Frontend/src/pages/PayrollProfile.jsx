// src/pages/PayrollProfile.jsx
import React, { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png";
import { getUser as getSessionUser } from "../utils/session";

/**
 * Upgraded PayrollProfile.jsx
 * - Taller, more luxurious hero with richer gradient and decorative shapes
 * - More prominent action button (Back to Payroll)
 * - Stronger frosted profile card and improved spacing
 * - All previous functionality preserved (photo upload persisted to localStorage)
 *
 * Drop-in replacement for your existing file.
 */

const DEFAULT = {
  name: "Employee Name",
  email: "employee@example.com",
  phone: "",
  designation: "Software Engineer",
  doj: new Date().toISOString().slice(0, 10),
  ctc: 1000000,
  earnedYTD: 624100,
  leavesTaken: 5,
  totalLeaves: 24,
  photo: "",
};

function formatCurrency(v) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `â‚¹${v}`;
  }
}

/* Animated donut (salary earned percent) */
function AnimatedDonut({ percent = 0, size = 160, thickness = 16 }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const strokeOffset = circumference - dash;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="grad-salary" x1="0" x2="1">
            <stop offset="0" stopColor="#06b6d4" />
            <stop offset="0.55" stopColor="#6366f1" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feBlend in="SourceGraphic" in2="b" mode="screen" />
          </filter>
        </defs>

        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle r={radius} fill="none" stroke="#eef2ff" strokeWidth={thickness} />
          <circle
            r={radius}
            fill="none"
            stroke="url(#grad-salary)"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              strokeDashoffset: strokeOffset,
              transition: "stroke-dashoffset 900ms cubic-bezier(.2,.9,.3,1)",
              filter: "url(#softBlur)",
            }}
          />
          <text x="0" y="-6" textAnchor="middle" fontSize="16" fill="#0f172a" className="font-semibold">
            {Math.round(percent)}%
          </text>
          <text x="0" y="20" textAnchor="middle" fontSize="11" fill="#475569">
            Year earned
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function PayrollProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(DEFAULT);
  const [draft, setDraft] = useState(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("payrollProfile");
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile((p) => ({ ...p, ...parsed }));
        setDraft((d) => ({ ...d, ...parsed }));
      } else {
        const sessionUser = getSessionUser() || {};
        const name = sessionUser.name || localStorage.getItem("name");
        const email = sessionUser.email || localStorage.getItem("email");
        const photo = localStorage.getItem("profilePhoto");
        setProfile((p) => ({ ...p, name: name || p.name, email: email || p.email, photo: photo || p.photo }));
        setDraft((d) => ({ ...d, name: name || d.name, email: email || d.email, photo: photo || d.photo }));
      }
    } catch (err) {
      console.warn("Failed to load local profile", err);
    }
  }, []);

  const earnedPercent = useMemo(() => {
    const p = (Number(draft.earnedYTD || profile.earnedYTD) / Math.max(1, Number(draft.ctc || profile.ctc))) * 100;
    return Math.min(100, Math.max(0, p));
  }, [draft, profile]);

  const leavePercent = useMemo(() => {
    const taken = Number(draft.leavesTaken || profile.leavesTaken);
    const total = Math.max(1, Number(draft.totalLeaves || profile.totalLeaves));
    return Math.min(100, Math.max(0, (taken / total) * 100));
  }, [draft, profile]);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const next = { ...profile, ...draft, photo: dataUrl };
      setDraft(next);
      setProfile(next);
      try {
        localStorage.setItem("profilePhoto", dataUrl);
        localStorage.setItem("payrollProfile", JSON.stringify(next));
      } catch (err) {
        console.warn("Failed to persist avatar", err);
      }
    };
    reader.readAsDataURL(f);
  }

  const sampleMonthly = useMemo(() => {
    const base = [82000, 79000, 81000, 83000, 80000, Math.round((draft.earnedYTD || profile.earnedYTD) / 6)];
    return base;
  }, [draft, profile]);

  return (
    <div
      className="min-h-screen bg-animated-sky"
      style={{
        background:
          "radial-gradient(circle at 8% 12%, rgba(99,102,241,0.04) 0%, transparent 28%), " +
          "radial-gradient(circle at 92% 84%, rgba(16,185,129,0.03) 0%, transparent 30%), " +
          "linear-gradient(180deg,#ffffff 0%, #fbffff 40%, #f7fffb 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Taller Hero â€” increased height and richer gradients */}
        <div className="relative overflow-hidden rounded-2xl mb-8" style={{ minHeight: 180 }}>
          <div
            className="absolute inset-0 animate-hero"
            style={{
              background:
                "linear-gradient(90deg, rgba(34,197,94,0.9) 0%, rgba(14,165,233,0.92) 38%, rgba(99,102,241,0.95) 75%)",
              mixBlendMode: "normal",
              opacity: 0.98,
            }}
          />
          <div
            className="relative p-8 md:p-12 text-white flex flex-col md:flex-row items-center gap-6"
            style={{ minHeight: 180 }}
          >
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-4">
                <img src={logo} alt="logo" className="h-14 w-auto object-contain drop-shadow-lg" />
                <div>
                  <div className="text-sm text-white/90">Employee Center</div>
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md">Payroll Profile</h2>
                </div>
              </div>
            </div>

            <div className="flex-1 md:pl-6">
              <p className="text-sm text-white/90 max-w-3xl">
                Read-only employee profile â€” update your photo here. For changes to personal or payroll information contact HR.
                The hero is taller and richer to match the corporate-modern visual language.
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={() => navigate("/payroll")}
                className="px-4 md:px-5 py-3 rounded-lg bg-white text-indigo-700 font-semibold shadow-lg hover:scale-[1.01] transition transform"
                style={{
                  boxShadow: "0 10px 30px rgba(18,38,86,0.16)",
                }}
                title="Back to payroll"
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <ArrowLeft size={16} /> Back to Payroll
                </span>
              </button>
            </div>
          </div>

          {/* Larger subtle decorative shape bottom-right */}
          <svg className="absolute right-8 bottom-0 w-56 h-56 opacity-18 pointer-events-none" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="hgradBig" x1="0" x2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.14" />
              </linearGradient>
            </defs>
            <path d="M0,100 C50,0 150,0 200,100 L200,200 L0,200 Z" fill="url(#hgradBig)"></path>
          </svg>
        </div>

        {/* Profile area (cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div
              className="relative bg-white/80 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl border border-white/30 transform transition hover:-translate-y-1 overflow-hidden"
              style={{ minHeight: 320 }}
            >
              <div className="flex gap-6 items-start">
                <div className="relative">
                  <div
                    className="w-36 h-36 rounded-full overflow-hidden ring-6 ring-white shadow-2xl bg-gradient-to-br from-slate-100 to-slate-200"
                    style={{ border: "6px solid rgba(255,255,255,0.6)" }}
                  >
                    {draft.photo ? (
                      <img src={draft.photo} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-700">
                        {String(draft.name || "E")
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    )}
                  </div>

                  <label
                    title="Upload avatar"
                    className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:scale-105 transition"
                    style={{ border: "1px solid rgba(15,23,42,0.04)" }}
                  >
                    <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                    <Camera size={18} className="text-slate-700" />
                  </label>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500">Name</div>
                      <div className="text-2xl md:text-3xl font-extrabold text-slate-900">{draft.name}</div>
                      <div className="text-sm text-slate-500 mt-1">{draft.designation} â€¢ Joined {new Date(draft.doj).toLocaleDateString()}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Profile status</div>
                      <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                        Active
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 border shadow-sm">
                      <div className="text-xs text-slate-400">CTC</div>
                      <div className="font-semibold text-slate-900">{formatCurrency(draft.ctc)}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border shadow-sm">
                      <div className="text-xs text-slate-400">Gross (YTD)</div>
                      <div className="font-semibold text-slate-900">{formatCurrency(draft.earnedYTD)}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border shadow-sm">
                      <div className="text-xs text-slate-400">Leaves</div>
                      <div className="font-semibold text-slate-900">{draft.leavesTaken}/{draft.totalLeaves}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Read-only fields laid out below */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Full name</label>
                  <input value={draft.name} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Email</label>
                  <input value={draft.email} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>

                <div>
                  <label className="text-xs text-slate-500">Phone</label>
                  <input value={draft.phone} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date of Joining</label>
                  <input type="date" value={draft.doj} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>

                <div>
                  <label className="text-xs text-slate-500">Designation</label>
                  <input value={draft.designation} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Annual CTC (â‚¹)</label>
                  <input type="number" value={draft.ctc} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>

                <div>
                  <label className="text-xs text-slate-500">Earned Year-to-date (â‚¹)</label>
                  <input type="number" value={draft.earnedYTD} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Leaves taken</label>
                    <input type="number" value={draft.leavesTaken} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">Total leaves</label>
                    <input type="number" value={draft.totalLeaves} disabled className="w-full mt-1 p-3 rounded-lg border border-slate-100 bg-white/60" />
                  </div>
                </div>
              </div>

              <div className="mt-6 text-sm text-slate-500">
                This profile is read-only for employees. To change personal or payroll details (other than photo), please contact HR or your manager.
              </div>
            </div>
          </div>

          
          <aside className="bg-white rounded-2xl p-6 shadow-lg flex flex-col gap-6 border border-slate-100" style={{ minHeight: 320 }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Analytics</div>
                <div className="font-semibold text-slate-900">Quick overview</div>
              </div>
              <div className="text-xs text-slate-400">Updated just now</div>
            </div>

            <div className="flex items-center justify-center">
              <AnimatedDonut percent={earnedPercent} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Leaves usage</div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div style={{ width: `${leavePercent}%` }} className="h-3 bg-gradient-to-r from-rose-400 to-pink-600 transition-all" />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <div>{draft.leavesTaken} taken</div>
                <div>{draft.totalLeaves - draft.leavesTaken} remaining</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Recent salary (sample)</div>
              <div className="flex items-end gap-2 h-40">
                {sampleMonthly.map((val, i) => {
                  const max = Math.max(...sampleMonthly);
                  const h = Math.round((val / max) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 w-full">
                      <div className="w-full flex items-end">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{ height: `${h}%`, background: `linear-gradient(180deg,#6366f1,#06b6d4)` }}
                          title={`${formatCurrency(val)}`}
                        />
                      </div>
                      <div className="text-xs text-slate-400">{["Apr", "May", "Jun", "Jul", "Aug", "Sep"][i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">Payroll profile â€¢ Confidential â€¢ For internal use only</div>
      </div>

      <style>{`
        /* hero animation */
        @keyframes heroMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-hero { background-size: 200% 200%; animation: heroMove 10s ease infinite; }

        .rounded-2xl { border-radius: 14px; }
        .shadow-lg { box-shadow: 0 12px 28px rgba(15,23,42,0.08); }
        .shadow-2xl { box-shadow: 0 28px 80px rgba(15,23,42,0.12); }

        input[disabled] { background-color: rgba(255,255,255,0.78); }

        @media (max-width: 900px) {
          .w-36 { width: 110px; height: 110px; }
          .h-40 { height: 200px; }
        }
      `}</style>
    </div>
  );
}

