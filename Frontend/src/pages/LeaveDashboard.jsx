// src/pages/LeaveDashboard.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, PlusCircle, CheckCircle, XCircle } from "lucide-react";
import logo from "../assets/logo-dark.png";

const sampleBalances = {
  Casual: 6,
  Sick: 8,
  "Paid Time Off": 12,
  "Comp Off": 2,
};

const sampleRequests = [
  { id: 1, type: "Casual", from: "2025-10-20", to: "2025-10-21", days: 2, status: "Approved" },
  { id: 2, type: "Sick", from: "2025-09-12", to: "2025-09-12", days: 1, status: "Pending" },
];

function BalanceCard({ type, days }) {
  const pct = Math.max(0, Math.min(100, Math.round((days / 30) * 100)));
  return (
    <div className="bg-white rounded-2xl p-4 shadow hover:shadow-lg transition">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-xs text-slate-500">{type}</div>
          <div className="font-semibold text-lg">{days} days</div>
        </div>
        <div className="w-20 h-8 bg-slate-50 rounded flex items-center justify-center text-xs">{pct}%</div>
      </div>
    </div>
  );
}

export default function LeaveDashboard() {
  const navigate = useNavigate();
  const [balances] = useState(sampleBalances);
  const [requests, setRequests] = useState(sampleRequests);
  const [openPanel, setOpenPanel] = useState(false);
  const [form, setForm] = useState({ type: "Casual", from: "", to: "", reason: "" });

  const totalTakenThisYear = useMemo(() => requests.reduce((acc, r) => acc + (r.days || 0), 0), [requests]);

  const submitRequest = (e) => {
    e.preventDefault();
    // basic days calc (inclusive)
    const from = new Date(form.from);
    const to = new Date(form.to || form.from);
    if (isNaN(from.getTime())) return alert("Select a valid start date");
    if (to.getTime() < from.getTime()) return alert("End date cannot be before start date");
    const diff = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
    const newReq = {
      id: Date.now(),
      type: form.type,
      from: form.from,
      to: form.to || form.from,
      days: diff,
      status: "Pending",
    };
    setRequests((p) => [newReq, ...p]);
    setForm({ type: "Casual", from: "", to: "", reason: "" });
    setOpenPanel(false);
  };

  const cancelRequest = (id) => {
    setRequests((p) => p.map(r => r.id === id ? { ...r, status: "Cancelled" } : r));
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <header className="flex items-center gap-4 mb-6">
        <img src={logo} alt="logo" className="h-12 w-auto md:h-14 object-contain" />
        <div className="flex-1" />
        <button onClick={() => navigate("/payroll")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow hover:shadow-md transition">
          <ArrowLeft size={16} /> Back to Payroll
        </button>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Leave Management</div>
              <h2 className="text-2xl font-semibold">Request & Balances</h2>
              <div className="text-xs text-slate-400 mt-1">Request leaves, check balances and track approvals</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-500">Taken this year</div>
                <div className="font-semibold">{totalTakenThisYear} days</div>
              </div>
              <button onClick={() => setOpenPanel(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:opacity-90 transition">
                <PlusCircle size={16} /> Request leave
              </button>
            </div>
          </div>
        </div>

        {/* balances + calendar + requests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(balances).map(([k, v]) => <BalanceCard key={k} type={k} days={v} />)}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500">Calendar (preview)</div>
                  <div className="font-semibold">Upcoming</div>
                </div>
                <div className="text-xs text-slate-400">Interactive calendar coming soon</div>
              </div>

              {/* minimal calendar visualization */}
              <div className="grid grid-cols-7 gap-2 text-xs">
                {Array.from({ length: 35 }).map((_, i) => {
                  const filled = requests.some(r => {
                    // mark requested days if match day modulo just for demo visualization
                    return (i % 11) === (r.id % 11);
                  });
                  return (
                    <div key={i} className={`p-2 rounded text-center ${filled ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"} border`}>
                      <div className="font-semibold">{(i % 30) + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="bg-white rounded-2xl p-4 shadow space-y-4">
            <div>
              <div className="text-sm text-slate-500">Request History</div>
              <div className="mt-3 space-y-2">
                {requests.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div>
                      <div className="font-medium">{r.type} • {r.days} day(s)</div>
                      <div className="text-xs text-slate-500">{r.from} → {r.to}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold ${r.status === "Approved" ? "text-green-700" : r.status === "Pending" ? "text-amber-700" : "text-rose-600"}`}>
                        {r.status}
                      </div>
                      <div className="mt-1 flex gap-1 justify-end">
                        {r.status === "Pending" && (
                          <button onClick={() => cancelRequest(r.id)} className="px-2 py-1 text-xs rounded bg-rose-50 text-rose-600">Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-slate-500 mb-2">Policy highlights</div>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Leave request, approval, and tracking</li>
                <li>• Configurable leave types (CL, SL, PL etc.)</li>
                <li>• Leave balance auto-calculation</li>
                <li>• Calendar overview for team visibility</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* request panel modal */}
      {openPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-[92%] max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Leave Request</h3>
              <button onClick={() => setOpenPanel(false)} className="px-3 py-1 rounded bg-slate-100">Close</button>
            </div>

            <form onSubmit={submitRequest} className="grid grid-cols-1 gap-3">
              <label className="text-sm">
                Leave type
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))} className="w-full mt-1 p-2 border rounded">
                  {Object.keys(balances).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  From
                  <input required type="date" value={form.from} onChange={(e) => setForm(f => ({ ...f, from: e.target.value }))} className="w-full mt-1 p-2 border rounded" />
                </label>
                <label className="text-sm">
                  To
                  <input type="date" value={form.to} onChange={(e) => setForm(f => ({ ...f, to: e.target.value }))} className="w-full mt-1 p-2 border rounded" />
                </label>
              </div>

              <label className="text-sm">
                Reason (optional)
                <textarea value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} className="w-full mt-1 p-2 border rounded" rows={3} />
              </label>

              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setOpenPanel(false)} className="px-4 py-2 rounded bg-slate-100">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white">Submit request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* tiny animations for a modern feel */
        .rounded-2xl { border-radius: 14px; }
        .shadow { box-shadow: 0 6px 18px rgba(15,23,42,0.06); }
        .animate-gradient-xy { background-image: linear-gradient(90deg, #06b6d4 0%, #3b82f6 35%, #8b5cf6 100%); background-size: 200% 200%; animation: gradientXY 9s ease infinite; }
        @keyframes gradientXY { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }
      `}</style>
    </div>
  );
}
