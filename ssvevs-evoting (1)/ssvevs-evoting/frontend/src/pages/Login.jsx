import React, { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [voterId, setVoterId] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("voter");
  const [stage, setStage] = useState("id");
  const [msg, setMsg] = useState("");

  const request = async () => {
    const r = await api.requestOtp(voterId);
    setMsg(r.ok ? "OTP sent — check server console in dev." : r.error);
    if (r.ok) setStage("otp");
  };
  const verify = async () => {
    const r = await api.verifyOtp(voterId, code, role);
    if (r.ok) { onLogin({ token: r.token, role, voterId }); setMsg("Logged in."); }
    else setMsg(r.error);
  };

  return (
    <div style={{ background:"#f8faf9", border:"1px solid #e3eae6", borderRadius:12, padding:20 }}>
      <h3>Login (OTP second factor)</h3>
      <input placeholder="Voter ID / NIN" value={voterId}
        onChange={(e)=>setVoterId(e.target.value)} style={{width:"100%",padding:8,marginBottom:8}} />
      <select value={role} onChange={(e)=>setRole(e.target.value)} style={{padding:8,marginBottom:8}}>
        <option value="voter">voter</option>
        <option value="registrar">registrar</option>
        <option value="authority">authority</option>
      </select>
      {stage === "id"
        ? <button onClick={request}>Send OTP</button>
        : <>
            <input placeholder="6-digit code" value={code}
              onChange={(e)=>setCode(e.target.value)} style={{width:"100%",padding:8,margin:"8px 0"}} />
            <button onClick={verify}>Verify & Login</button>
          </>}
      <p style={{color:"#1a7f4b"}}>{msg}</p>
    </div>
  );
}
