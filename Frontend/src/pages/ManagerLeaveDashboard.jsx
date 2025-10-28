// src/pages/ManagerLeaveDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Search, Filter, Calendar, MoreHorizontal, ArrowLeft } from "lucide-react";
import logo from "../assets/logo-dark.png";
import { http } from "../api/http";

/**
 * ManagerLeaveDashboard
 * - Shows team leave requests
 * - Manager can Approve / Reject with an optional note
 * - Filter / Search / View details
 *
 * Replace API endpoints as necessary; http helper is used consistently with your other components.
 */

const SAMPLE_TEAM = [
  {
    id: "req-1001",
    employee: "Alice Johnson",
    employeeId: "E102",
    type: "Casual",
    from: "2025-10-20",
    to: "2025-10-21",
    days: 2,
    reason: "Family event",
    status: "Pending",
    requestedAt: "2025-10-10T09:22:00Z",
    managerNote: "",
  },
  {
    id: "req-1002",
    employee: "Bob Smith",
    employeeId: "E217",
    type: "Sick",
    from: "2025-09-12",
    to: "2025-09-12",
    days: 1,
    reason: "Medical appointment",
    status: "Approved",
    requestedAt: "2025-09-11T14:10:00Z",
    managerNote: "Approved — get well soon",
  },
  {
    id: "req-1003",
    employee: "Charlie Lee",
    employeeId: "E330",
    type: "Paid Time Off",
    from: "2025-11-04",
    to: "2025-11-07",
    days: 4,
    reason: "Vacation",
    status: "Pending",
    requestedAt: "2025-10-05T08:00:00Z",
    managerNote: "",
  },
];

function smallDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-GB");
  } catch {
    return d;
  }
}

