// client/src/pages/TimesheetDashboard.js
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import {
  Plus,
  Save,
  LogOut,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* --- helper functions (unchanged logic) --- */
function getMonday(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const defaultRow = () => ({
  client: "",
  project: "",
  task: "",
  activity: "",
  hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
});

/* --- Component --- */
export default function TimesheetDashboard({ onLogout }) {
  const [monday, setMonday] = useState(getMonday(new Date()));
  const [entries, setEntries] = useState([defaultRow()]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchSheet();
    // eslint-disable-next-line
  }, [monday]);

  async function fetchSheet() {
    setLoading(true);
    try {
      const res = await api.get(`/timesheets/${isoDate(monday)}`);
      if (res.data && res.data.entries && res.data.entries.length) {
        const grouped = {};
        res.data.entries.forEach((e) => {
          const key = `${e.client}|${e.project}|${e.task}|${e.activity}`;
          if (!grouped[key]) {
            grouped[key] = {
              client: e.client,
              project: e.project,
              task: e.task,
              activity: e.activity,
              hours: {
                mon: 0,
                tue: 0,
                wed: 0,
                thu: 0,
                fri: 0,
                sat: 0,
                sun: 0,
              },
            };
          }
          const dayIdx = Math.floor(
            (new Date(e.date) - monday) / (1000 * 60 * 60 * 24)
          );
          const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
          if (dayIdx >= 0 && dayIdx < 7) {
            grouped[key].hours[dayKeys[dayIdx]] = e.hours;
          }
        });
        setEntries(Object.values(grouped));
      } else {
        setEntries([defaultRow()]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setEntries([defaultRow()]);
    } finally {
      setLoading(false);
    }
  }

  function changeWeek(offsetWeeks) {
    const next = new Date(monday);
    next.setDate(next.getDate() + offsetWeeks * 7);
    setMonday(getMonday(next));
  }

  function updateField(i, field, value) {
    setEntries((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  function updateHour(i, dayKey, value) {
    setEntries((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const hours = { ...r.hours, [dayKey]: Number(value || 0) };
        return { ...r, hours };
      })
    );
  }

  async function save() {
    setLoading(true);
    try {
      const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      const docs = entries.flatMap((r) =>
        dayKeys.map((dayKey, idx) => ({
          client: r.client?.trim(),
          project: r.project?.trim(),
          task: r.task?.trim(),
          activity: r.activity?.trim(),
          date: isoDate(new Date(monday.getTime() + idx * 86400000)),
          hours: Number(r.hours?.[dayKey] || 0),
        }))
      );
      const filtered = docs.filter(
        (d) => d.client && d.project && d.task && d.activity
      );

      await api.post(`/timesheets/${isoDate(monday)}`, { entries: filtered });

      setMsg("✅ Saved");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
      setMsg("❌ Save failed");
    } finally {
      setLoading(false);
    }
  }

  function addRow() {
    setEntries((prev) => [...prev, defaultRow()]);
  }

  function removeRow(i) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  }

  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabels = dayKeys.map((k, idx) => {
    const d = new Date(monday.getTime() + idx * 24 * 60 * 60 * 1000);
    // create short stacked label (weekday on top, date below)
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" }); // Mon
    const shortDate = d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }); // 25/08
    return `${weekday}\n${shortDate}`;
  });

  /* --- fixed column sizes so table doesn't expand and inputs match header height --- */
  const colSizes = {
    client: "180px",
    project: "120px",
    task: "240px",
    activity: "160px",
    day: "64px", // day column width (compact)
    total: "72px",
    action: "56px",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
        Timesheet App
      </h1>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>

          <div className="text-sm text-gray-700 ml-2">
            {isoDate(monday)} → {isoDate(new Date(monday.getTime() + 6 * 86400000))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            title="Add row"
          >
            <Plus size={16} /> <span className="text-sm font-medium">Add Row</span>
          </button>

          <button
            onClick={save}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-70"
            title="Save"
          >
            <Save size={16} />
            <span className="text-sm font-medium">{loading ? "Saving..." : "Save"}</span>
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              onLogout();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm"
            title="Logout"
          >
            <LogOut size={16} /> <span className="text-sm font-medium">Logout</span>
          </button>

          <div className="text-sm text-indigo-600 ml-2">{msg}</div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
        {/* colgroup to force widths and avoid header stretching table */}
        <table className="w-full table-fixed border-collapse" aria-label="Timesheet table">
          <colgroup>
            <col style={{ width: colSizes.client }} />
            <col style={{ width: colSizes.project }} />
            <col style={{ width: colSizes.task }} />
            <col style={{ width: colSizes.activity }} />
            {Array.from({ length: 7 }).map((_, i) => (
              <col key={i} style={{ width: colSizes.day }} />
            ))}
            <col style={{ width: colSizes.total }} />
            <col style={{ width: colSizes.action }} />
          </colgroup>

          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-3 py-3 text-sm border-b border-gray-200 rounded-tl-lg">Client</th>
              <th className="text-left px-3 py-3 text-sm border-b border-gray-200">Project</th>
              <th className="text-left px-3 py-3 text-sm border-b border-gray-200">Task</th>
              <th className="text-left px-3 py-3 text-sm border-b border-gray-200">Activity</th>

              {/* day headers: stacked text; \n becomes line break via white-space-pre */}
              {dayLabels.map((h, i) => (
                <th
                  key={i}
                  className={`px-2 py-3 text-center text-xs font-medium border-b border-gray-200 whitespace-pre-wrap`}
                  title={h.replace("\n", " ")}
                >
                  <div className="leading-tight" style={{ whiteSpace: "pre-line" }}>
                    {h}
                  </div>
                </th>
              ))}

              <th className="px-2 py-3 text-center text-sm border-b border-gray-200">Total</th>
              <th className="px-2 py-3 text-center text-sm border-b border-gray-200 rounded-tr-lg">Action</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((r, i) => {
              const rowOdd = i % 2 === 1;
              const total = Object.values(r.hours).reduce((a, b) => a + Number(b || 0), 0);
              return (
                <tr key={i} className={`${rowOdd ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
                  {/* Client */}
                  <td className="px-3 py-2 align-middle border-b border-gray-100">
                    <input
                      value={r.client}
                      onChange={(e) => updateField(i, "client", e.target.value)}
                      className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      placeholder="Client"
                    />
                  </td>

                  {/* Project */}
                  <td className="px-3 py-2 align-middle border-b border-gray-100">
                    <input
                      value={r.project}
                      onChange={(e) => updateField(i, "project", e.target.value)}
                      className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      placeholder="Project"
                    />
                  </td>

                  {/* Task */}
                  <td className="px-3 py-2 align-middle border-b border-gray-100">
                    <input
                      value={r.task}
                      onChange={(e) => updateField(i, "task", e.target.value)}
                      className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      placeholder="Task"
                    />
                  </td>

                  {/* Activity */}
                  <td className="px-3 py-2 align-middle border-b border-gray-100">
                    <input
                      value={r.activity}
                      onChange={(e) => updateField(i, "activity", e.target.value)}
                      className="w-full h-10 px-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      placeholder="Activity"
                    />
                  </td>

                  {/* Day inputs (compact, same height as header) */}
                  {dayKeys.map((k) => (
                    <td key={k} className="px-1 py-2 align-middle border-b border-gray-100 text-center">
                      <input
                        type="number"
                        min="0"
                        value={r.hours[k]}
                        onChange={(e) => updateHour(i, k, e.target.value)}
                        className="w-12 h-10 text-sm text-center rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        aria-label={`${k} hours`}
                        style={{ maxWidth: "56px" }}
                      />
                    </td>
                  ))}

                  {/* Total */}
                  <td className="px-2 py-2 align-middle border-b border-gray-100 text-center font-semibold text-indigo-600">
                    {total}
                  </td>

                  {/* Action */}
                  <td className="px-2 py-2 align-middle border-b border-gray-100 text-center">
                    <button
                      onClick={() => removeRow(i)}
                      className="p-1 rounded-md hover:bg-red-50 text-red-600"
                      title="Delete row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-gray-100">
              <td colSpan={4} className="px-3 py-3 text-right font-semibold border-t border-gray-200 rounded-bl-lg">
                Totals:
              </td>

              {dayKeys.map((d, idx) => (
                <td key={d} className="px-2 py-3 text-center font-medium border-t border-gray-200">
                  {entries.reduce((sum, r) => sum + (r.hours[d] || 0), 0)}
                </td>
              ))}

              <td className="px-2 py-3 text-center font-bold text-purple-700 border-t border-gray-200">
                {entries.reduce(
                  (t, r) => t + Object.values(r.hours).reduce((a, b) => a + Number(b || 0), 0),
                  0
                )}
              </td>

              <td className="px-2 py-3 border-t border-gray-200 rounded-br-lg" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
