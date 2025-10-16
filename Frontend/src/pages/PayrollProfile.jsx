// src/pages/PayrollProfile.jsx
import React, { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png";

const DEFAULT = {
  name: "Employee Name",
  email: "employee@example.com",
  phone: "",
  designation: "Software Engineer",
  doj: new Date().toISOString().slice(0, 10),
  ctc: 1000000, // yearly CTC
  earnedYTD: 624100,
  leavesTaken: 5,
  totalLeaves: 24,
  photo: "", // base64 data URL or external URL
};

function formatCurrency(v) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `₹${v}`;
  }
}

function AnimatedDonut({ percent = 0, size = 140, thickness = 16 }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const strokeOffset = circumference - dash;

  return (
    <div className="relative w-[140px] h-[140px]">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="grad-salary" x1="0" x2="1">
            <stop offset="0" stopColor="#06b6d4" />
            <stop offset="0.5" stopColor="#6366f1" />
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
          <text x="0" y="-8" textAnchor="middle" fontSize="13" fill="#0f172a" className="font-semibold">
            {Math.round(percent)}%
          </text>
          <text x="0" y="14" textAnchor="middle" fontSize="11" fill="#475569">
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

  // READ-ONLY: no editing for employees
  const editing = false;

  // load from localStorage if present
  useEffect(() => {
    try {
      const raw = localStorage.getItem("payrollProfile");
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile((p) => ({ ...p, ...parsed }));
        setDraft((d) => ({ ...d, ...parsed }));
      } else {
        const name = localStorage.getItem("name");
        const email = localStorage.getItem("email");
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

  // FIXED: ensure uploaded avatar appears immediately and is persisted
  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // persist both draft and profile so header components (other pages) pick it up
      const next = { ...profile, ...draft, photo: dataUrl };
      setDraft(next);
      setProfile(next);
      try {
        // persist base64 to localStorage for cross-page visibility
        localStorage.setItem("profilePhoto", dataUrl);
        // also keep payrollProfile in sync (readonly details still stored)
        localStorage.setItem("payrollProfile", JSON.stringify(next));
      } catch (err) {
        console.warn("Failed to persist avatar", err);
      }
    };
    reader.readAsDataURL(f);
  }

  // sample monthly values for animated bars:
  const sampleMonthly = useMemo(() => {
    const base = [82000, 79000, 81000, 83000, 80000, Math.round((draft.earnedYTD || profile.earnedYTD) / 6)];
    return base;
  }, [draft, profile]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Hero */}
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 animate-hero bg-[length:200%_200%]" />
          <div className="relative p-8 md:p-10 text-white flex items-center gap-6">
            <img src={logo} alt="logo" className="h-14 w-auto object-contain filter drop-shadow-lg" />
            <div className="flex-1">
              <div className="text-sm opacity-90">Employee Center</div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md">Payroll Profile</h2>
              <p className="mt-2 max-w-2xl text-slate-100/90">
                Read-only employee profile. Contact HR to change personal or payroll details. You may upload a profile photo which becomes visible across the app.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/payroll")} className="bg-white/12 hover:bg-white/20 px-3 py-2 rounded-lg text-white transition">Back to Payroll</button>
            </div>
          </div>

          {/* shape */}
          <svg className="absolute right-6 bottom-0 w-44 h-44 opacity-20 pointer-events-none" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="hgrad" x1="0" x2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <path d="M0,100 C50,0 150,0 200,100 L200,200 L0,200 Z" fill="url(#hgrad)"></path>
          </svg>
        </div>

        {/* profile card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-xl transform transition hover:-translate-y-1">
            <div className="flex gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white shadow-lg bg-gradient-to-br from-slate-100 to-slate-200">
                  {draft.photo ? (
                    // show uploaded photo (base64 or URL)
                    <img src={draft.photo} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-700">
                      {String(draft.name || "E").split(" ").map(x => x[0]).slice(0,2).join("")}
                    </div>
                  )}
                </div>

                {/* Upload allowed even though profile is read-only — photo is a self-service property */}
                <label title="Upload avatar (this only updates your photo)" className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md cursor-pointer hover:scale-105 transition">
                  <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                  <Camera size={16} className="text-slate-700" />
                </label>
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Name</div>
                    <div className="text-2xl font-bold">{draft.name}</div>
                    <div className="text-sm text-slate-500 mt-1">{draft.designation} • Joined {new Date(draft.doj).toLocaleDateString()}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Profile status</div>
                    <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">Active</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-slate-400">CTC</div>
                    <div className="font-semibold">{formatCurrency(draft.ctc)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-slate-400">Gross (YTD)</div>
                    <div className="font-semibold">{formatCurrency(draft.earnedYTD)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <div className="text-xs text-slate-400">Leaves</div>
                    <div className="font-semibold">{draft.leavesTaken}/{draft.totalLeaves}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* read-only fields (disabled inputs for layout consistency) */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500">Full name</label>
                <input value={draft.name} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Email</label>
                <input value={draft.email} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Phone</label>
                <input value={draft.phone} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Date of Joining</label>
                <input type="date" value={draft.doj} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Designation</label>
                <input value={draft.designation} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Annual CTC (₹)</label>
                <input type="number" value={draft.ctc} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Earned Year-to-date (₹)</label>
                <input type="number" value={draft.earnedYTD} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Leaves taken</label>
                  <input type="number" value={draft.leavesTaken} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500">Total leaves</label>
                  <input type="number" value={draft.totalLeaves} disabled className="w-full mt-1 p-3 rounded-lg border-slate-100 bg-white/60" />
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              This profile is read-only for employees. To change personal or payroll details (other than photo), please contact HR or your manager.
            </div>
          </div>

          {/* analytics side */}
          <aside className="bg-white rounded-2xl p-6 shadow-lg flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Analytics</div>
                <div className="font-semibold">Quick overview</div>
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
              <div className="flex items-end gap-2 h-36">
                {sampleMonthly.map((val, i) => {
                  const max = Math.max(...sampleMonthly);
                  const h = Math.round((val / max) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 w-full">
                      <div className="w-full flex items-end">
                        <div
                          className="w-full rounded-t-md transition-all"
                          style={{ height: `${h}%`, background: `linear-gradient(180deg,#6366f1,#06b6d4)` }}
                          title={`${val}`}
                        />
                      </div>
                      <div className="text-xs text-slate-400">{["Apr","May","Jun","Jul","Aug","Sep"][i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">Payroll profile • Confidential • For internal use only</div>
      </div>

      <style>{`
        /* subtle hero animation */
        @keyframes heroMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-hero { background-size: 200% 200%; animation: heroMove 9s ease infinite; }

        input[disabled] { background-color: rgba(255,255,255,0.7); }

        /* responsive */
        @media (max-width: 900px) {
          .w-[140px] { width: 120px; height: 120px; }
        }
      `}</style>
    </div>
  );
}
