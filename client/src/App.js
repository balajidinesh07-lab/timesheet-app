// client/src/App.js
import React, { useEffect, useState } from "react";
import LoginPage from "./pages/LoginPage";
import TimesheetDashboard from "./pages/TimesheetDashboard";
import "./index.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    // if user clears token in console we update the UI
    const onStorage = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Timesheet App</h1>
      {!token ? <LoginPage onLogin={(t) => setToken(t)} /> : <TimesheetDashboard onLogout={() => setToken(null)} />}
    </div>
  );
}

export default App;