export default function ManagerLeaveDashboard() {
  const navigate = useNavigate();

  // state
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null); // request being inspected
  const [actionModal, setActionModal] = useState({ open: false, mode: null, note: "" }); // mode: 'approve'|'reject'
  const [bulk, setBulk] = useState({}); // selected ids for bulk ops
  const [processingIds, setProcessingIds] = useState(new Set());

  // fetch requests (manager view)
  const fetchRequests = async () => {
    setLoading(true);
    try {
      // replace /leaves/requests/manager with your real endpoint if needed
      const res = await http.get("/leaves/requests/manager").catch(() => null);
      // if backend not available during dev, fall back to sample
      const data = Array.isArray(res) && res.length ? res : SAMPLE_TEAM;
      setRequests(data);
    } catch (err) {
      console.error("Failed to fetch manager requests:", err);
      setRequests(SAMPLE_TEAM);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // derived lists
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== "All" && r.status !== filter) return false;
      if (!q) return true;
      return (
        (r.employee || "").toLowerCase().includes(q) ||
        (r.type || "").toLowerCase().includes(q) ||
        (r.employeeId || "").toLowerCase().includes(q)
      );
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [requests, filter, query]);

  const pendingCount = useMemo(() => requests.filter(r => r.status === "Pending").length, [requests]);

  // Approve / Reject single request
  const performAction = async (id, mode, note = "") => {
    // mode: 'approve' or 'reject'
    setProcessingIds((s) => new Set([...s, id]));
    try {
      // Optimistic update
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: mode === "approve" ? "Approved" : "Rejected", managerNote: note } : r));

      // call backend
      // endpoints expected:
      // POST /leaves/{id}/approve  body: { managerNote }
      // POST /leaves/{id}/reject   body: { managerNote }
      const endpoint = mode === "approve" ? `/leaves/${id}/approve` : `/leaves/${id}/reject`;
      await http.post(endpoint, { managerNote: note }).catch((err) => {
        // if backend failed, revert optimistic update
        console.error(`${mode} failed`, err);
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "Pending" } : r));
        alert(`Failed to ${mode} request — try again.`);
      });
    } finally {
      setProcessingIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  // Bulk approve
  const performBulkApprove = async () => {
    const ids = Object.keys(bulk).filter((k) => bulk[k]);
    if (ids.length === 0) return alert("Select at least one request to approve.");
    if (!window.confirm(`Approve ${ids.length} request(s)?`)) return;
    // loop - could be batched server-side
    for (const id of ids) {
      await performAction(id, "approve", "Approved by manager (bulk)");
    }
    setBulk({});
  };

  // open detail modal
  const openDetails = (r) => {
    setSelected(r);
    setActionModal({ open: false, mode: null, note: "" });
  };

  // open action modal for approve or reject
  const openAction = (mode, r) => {
    setSelected(r);
    setActionModal({ open: true, mode, note: "" });
  };

  // confirm action (from modal)
  const confirmAction = async () => {
    if (!selected) return;
    const mode = actionModal.mode;
    await performAction(selected.id, mode === "approve" ? "approve" : "reject", actionModal.note || "");
    setActionModal({ open: false, mode: null, note: "" });
    setSelected(null);
  };

  // small utilities
  const toggleBulk = (id) => setBulk((p) => ({ ...p, [id]: !p[id] }));
  const clearSelection = () => { setSelected(null); setActionModal({ open: false, mode: null, note: "" }); };

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{
        background:
          "radial-gradient(circle at 6% 8%, rgba(14,165,233,0.04) 0%, transparent 28%), " +
          "radial-gradient(circle at 96% 92%, rgba(34,197,94,0.03) 0%, transparent 32%), " +
          "linear-gradient(180deg, #ffffff 0%, #fbffff 40%, #f7fffb 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="logo" className="h-12 md:h-14 object-contain" />
          <div>
            <div className="text-xs text-slate-500">People Ops</div>
            <div className="text-xl md:text-2xl font-extrabold text-slate-800">Manager — Leave Approvals</div>
            <div className="text-sm text-slate-400">Review and manage your team's leave requests</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-slate-500">Pending</div>
            <div className="font-semibold text-slate-800">{pendingCount}</div>
          </div>

          <button onClick={() => navigate("/payroll")} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-100 shadow-sm hover:shadow-md transition">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* controls */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="relative flex items-center bg-white border rounded-lg px-3 py-2 shadow-sm w-full md:w-[420px]">
              <Search size={16} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee, id or type..." className="w-full ml-2 outline-none text-sm" />
            </div>

            <div className="flex items-center gap-2">
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm">
                <option>All</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Cancelled</option>
              </select>

              <button onClick={performBulkApprove} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm shadow hover:opacity-95">Bulk Approve</button>
            </div>
          </div>

          <div className="text-sm text-slate-500">Total requests: <span className="font-semibold text-slate-700 ml-1">{requests.length}</span></div>
        </div>

        {/* requests list */}
        <section className="bg-white rounded-2xl shadow-sm border p-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading requests…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 980 }}>
                <colgroup>
                  <col style={{ width: "3.5rem" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>

                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3 text-left">
                      <input type="checkbox" onChange={(e) => {
                        const checked = e.target.checked;
                        const next = {};
                        filtered.forEach(r => { next[r.id] = checked; });
                        setBulk(next);
                      }} />
                    </th>
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">From</th>
                    <th className="p-3 text-left">To</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-center">Days</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-slate-500">No requests.</td></tr>
                  ) : filtered.map((r) => {
                    const busy = processingIds.has(r.id);
                    const isChecked = !!bulk[r.id];
                    return (
                      <tr key={r.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 align-top">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleBulk(r.id)} />
                        </td>

                        <td className="p-3">
                          <div className="font-medium text-slate-800">{r.employee}</div>
                          <div className="text-xs text-slate-500">ID: {r.employeeId}</div>
                          <div className="text-xs text-slate-400 mt-1">Requested: {new Date(r.requestedAt).toLocaleString()}</div>
                        </td>

                        <td className="p-3">{r.type}</td>
                        <td className="p-3">{smallDate(r.from)}</td>
                        <td className="p-3">{smallDate(r.to)}</td>

                        <td className="p-3 text-slate-700 max-w-xs">
                          <div className="truncate" title={r.reason}>{r.reason || "—"}</div>
                        </td>

                        <td className="p-3 text-center font-semibold">{r.days}</td>

                        <td className="p-3 text-center align-top">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === "Pending" ? "bg-amber-50 text-amber-800" : r.status === "Approved" ? "bg-emerald-50 text-emerald-800" : r.status === "Rejected" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}>
                              {r.status}
                            </div>

                            {/* actions only for Pending */}
                            {r.status === "Pending" && (
                              <div className="flex items-center gap-1">
                                <button disabled={busy} onClick={() => openAction("approve", r)} className="p-2 rounded-lg bg-emerald-600 text-white text-xs hover:opacity-95">
                                  <CheckCircle size={14} />
                                </button>

                                <button disabled={busy} onClick={() => openAction("reject", r)} className="p-2 rounded-lg bg-rose-50 text-rose-600 text-xs border border-rose-100 hover:bg-rose-100">
                                  <XCircle size={14} />
                                </button>
                              </div>
                            )}

                            {/* view details */}
                            <button onClick={() => openDetails(r)} title="View details" className="p-2 rounded-full bg-white border text-slate-500 hover:shadow-sm">
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* detail drawer/modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Request details</div>
                <h3 className="text-xl font-semibold text-slate-800">{selected.employee} • {selected.type}</h3>
                <div className="text-xs text-slate-400 mt-1">Requested: {new Date(selected.requestedAt).toLocaleString()}</div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="px-3 py-1 rounded bg-slate-100 text-xs">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">From</div>
                <div className="font-medium">{smallDate(selected.from)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">To</div>
                <div className="font-medium">{smallDate(selected.to)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Days</div>
                <div className="font-medium">{selected.days}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-500">Reason</div>
              <div className="mt-1 text-slate-700">{selected.reason || "—"}</div>
            </div>

            {selected.managerNote ? (
              <div className="mt-4">
                <div className="text-xs text-slate-500">Manager note</div>
                <div className="mt-1 text-slate-700">{selected.managerNote}</div>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              {selected.status === "Pending" && (
                <>
                  <button onClick={() => openAction("reject", selected)} className="px-4 py-2 rounded bg-rose-50 text-rose-600">Reject</button>
                  <button onClick={() => openAction("approve", selected)} className="px-4 py-2 rounded bg-emerald-600 text-white">Approve</button>
                </>
              )}
              <button onClick={() => { setSelected(null); setActionModal({ open: false, mode: null, note: "" }); }} className="px-4 py-2 rounded bg-slate-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* approve/reject modal */}
      {actionModal.open && selected && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800">{actionModal.mode === "approve" ? "Approve request" : "Reject request"}</h4>
              <button onClick={() => setActionModal({ open: false, mode: null, note: "" })} className="text-slate-500">✕</button>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              <div><strong>{selected.employee}</strong> • {selected.type} • {smallDate(selected.from)} → {smallDate(selected.to)} ({selected.days} day(s))</div>
              <div className="mt-2 text-xs text-slate-500">Reason: {selected.reason || "—"}</div>
            </div>

            <label className="block mt-4 text-sm">
              Manager note (optional)
              <textarea value={actionModal.note} onChange={(e) => setActionModal((s) => ({ ...s, note: e.target.value }))} rows={4} className="w-full mt-2 p-2 border rounded" placeholder="Add context for the employee..." />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setActionModal({ open: false, mode: null, note: "" })} className="px-4 py-2 rounded bg-slate-100">Cancel</button>
              <button onClick={confirmAction} className={`px-4 py-2 rounded text-white ${actionModal.mode === "approve" ? "bg-emerald-600" : "bg-rose-600"}`}>
                {actionModal.mode === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rounded-2xl { border-radius: 14px; }
        .shadow-sm { box-shadow: 0 8px 28px rgba(15,23,42,0.06); }
        .shadow-2xl { box-shadow: 0 18px 60px rgba(2,6,23,0.12); }
        @media (max-width: 720px) {
          .drop-shadow-sm { filter: drop-shadow(0 4px 10px rgba(15,23,42,0.05)); }
        }
      `}</style>
    </div>
  );
}
