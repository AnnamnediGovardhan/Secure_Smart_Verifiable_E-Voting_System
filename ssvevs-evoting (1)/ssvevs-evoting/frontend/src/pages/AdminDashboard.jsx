import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const PHASES = ["Setup","Registration","Voting","Tallying","Closed"];

export default function AdminDashboard({ session }) {
  const [stats, setStats] = useState(null);
  const refresh = () => api.stats().then(setStats);
  useEffect(() => { refresh(); }, []);

  const setPhase = async (p) => {
    if (!session) return alert("Login as authority first.");
    await api.setPhase(p, session.token); refresh();
  };

  return (
    <div style={{ background:"#f8faf9", border:"1px solid #e3eae6", borderRadius:12, padding:20 }}>
      <h3>Electoral Authority Dashboard</h3>
      {stats && (
        <>
          <p>Registered: <b>{stats.registered}</b> · Cast: <b>{stats.cast}</b></p>
          <p>Candidates: {(stats.candidates||[]).join(", ") || "—"}</p>
        </>
      )}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {PHASES.map((name,i)=>(
          <button key={i} onClick={()=>setPhase(i)}>{name}</button>
        ))}
      </div>
      <button style={{marginTop:12}} onClick={refresh}>Refresh stats</button>
    </div>
  );
}
