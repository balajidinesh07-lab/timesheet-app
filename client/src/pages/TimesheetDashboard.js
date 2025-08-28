// client/src/pages/TimesheetDashboard.js
import React, { useEffect, useState } from "react";
import api from "../api/axios";

function getMonday(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
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
  hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
});

export default function TimesheetDashboard({ onLogout }) {
  const [monday, setMonday] = useState(getMonday(new Date()));
  const [entries, setEntries] = useState([defaultRow()]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchSheet();
    // eslint-disable-next-line
  }, [monday]);

  // === FETCH WEEK DATA ===
  async function fetchSheet() {
    setLoading(true);
    try {
      const res = await api.get(`/timesheets/${isoDate(monday)}`);
      if (res.data && res.data.entries && res.data.entries.length) {
        const grouped = {};
        res.data.entries.forEach(e => {
          const key = `${e.client}|${e.project}|${e.task}|${e.activity}`;
          if (!grouped[key]) {
            grouped[key] = {
              client: e.client,
              project: e.project,
              task: e.task,
              activity: e.activity,
              hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }
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

  // === NAVIGATION ===
  function changeWeek(offsetWeeks) {
    const next = new Date(monday);
    next.setDate(next.getDate() + offsetWeeks * 7);
    setMonday(getMonday(next));
  }

  // === EDIT ROWS ===
  function updateField(i, field, value) {
    setEntries(prev =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  }

  function updateHour(i, dayKey, value) {
    setEntries(prev =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const hours = { ...r.hours, [dayKey]: Number(value || 0) };
        return { ...r, hours };
      })
    );
  }

  // === SAVE DATA ===
  async function save() {
    setLoading(true);
    try {
      const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
      const payload = {
        entries: entries.flatMap(r =>
          dayKeys.map((dayKey, idx) => ({
            client: r.client,
            project: r.project,
            task: r.task,
            activity: r.activity,
            date: isoDate(new Date(monday.getTime() + idx * 86400000)),
            hours: Number(r.hours[dayKey] || 0)
          }))
        )
      };

      await api.post(`/timesheets/${isoDate(monday)}`, payload);
      setMsg("Saved ✓");
      setTimeout(() => setMsg(""), 1600);
    } catch (err) {
      console.error("Save error:", err.response?.data || err.message);
      setMsg("Save failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  // === ADD/REMOVE ROWS ===
  function addRow() {
    setEntries(prev => [...prev, defaultRow()]);
  }

  function removeRow(i) {
    setEntries(prev => prev.filter((_, idx) => idx !== i));
  }
  

  const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const dayLabels = dayKeys.map((k, idx) => {
    const d = new Date(monday.getTime() + idx * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "2-digit",
      day: "2-digit"
    });
  });
  async function save() {
  setLoading(true);
  try {
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    // Build the flat array of docs
    const docs = entries.flatMap(r =>
      dayKeys.map((dayKey, idx) => ({
        client: r.client?.trim(),
        project: r.project?.trim(),
        task: r.task?.trim(),
        activity: r.activity?.trim(),
        date: isoDate(new Date(monday.getTime() + idx * 86400000)),
        hours: Number(r.hours[dayKey] || 0)
      }))
    );

    // (Optional) filter out rows with no metadata or all zeros
    const filtered = docs.filter(d =>
      d.client && d.project && d.task && d.activity
      // keep zeros if they're valid in your schema; otherwise enforce d.hours > 0
    );

    await api.post(`/timesheets/${isoDate(monday)}`, filtered);
    setMsg("Saved ✓");
    setTimeout(() => setMsg(""), 1600);
  } catch (err) {
    console.error("Save error:", err.response?.data || err.message);
    setMsg("Save failed: " + (err.response?.data?.error || err.message));
  } finally {
    setLoading(false);
  }
}


  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => changeWeek(-1)}>⏪</button>
          <button onClick={() => changeWeek(1)}>⏩</button>
          <strong style={{ marginLeft: 12 }}>
            {isoDate(monday)} →{" "}
            {isoDate(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000))}
          </strong>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addRow}>+ Row</button>
          <button onClick={save} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              onLogout();
            }}
          >
            Logout
          </button>
          <span style={{ marginLeft: 8 }}>{msg}</span>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#e9eefc" }}>
            <th style={th}>Client</th>
            <th style={th}>Project</th>
            <th style={th}>Task</th>
            <th style={th}>Activity</th>
            {dayLabels.map((h, i) => (
              <th key={i} style={th}>
                {h}
              </th>
            ))}
            <th style={th}>Total</th>
            <th style={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((r, i) => {
            const total = Object.values(r.hours).reduce(
              (a, b) => a + Number(b || 0),
              0
            );
            return (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={td}>
                  <input
                    value={r.client}
                    onChange={e => updateField(i, "client", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    value={r.project}
                    onChange={e => updateField(i, "project", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    value={r.task}
                    onChange={e => updateField(i, "task", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    value={r.activity}
                    onChange={e => updateField(i, "activity", e.target.value)}
                  />
                </td>

                {dayKeys.map(k => (
                  <td style={td} key={k}>
                    <input
                      type="number"
                      min="0"
                      value={r.hours[k]}
                      onChange={e => updateHour(i, k, e.target.value)}
                      style={{ width: 64 }}
                    />
                  </td>
                ))}

                <td style={td}>{total}</td>
                <td style={td}>
                  <button onClick={() => removeRow(i)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


const th = { padding: 8, border: "1px solid #cfcfcf", textAlign: "left" };
const td = { padding: 6, border: "1px solid #eee" };
