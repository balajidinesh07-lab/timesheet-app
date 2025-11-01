// src/pages/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png"; // keep your existing asset

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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Bigger logo, no company name next to it */}
          <img
            src={logo}
            alt="Yvidhya"
            className="h-16 w-auto transform transition-transform duration-300 hover:scale-105"
          />
        </div>

       
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Hero */}
        <section className="space-y-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900">
            Timesheet Management <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-400">for modern teams</span>
          </h1>

          <p className="max-w-xl text-lg text-gray-600">
            Track weekly work, submit for review, and get approvals — with secure role-based workflows.
            Fast UX, autosave drafts, and email reset links make life easier for Employees, Managers, and Admins.
          </p>

          

          {/* feature list */}
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="flex gap-3 items-start">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600 shadow-sm">
                🔒
              </div>
              <div>
                <div className="font-semibold">Secure Auth</div>
                <div className="text-sm text-gray-600">JWT + bcrypt with role-based access</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600 shadow-sm">
                ⚡
              </div>
              <div>
                <div className="font-semibold">Fast UX</div>
                <div className="text-sm text-gray-600">Autosave drafts and streamlined submit/review flow</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="p-3 rounded-lg bg-pink-50 text-pink-600 shadow-sm">✉️</div>
              <div>
                <div className="font-semibold">Email Links</div>
                <div className="text-sm text-gray-600">Forgot password & reset via email</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="p-3 rounded-lg bg-green-50 text-green-600 shadow-sm">📊</div>
              <div>
                <div className="font-semibold">Reports</div>
                <div className="text-sm text-gray-600">Admin KPIs & role distribution</div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: demo tiles */}
        <aside className="relative">
          <div className="rounded-2xl bg-white p-8 shadow-2xl border border-gray-50">
            <div className="text-sm text-gray-400 uppercase mb-2">Live demo</div>
            <h3 className="text-lg font-semibold text-gray-800">Explore the workspace</h3>
            <p className="text-sm text-gray-600 mt-2">
              Four quick tiles highlight the workflows teams use most. Each tile opens that area of the demo app.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demoTiles.map((tile) => (
                <div
                  key={tile.title}
                  className="group rounded-xl border border-gray-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                    <span>{tile.tag}</span>
                    <span className="font-semibold text-emerald-600">Preview</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${tile.accent}`}
                    >
                      {tile.glyph}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-gray-800">{tile.title}</div>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{tile.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(tile.to)}
                    className="mt-4 inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 focus:outline-none"
                  >
                    {tile.cta}
                    <span className="ml-2 text-xs text-emerald-500 transition-transform group-hover:translate-x-1">
                      &gt;
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-600">
                Want everything in one place? Launch the full app to experience the end-to-end workflow.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium shadow-lg hover:scale-105 transition"
                >
                  Launch demo
                </button>
              </div>
            </div>
          </div>

          {/* decorative floating circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 opacity-30">
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

      <footer id="features" className="max-w-7xl mx-auto px-6 py-12 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Yvidhya — Timesheet App. Built with ❤️ for productive teams.
      </footer>
    </div>
  );
}

