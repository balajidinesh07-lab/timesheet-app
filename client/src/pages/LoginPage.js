// client/src/pages/LoginPage.js
import React, { useState } from "react";
import api from "../api/axios";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user } = res.data;
      if (!token) throw new Error("No token returned");
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user || {}));
      onLogin(token);
    } catch (error) {
      console.error(error);
      setErr(error.response?.data?.error || error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 16, background: "#fff", borderRadius: 8 }}>
      <h2 style={{ textAlign: "center" }}>Sign in</h2>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label><br />
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%" }} required />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label><br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%" }} required />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading} style={{ flex: 1 }}>{loading ? "Signing in..." : "Sign in"}</button>
          <button type="button" onClick={() => {
            // helpful dev shortcut: show credential hint
            alert('Use POST /auth/register to create a user. Or use existing account.');
          }}>Help</button>
        </div>
        {err && <p style={{ color: "crimson", marginTop: 8 }}>{err}</p>}
      </form>
    
    </div>
  );
}
