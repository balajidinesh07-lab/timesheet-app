// src/pages/LeaveDashboard.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, PlusCircle, CheckCircle, XCircle } from "lucide-react";
import logo from "../assets/logo-dark.png";
import { http } from "../api/http";
/**
 * Compact LeaveDashboard - hero height reduced, no InfoStore/Form11 buttons,
 * decorative square removed. Request button gradient harmonises with hero.
 */
function StatCard({ title, value, accent = "blue" }) {
  const bgMap = {
    blue: "linear-gradient(90deg,#eef6ff,#ffffff)",
    green: "linear-gradient(90deg,#f0fdf4,#ffffff)",
    amber: "linear-gradient(90deg,#fff9f0,#ffffff)",
    slate: "linear-gradient(90deg,#fbfdff,#ffffff)",
  };
  return (
    <div
      className="rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition"
      style={{ background: bgMap[accent] }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/60 shadow-sm">
          <Calendar size={18} />
        </div>
        <div>
          <div className="text-xs text-slate-500">{title}</div>
          <div className="font-semibold text-slate-800">{value}</div>
        </div>
      </div>
    </div>
  );
}
function BalanceCard({ type, days }) {
  const pct = Math.max(0, Math.min(100, Math.round((days / 30) * 100)));
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
      <div
        className="absolute inset-0 opacity-36 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 8% 12%, rgba(59,130,246,0.06), transparent 25%), radial-gradient(circle at 92% 84%, rgba(16,185,129,0.03), transparent 30%)",
        }}
      />
      <div className="relative flex justify-between items-start gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">{type}</div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-800">{days}</div>
          <div className="text-xs text-slate-500 mt-1">days</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-[11px] text-slate-500 bg-white/80 border border-slate-100 rounded px-2 py-1">Usage</div>
          <div className="w-20 h-8 bg-white/80 rounded flex items-center justify-center text-sm font-medium border border-slate-100">
            {pct}%
          </div>
        </div>
      </div>
      <div
        className="absolute left-4 bottom-3 w-16 h-1 rounded"
        style={{ background: "linear-gradient(90deg,#10b981,#60a5fa)", opacity: 0.55 }}
      />
    </div>
  );
}
function formatDate(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB");
  } catch {
    return value;
  }
}
export default function LeaveDashboard() {
  const navigate = useNavigate();
  const [balances, setBalances] = useState({});
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approvedDays: 0, totalRequests: 0, upcomingApproved: 0 });
  const [openPanel, setOpenPanel] = useState(false);
  const [form, setForm] = useState({ type: "", from: "", to: "", reason: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const totalTakenThisYear = useMemo(() => {
    if (typeof stats?.approvedDays === "number") return stats.approvedDays;
    return requests.reduce((acc, r) => acc + (r.days || 0), 0);
  }, [stats, requests]);
  const pendingCount = useMemo(() => {
    if (typeof stats?.pending === "number") return stats.pending;
    return requests.filter((r) => r.status === "Pending").length;
  }, [stats, requests]);
  const refreshSummary = useCallback(
    async ({ showSpinner = false } = {}) => {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      setError("");
      try {
        const data = await http.get("/leaves/summary");
        const nextBalances =
          data && typeof data.balances === "object" && !Array.isArray(data.balances) ? data.balances : {};
        const nextRequests = Array.isArray(data?.requests) ? data.requests : [];
        const nextStats =
          data && data.stats && typeof data.stats === "object"
            ? {
                pending: data.stats.pending ?? nextRequests.filter((r) => r.status === "Pending").length,
                approvedDays: data.stats.approvedDays ?? nextRequests.reduce((acc, r) => acc + (r.days || 0), 0),
                totalRequests: data.stats.totalRequests ?? nextRequests.length,
                upcomingApproved: data.stats.upcomingApproved ?? 0,
              }
            : {
                pending: nextRequests.filter((r) => r.status === "Pending").length,
                approvedDays: nextRequests.reduce((acc, r) => acc + (r.days || 0), 0),
                totalRequests: nextRequests.length,
                upcomingApproved: 0,
              };
        const reportedTypes = Array.isArray(data?.types) ? data.types : [];
        const fallbackTypes = reportedTypes.length ? reportedTypes : Object.keys(nextBalances);
        setBalances(nextBalances);
        setRequests(nextRequests);
        setStats(nextStats);
        setLeaveTypes(fallbackTypes);
        setForm((prev) => ({
          ...prev,
          type: fallbackTypes.includes(prev.type) ? prev.type : fallbackTypes[0] || "",
        }));
      } catch (err) {
        console.error("Leave summary load error:", err);
        setBalances({});
        setRequests([]);
        setStats({ pending: 0, approvedDays: 0, totalRequests: 0, upcomingApproved: 0 });
        setError(err.message || "Failed to load leave summary.");
      } finally {
        if (showSpinner) setLoading(false);
        else setRefreshing(false);
      }
    },
    []
  );
  useEffect(() => {
    refreshSummary({ showSpinner: true });
  }, [refreshSummary]);
  const submitRequest = async (e) => {
    e.preventDefault();
    if (!form.type) {
      alert("Select a leave type");
      return;
    }
    const fromDate = new Date(form.from);
    if (Number.isNaN(fromDate.getTime())) {
      alert("Select a valid start date");
      return;
    }
    const toInput = form.to || form.from;
    const toDate = new Date(toInput);
    if (Number.isNaN(toDate.getTime())) {
      alert("Select a valid end date");
      return;
    }
    if (toDate.getTime() < fromDate.getTime()) {
      alert("End date cannot be before start date");
      return;
    }
    setSubmitting(true);
    try {
      await http.post("/leaves", {
        type: form.type,
        from: form.from,
        to: toInput,
        reason: form.reason || "",
      });
      await refreshSummary();
      setForm((prev) => ({ ...prev, from: "", to: "", reason: "" }));
      setOpenPanel(false);
    } catch (err) {
      console.error("Create leave error:", err);
      alert(err.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };
  const cancelRequest = async (id) => {
    if (!id) return;
    setCancellingId(id);
    try {
      await http.patch(`/leaves/${id}/cancel`);
      await refreshSummary();
    } catch (err) {
      console.error("Cancel leave error:", err);
      alert(err.message || "Failed to cancel leave request");
    } finally {
      setCancellingId(null);
    }
  };
  const isBusy = loading || refreshing;
  const balanceEntries = Object.entries(balances || {});
  const showBalancesLoader = loading && balanceEntries.length === 0;
  const showRequestsLoader = loading && requests.length === 0;
  const leaveTypeCount = leaveTypes.length || balanceEntries.length;
  const pendingLabel = isBusy ? "..." : `${pendingCount}`;
  const takenLabel = isBusy ? "..." : `${totalTakenThisYear} day${totalTakenThisYear === 1 ? "" : "s"}`;
  const renderCalendarPreview = () => {
    const active = requests.filter(
      (r) =>
        r &&
        r.from &&
        !["Cancelled", "Rejected"].includes(r.status || "") &&
        typeof r.days === "number" &&
        r.days > 0
    );
    const cells = Array.from({ length: 35 }).map((_, i) => {
      const day = (i % 30) + 1;
      const marked = active.some((r) => {
        const fromDate = new Date(r.from);
        if (Number.isNaN(fromDate.getTime())) return false;
        const startDay = fromDate.getDate();
        return day >= startDay && day < startDay + (r.days || 0);
      });
      return (
        <div
          key={i}
          className={`p-2 rounded text-center border ${marked ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"}`}
        >
          <div className="font-semibold text-sm">{day}</div>
        </div>
      );
    });
    return <div className="grid grid-cols-7 gap-2 text-xs">{cells}</div>;
  };
  return (
    <div
      className="min-h-screen bg-animated-sky p-6"
      style={{
        background:
          "radial-gradient(circle at 8% 12%, rgba(59,130,246,0.06) 0%, transparent 26%), " +
          "radial-gradient(circle at 92% 84%, rgba(16,185,129,0.04) 0%, transparent 30%), " +
          "linear-gradient(180deg, #ffffff 0%, #f7fbfb 40%, #f8fffb 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="logo" className="h-12 md:h-14 object-contain drop-shadow-sm" />
          <div>
            <div className="text-xs text-slate-500">People Ops</div>
            <div className="text-xl md:text-2xl font-extrabold text-slate-800">Leave Management</div>
            <div className="text-sm text-slate-400">Request, approve and track your time off</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500">Taken this year</div>
            <div className="font-semibold text-slate-800">{takenLabel}</div>
          </div>
          <button
            onClick={() => navigate("/payroll")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100 shadow-sm hover:shadow-md transition"
            title="Back to payroll"
          >
            <ArrowLeft size={16} /> Back to Payroll
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto space-y-6">
        {/* Compact hero - reduced height, removed InfoStore/Form11 & decorative square */}
        <div
          className="relative rounded-2xl overflow-hidden p-5 md:p-6"
          style={{
            background: "linear-gradient(90deg,#4f46e5 0%, #3b82f6 45%, #34d399 100%)",
            color: "white",
            boxShadow: "0 12px 36px rgba(59,65,81,0.07)",
            minHeight: 110, // further reduced height for compact look
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="text-sm text-white/90">Request & Balances</div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight drop-shadow-lg">Request leaves & check balances</h1>
            <p className="mt-1 text-sm text-white/90 max-w-lg">Quickly submit leave requests, view balances and track approvals for you and your team.</p>
          </div>
          {/* Request button - harmonised gradient, sits in hero right side */}
          <div>
            <button
              onClick={() => setOpenPanel(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition transform hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(90deg,#06b6d4 0%, #10b981 100%)",
                color: "white",
                boxShadow: "0 10px 28px rgba(16,185,129,0.16)",
                border: "none",
              }}
            >
              <PlusCircle size={18} /> Request leave
            </button>
          </div>
        </div>
        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Leave types" value={isBusy ? "..." : `${leaveTypeCount}`} accent="blue" />
          <StatCard title="Days taken (YTD)" value={isBusy ? "..." : `${totalTakenThisYear}`} accent="green" />
          <StatCard title="Pending" value={pendingLabel} accent="amber" />
          <StatCard title="Policy" value="View" accent="slate" />
        </div>
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="font-semibold">Heads up:</span>
            <span>{error}</span>
          </div>
        )}
        {/* Main grid: balances + calendar + requests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500">Leave Balances</div>
                  <div className="font-semibold text-lg text-slate-800">Your available leaves</div>
                </div>
                <div className="text-xs text-slate-400">Auto-calculated monthly</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {showBalancesLoader ? (
                  <div className="col-span-full p-4 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                    Loading leave balances...
                  </div>
                ) : balanceEntries.length === 0 ? (
                  <div className="col-span-full p-4 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                    No leave balances recorded yet.
                  </div>
                ) : (
                  balanceEntries.map(([k, v]) => <BalanceCard key={k} type={k} days={v} />)
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500">Calendar (preview)</div>
                  <div className="font-semibold">Upcoming (team view)</div>
                </div>
                <div className="text-xs text-slate-400">Month view - Week starts Mon</div>
              </div>
              <div className="mb-4 text-xs text-slate-500">Interactive calendar coming soon</div>
              {renderCalendarPreview()}
            </div>
          </section>
          <aside className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Request History</div>
                <div className="font-semibold text-slate-800">Recent requests</div>
              </div>
              <button onClick={() => setOpenPanel(true)} className="text-sm text-emerald-600 flex items-center gap-2">
                <PlusCircle size={14} /> New
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {showRequestsLoader ? (
                <div className="p-4 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  Loading leave requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  No leave requests yet. Submit a new request to get started.
                </div>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div>
                      <div className="font-medium text-slate-800">{r.type} - {r.days} day(s)</div>
                      <div className="text-xs text-slate-500">{formatDate(r.from)} - {formatDate(r.to)}</div>
                      {r.reason ? <div className="text-xs text-slate-500 mt-1">Reason: {r.reason}</div> : null}
                      {r.managerNote ? <div className="text-xs text-slate-500 mt-1">Manager note: {r.managerNote}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold ${r.status === "Approved" ? "text-emerald-700" : r.status === "Pending" ? "text-amber-700" : r.status === "Cancelled" ? "text-rose-600" : "text-slate-600"}`}>
                        {r.status}
                      </div>
                      <div className="mt-2 flex flex-col items-end gap-2">
                        {r.status === "Pending" && (
                          <button
                            onClick={() => cancelRequest(r.id)}
                            disabled={cancellingId === r.id}
                            className={`px-2 py-1 text-xs rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition ${cancellingId === r.id ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {cancellingId === r.id ? "Cancelling..." : "Cancel"}
                          </button>
                        )}
                        {r.status === "Approved" && (
                          <div className="flex items-center gap-2 text-xs text-emerald-700">
                            <CheckCircle size={14} /> Approved
                          </div>
                        )}
                        {r.status === "Cancelled" && (
                          <div className="flex items-center gap-2 text-xs text-rose-600">
                            <XCircle size={14} /> Cancelled
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t">
              <div className="text-sm text-slate-500 mb-2">Policy highlights</div>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>- Leave request, approval & tracking</li>
                <li>- Configurable leave types (CL, SL, PL etc.)</li>
                <li>- Leave balance auto-calculation</li>
                <li>- Team calendar visibility (coming soon)</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {openPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">New Leave Request</h3>
              <button onClick={() => setOpenPanel(false)} className="px-3 py-1 rounded bg-slate-100 text-xs">Close</button>
            </div>
            <form onSubmit={submitRequest} className="grid grid-cols-1 gap-3">
              <label className="text-sm">
                Leave type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded"
                  disabled={leaveTypes.length === 0}
                >
                  {leaveTypes.length === 0 ? (
                    <option value="">No leave types available</option>
                  ) : (
                    leaveTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  From
                  <input required type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} className="w-full mt-1 p-2 border rounded" />
                </label>
                <label className="text-sm">
                  To
                  <input type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} className="w-full mt-1 p-2 border rounded" />
                </label>
              </div>
              <label className="text-sm">
                Reason (optional)
                <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="w-full mt-1 p-2 border rounded" rows={3} />
              </label>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setOpenPanel(false)} className="px-4 py-2 rounded bg-slate-100">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || leaveTypes.length === 0}
                  className={`px-4 py-2 rounded text-white ${submitting || leaveTypes.length === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
                  style={{ background: "linear-gradient(90deg,#06b6d4 0%, #10b981 100%)", color: "white" }}
                >
                  {submitting ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .rounded-2xl { border-radius: 14px; }
        .shadow-sm { box-shadow: 0 6px 18px rgba(15,23,42,0.06); }
        @media (max-width: 720px) {
          .drop-shadow-sm { filter: drop-shadow(0 4px 10px rgba(15,23,42,0.05)); }
        }
      `}</style>
    </div>
  );
}

