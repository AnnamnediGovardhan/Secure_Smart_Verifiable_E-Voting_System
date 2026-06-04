import React, { useState } from "react";
import { api } from "../api.js";
import { Icon, Banner } from "../components/ui.jsx";
import CameraCapture from "../components/CameraCapture.jsx";
import FingerprintCapture from "../components/FingerprintCapture.jsx";

export default function Register({ session, goLogin }) {
  const [nin, setNin] = useState("");
  const [face, setFace] = useState(null);   // {b64, url} (required, liveness+deepfake gated)
  const [iris, setIris] = useState(null);   // optional
  const [thumb, setThumb] = useState(null); // optional
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);     // {ok, idCommitment, error}

  const enroll = async () => {
    if (!session) return setRes({ ok: false, error: "Sign in as a registrar first." });
    if (!nin.trim()) return setRes({ ok: false, error: "Enter the voter's National ID." });
    if (!face) return setRes({ ok: false, error: "Capture the voter's face (it passes the liveness + deepfake gate)." });
    setBusy(true); setRes(null);
    try {
      const r = await api.register({ nin, faceImageB64: face.b64, biometricHash: "" }, session.token);
      setRes(r.ok ? { ok: true, idCommitment: r.idCommitment, mock: r.mock }
                  : { ok: false, error: r.error || "registration failed" });
    } catch (e) { setRes({ ok: false, error: e.message }); }
    finally { setBusy(false); }
  };

  if (res?.ok) {
    return (
      <div className="card receipt">
        <div className="receipt-badge"><Icon name="check" size={40} color="#fff" /></div>
        <h2>Voter enrolled</h2>
        <p className="muted">Only a one-way identity commitment is written on-chain — never the raw biometric or ID.</p>
        <div className="kv"><span>NIN</span><b>{nin}</b></div>
        <div className="kv"><span>Identity commitment</span><b className="mono">{(res.idCommitment || "").slice(0, 30)}…</b></div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }}
          onClick={() => { setRes(null); setNin(""); setFace(null); setIris(null); setThumb(null); }}>
          Enroll another voter
        </button>
      </div>
    );
  }

  return (
    <div className="booth">
      <div className="booth-head">
        <div>
          <div className="kicker">Registrar</div>
          <h2 className="h-title">Voter registration</h2>
          <p className="h-sub">Live face enrolment with a liveness &amp; deepfake gate. Iris and thumb are optional extra templates.</p>
        </div>
        <div className="secure-pill"><Icon name="shield" size={14} /> Liveness · Deepfake gate</div>
      </div>

      {!session && <Banner kind="bad">You must sign in as a <b>registrar</b> to enrol voters. {goLogin && <a onClick={goLogin} style={{ cursor: "pointer", textDecoration: "underline" }}>Sign in</a>}</Banner>}

      <div className="card pad">
        <label className="field-label">National ID (NIN)</label>
        <input className="field" placeholder="e.g. NIN-10234" value={nin} onChange={(e) => setNin(e.target.value)} />

        <div className="enroll-grid">
          <div className="enroll-col">
            <h3 className="cap-title"><Icon name="camera" size={16} /> Face <em>required</em></h3>
            <CameraCapture mode="face" onCapture={(b64, url) => setFace({ b64, url })} />
          </div>
          <div className="enroll-col">
            <h3 className="cap-title"><Icon name="eye" size={16} /> Iris <em>optional</em></h3>
            <CameraCapture mode="iris" onCapture={(b64, url) => setIris({ b64, url })} />
          </div>
          <div className="enroll-col">
            <h3 className="cap-title"><Icon name="finger" size={16} /> Thumb <em>optional</em></h3>
            <FingerprintCapture onCapture={(b64, source) => setThumb({ b64, source })} />
          </div>
        </div>

        {res && !res.ok && <Banner kind="bad">{res.error}</Banner>}

        <button className="btn btn-gold btn-block" disabled={busy || !session} onClick={enroll}>
          {busy ? "Enrolling…" : <><Icon name="user" size={16} /> Enroll voter</>}
        </button>
      </div>
    </div>
  );
}
