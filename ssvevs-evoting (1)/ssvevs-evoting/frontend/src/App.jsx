import React, { useState } from "react";
import Vote from "./pages/Vote.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Login from "./pages/Login.jsx";
import { Icon } from "./components/ui.jsx";

const TABS = [
  ["vote", "Vote", "vote"],
  ["register", "Register", "user"],
  ["admin", "Admin", "gauge"],
  ["login", "Sign in", "lock"],
];

export default function App() {
  const [tab, setTab] = useState("vote");
  const [session, setSession] = useState(null); // {token, role, voterId}

  return (
    <>
      <header className="app-header">
        <div className="wrap">
          <div className="brand">
            <div className="logo"><Icon name="cube" size={22} color="#fff" /></div>
            <div>
              <h1>SSVEVS+</h1>
              <small>Secure · Smart · Verifiable E-Voting</small>
            </div>
          </div>
          <nav className="nav">
            {TABS.map(([id, label, ic]) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                <span style={{ display: "inline-flex", verticalAlign: "-3px", marginRight: 6 }}>
                  <Icon name={ic} size={15} />
                </span>{label}
              </button>
            ))}
          </nav>
          {session && <span className="session-chip">{session.voterId} · {session.role}</span>}
        </div>
      </header>

      <main className="container">
        {tab === "vote" && <Vote session={session} />}
        {tab === "register" && <Register session={session} goLogin={() => setTab("login")} />}
        {tab === "admin" && <AdminDashboard session={session} goLogin={() => setTab("login")} />}
        {tab === "login" && <Login onLogin={(s) => { setSession(s); setTab(s.role === "voter" ? "vote" : s.role === "authority" ? "admin" : "register"); }} />}
        <div className="footer-note">
          SSVEVS+ prototype · trimodal biometrics + privacy-preserving blockchain ledger · for research/demo use
        </div>
      </main>
    </>
  );
}
