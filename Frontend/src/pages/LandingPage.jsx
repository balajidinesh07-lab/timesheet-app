// src/pages/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo-dark.png"; // keep your existing asset

export default function LandingPage() {
  const navigate = useNavigate();

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

        {/* Right: Decorative panel (removed mini timesheet preview, added illustration + CTA) */}
        <aside className="relative">
          <div className="rounded-2xl bg-white p-8 shadow-2xl border border-gray-50">
            <div className="text-sm text-gray-400 uppercase mb-4">Live demo</div>

            <div className="rounded-lg border border-gray-100 p-6 bg-gradient-to-tr from-white to-gray-50 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-gray-700">Employee Timesheet</div>
                <div className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">Preview</div>
              </div>

              {/* simplified illustrative rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">C1 • P1</div>
                  <div className="flex gap-2">
                    {[9,1,1,2,2,0].map((n, i) => (
                      <div key={i} className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 font-semibold shadow-sm">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">C2 • P2</div>
                  <div className="flex gap-2">
                    {[2,3,3,3,3,0].map((n, i) => (
                      <div key={i} className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 font-semibold shadow-sm">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t pt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">Totals</div>
                <div className="text-2xl font-extrabold text-gray-800">29</div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-600">Want a full view? Click the button to open the app and try the end-to-end workflow.</p>
              <div className="mt-4">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium shadow-lg hover:scale-105 transition"
                >
                  Login
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
