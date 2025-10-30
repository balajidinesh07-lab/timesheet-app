// src/pages/ManagerLeaveDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Search, MoreHorizontal, ArrowLeft } from "lucide-react";
import logo from "../assets/logo-dark.png";
import { http } from "../api/http";

function safeDate(value) {
  try {
    return new Date(value).toLocaleDateString("en-GB");
  } catch {
    return value || "-";
  }
}

export default function ManagerLeaveDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionModal, setActionModal] = useState({
    open: false,
    mode: null,
    note: "",
    request: null,
  });
  const [bulk, setBulk] = useState({});
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await http.get("/leaves/requests/manager");
      const data = Array.isArray(res) ? res : [];
      setRequests(data);
      setBulk({});
      setProcessingIds(new Set());
    } catch (err) {
      console.error("Failed to fetch manager requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    return requests
      .filter((r) => {
        if (filter !== "All" && r.status !== filter) return false;
        if (!q) return true;
        return (
          (r.employee || "").toLowerCase().includes(q) ||
          (r.type || "").toLowerCase().includes(q) ||
          (r.employeeId || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [requests, filter, query]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "Pending").length,
    [requests]
  );

  const performAction = async (id, mode, note = "") => {
    const targetStatus = mode === "approve" ? "Approved" : "Rejected";
    setProcessingIds((prev) => new Set([...prev, id]));

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: targetStatus, managerNote: note } : r
      )
    );

    try {
      const endpoint =
        mode === "approve" ? `/leaves/${id}/approve` : `/leaves/${id}/reject`;
      const res = await http.post(endpoint, { note });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: res?.status || targetStatus,
                managerNote: res?.managerNote ?? note,
                decidedAt: res?.decidedAt || r.decidedAt || new Date().toISOString(),
              }
            : r
        )
      );
    } catch (err) {
      console.error(`${mode} failed`, err);
      alert(err.message || `Failed to ${mode} request. Please try again.`);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "Pending" } : r))
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchRequests();
    }
  };

  const performBulkApprove = async () => {
    const ids = Object.keys(bulk).filter((key) => bulk[key]);
    if (ids.length === 0) {
      alert("Select at least one request to approve.");
      return;
    }
    if (!window.confirm(`Approve ${ids.length} request(s)?`)) return;

    for (const id of ids) {
      await performAction(id, "approve", "Approved by manager (bulk)");
    }
    setBulk({});
  };

  const openDetails = (request) => {
    setSelected(request);
    setActionModal({ open: false, mode: null, note: "", request: null });
  };

  const openAction = (mode, request) => {
    setSelected(null);
    setActionModal({ open: true, mode, note: "", request });
  };

  const confirmAction = async () => {
    const request = actionModal.request;
    if (!request || !actionModal.mode) return;
    const mode = actionModal.mode === "approve" ? "approve" : "reject";
    await performAction(request.id, mode, actionModal.note || "");
    setActionModal({ open: false, mode: null, note: "", request: null });
  };

  const toggleBulk = (id) => {
    setBulk((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const processing = (id) => processingIds.has(id);

  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #f7fbff 40%, #f5fffa 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="logo" className="h-12 md:h-14 object-contain" />
          <div>
            <div className="text-xs text-slate-500">People Ops</div>
            <div className="text-xl md:text-2xl font-bold text-slate-800">
              Manager Leave Approvals
            </div>
            <div className="text-sm text-slate-400">
              Review and manage your team leave requests
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-xs text-slate-500">Pending</div>
            <div className="font-semibold text-slate-800">{pendingCount}</div>
          </div>

          <button
            onClick={() => navigate("/payroll")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-[360px]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search employee, id or type..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                onClick={performBulkApprove}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm shadow hover:opacity-95"
              >
                Bulk Approve
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-500">
            Total requests:{" "}
            <span className="font-semibold text-slate-700">
              {requests.length}
            </span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[960px]">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next = {};
                          filtered.forEach((r) => {
                            next[r.id] = checked;
                          });
                          setBulk(next);
                        }}
                      />
                    </th>
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">From</th>
                    <th className="p-3 text-left">To</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-center">Days</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-6 text-center text-slate-500"
                      >
                        No requests found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const busy = processing(r.id);
                      return (
                        <tr key={r.id} className="border-b hover:bg-slate-50">
                          <td className="p-3 align-top">
                            <input
                              type="checkbox"
                              checked={!!bulk[r.id]}
                              onChange={() => toggleBulk(r.id)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">
                              {r.employee || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              ID: {r.employeeId || "-"}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Requested:{" "}
                              {r.requestedAt
                                ? new Date(r.requestedAt).toLocaleString()
                                : "-"}
                            </div>
                          </td>
                          <td className="p-3">{r.type || "-"}</td>
                          <td className="p-3">{safeDate(r.from)}</td>
                          <td className="p-3">{safeDate(r.to)}</td>
                          <td className="p-3 max-w-xs">
                            <div className="truncate" title={r.reason || "-"}>
                              {r.reason || "-"}
                            </div>
                          </td>
                          <td className="p-3 text-center font-semibold">
                            {r.days ?? "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                r.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : r.status === "Rejected"
                                  ? "bg-rose-50 text-rose-700"
                                  : r.status === "Cancelled"
                                  ? "bg-slate-50 text-slate-600"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {r.status || "-"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {r.status === "Pending" && (
                                <>
                                  <button
                                    disabled={busy}
                                    onClick={() => openAction("approve", r)}
                                    className="p-2 rounded bg-emerald-600 text-white text-xs hover:opacity-95 disabled:opacity-60"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={() => openAction("reject", r)}
                                    className="p-2 rounded bg-rose-50 text-rose-600 text-xs border border-rose-100 hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openDetails(r)}
                                className="p-2 rounded-full bg-white border text-slate-500 hover:shadow"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Request details</div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {selected.employee || "-"} • {selected.type || "-"}
                </h3>
                <div className="text-xs text-slate-400 mt-1">
                  Requested:{" "}
                  {selected.requestedAt
                    ? new Date(selected.requestedAt).toLocaleString()
                    : "-"}
                </div>
              </div>
              <div>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-1 rounded bg-slate-100 text-xs"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-slate-500">From</div>
                <div className="font-medium">{safeDate(selected.from)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">To</div>
                <div className="font-medium">{safeDate(selected.to)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Days</div>
                <div className="font-medium">{selected.days ?? "-"}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-500">Reason</div>
              <div className="mt-1 text-slate-700">{selected.reason || "-"}</div>
            </div>

            {selected.managerNote && (
              <div className="mt-4">
                <div className="text-xs text-slate-500">Manager note</div>
                <div className="mt-1 text-slate-700">
                  {selected.managerNote}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              {selected.status === "Pending" && (
                <>
                  <button
                    onClick={() => openAction("reject", selected)}
                    className="px-4 py-2 rounded bg-rose-50 text-rose-600"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => openAction("approve", selected)}
                    className="px-4 py-2 rounded bg-emerald-600 text-white"
                  >
                    Approve
                  </button>
                </>
              )}
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {actionModal.open && actionModal.request && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800">
                {actionModal.mode === "approve" ? "Approve request" : "Reject request"}
              </h4>
              <button
                onClick={() =>
                  setActionModal({ open: false, mode: null, note: "", request: null })
                }
                className="text-slate-500"
              >
                x
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-600">
              <div>
                <strong>{actionModal.request.employee || "-"}</strong> •{" "}
                {actionModal.request.type || "-"} •{" "}
                {safeDate(actionModal.request.from)} -{" "}
                {safeDate(actionModal.request.to)} ({actionModal.request.days || "-"} day(s))
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Reason: {actionModal.request.reason || "-"}
              </div>
            </div>

            <label className="block mt-4 text-sm">
              Manager note (optional)
              <textarea
                value={actionModal.note}
                onChange={(e) =>
                  setActionModal((prev) => ({ ...prev, note: e.target.value }))
                }
                rows={4}
                className="w-full mt-2 p-2 border rounded"
                placeholder="Add context for the employee..."
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() =>
                  setActionModal({ open: false, mode: null, note: "", request: null })
                }
                className="px-4 py-2 rounded bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 rounded text-white ${
                  actionModal.mode === "approve" ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
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

