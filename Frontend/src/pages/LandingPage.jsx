import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png"; // keep your existing asset

function FeatureBadge({ icon, iconClasses, title, desc }) {
  return (
    <div className="flex gap-3 items-start">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold tracking-wide shadow-sm ${iconClasses}`}>
        <span className="leading-none">{icon}</span>
      </div>
      <div>
        <div className="font-semibold text-gray-800">{title}</div>
        <div className="text-xs text-gray-600 leading-snug">{desc}</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const demoTiles = [
    {
      title: "Download Payslip",
      description: "Grab your latest salary slip as a PDF in a click.",
      tag: "Finance",
      glyph: "PS",
      accent: "bg-blue-100 text-blue-600",
      cta: "Download sample",
      to: "/payroll/profile",
    },
    {
      title: "Update Timesheet",
      description: "Log project hours for the week with autosave drafts.",
      tag: "Timesheets",
      glyph: "TS",
      accent: "bg-emerald-100 text-emerald-600",
      cta: "Open editor",
      to: "/employee",
    },
    {
      title: "Project Pulse",
      description: "See project health and staffing in one snapshot.",
      tag: "Manager view",
      glyph: "PP",
      accent: "bg-purple-100 text-purple-600",
      cta: "See dashboard",
      to: "/manager",
    },
    {
      title: "Leave Approvals",
      description: "Review, approve, or decline requests with context.",
      tag: "People ops",
      glyph: "LA",
      accent: "bg-amber-100 text-amber-600",
      cta: "Review queue",
      to: "/manager/leaves",
    },
  ];

  return (
    <div className="min-h-screen bg-animated-sky">
      <div className="relative isolate overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center">
          <img
            src={logo}
            alt="Yvidhya"
            className="h-14 sm:h-16 w-auto transform transition-transform duration-300 hover:scale-105"
          />
        </div>

        <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <section className="space-y-6 max-w-xl mx-auto lg:mx-0">
            <h1 className="text-[2.5rem] sm:text-[2.9rem] lg:text-[3.2rem] font-extrabold leading-tight text-gray-900">
              Timesheet Management <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-400">for modern teams</span>
            </h1>

            <p className="max-w-xl text-base sm:text-lg text-gray-600 leading-relaxed">
              Track weekly work, submit for review, and get approvals — with secure role-based workflows.
              Fast UX, autosave drafts, and email reset links make life easier for Employees, Managers, and Admins.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mt-2 text-sm">
              <FeatureBadge
                icon="AUTH"
                iconClasses="bg-blue-50 text-blue-700"
                title="Secure Auth"
                desc="JWT + bcrypt with role-based access"
              />
              <FeatureBadge
                icon="SPEED"
                iconClasses="bg-yellow-50 text-yellow-700"
                title="Fast UX"
                desc="Autosave drafts and streamlined submit/review flow"
              />
              <FeatureBadge
                icon="MAIL"
                iconClasses="bg-pink-50 text-pink-600"
                title="Email Links"
                desc="Forgot password & reset via email"
              />
              <FeatureBadge
                icon="KPI"
                iconClasses="bg-green-50 text-green-600"
                title="Reports"
                desc="Admin KPIs & role distribution"
              />
            </div>
          </section>

          <aside className="relative max-w-xl mx-auto lg:mx-0 w-full">
            <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-gray-100 h-full flex flex-col">
              <div className="text-xs uppercase tracking-wide text-gray-400">Live demo</div>
              <h3 className="text-lg font-semibold text-gray-800 mt-1">Explore the workspace</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Four quick tiles highlight the workflows teams use most. Each tile opens that area of the demo app.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {demoTiles.map((tile) => (
                  <div
                    key={tile.title}
                    className="group rounded-xl border border-gray-100 bg-white/90 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-gray-400">
                      <span>{tile.tag}</span>
                      <span className="font-semibold text-emerald-600">Preview</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${tile.accent}`}
                      >
                        {tile.glyph}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800 leading-snug">{tile.title}</div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tile.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(tile.to)}
                      className="mt-3 inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 focus:outline-none"
                    >
                      {tile.cta}
                      <span className="ml-1 text-[0.6rem] text-emerald-500 transition-transform group-hover:translate-x-1">&gt;</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="text-sm text-gray-600">
                  Want everything in one place? Log in to experience the end-to-end workflow.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white text-sm font-medium shadow-lg hover:scale-[1.01] transition"
                >
                  Login
                </button>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-8 -top-8 opacity-20">
              <svg width="220" height="220" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="g1" x1="0" x2="1">
                    <stop offset="0" stopColor="#DCEEFF" />
                    <stop offset="1" stopColor="#E8FCEF" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="200" height="200" rx="24" fill="url(#g1)" />
              </svg>
            </div>
          </aside>
        </main>

        <footer id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-8 text-center text-xs sm:text-sm text-gray-500">
          (c) {new Date().getFullYear()} Yvidhya — Timesheet App. Built with care for productive teams.
        </footer>
      </div>
    </div>
  );
}

