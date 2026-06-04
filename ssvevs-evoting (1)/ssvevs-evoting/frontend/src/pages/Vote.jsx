import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { Icon, Stepper, Banner } from "../components/ui.jsx";
import CameraCapture from "../components/CameraCapture.jsx";
import FingerprintCapture from "../components/FingerprintCapture.jsx";

const STEPS = ["Identify", "Face", "Iris", "Thumb", "Ballot"];

export default function Vote({ session }) {
  const [step, setStep] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState(null);
  const [nin, setNin] = useState(session?.voterId || "");
  const [face, setFace] = useState(null);     // {b64, url}
  const [iris, setIris] = useState(null);
  const [thumb, setThumb] = useState(null);   // {b64, source}
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {ok, txHash, ballotCommitment, error}
  const [startedAt] = useState(Date.now());

  useEffect(() => { api.stats().then((s) => setCandidates(s.candidates || [])).catch(() => {}); }, []);

  const captured = { 1: !!face, 2: !!iris, 3: !!thumb };
  const canNext = useMemo(() => {
    if (step === 0) return nin.trim().length > 0;
    if (step === 1) return !!face;
    if (step === 2) return !!iris;
    if (step === 3) return !!thumb;
    return true;
  }, [step, nin, face, iris, thumb]);

  const cast = async () => {
    if (!session) { setResult({ ok: false, error: "Please sign in as a voter first (Sign in tab)." }); return; }
    if (candidateId == null) { setResult({ ok: false, error: "Select a candidate first." }); return; }
    setBusy(true); setResult(null);
    const geo = await new Promise((res) =>
      navigator.geolocation
        ? navigator.geolocation.getCurrentPosition(
            (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 4000 })
        : res(null));
    try {
      const r = await api.castVote({
        nin, biometricHash: "",
        faceB64: face?.b64, fingerprintB64: thumb?.b64, irisB64: iris?.b64,
        candidateId: Number(candidateId),
        secret: nin + ":" + Date.now(),
        geo, secondsOnPage: (Date.now() - startedAt) / 1000,
      }, session.token);
      setResult(r.ok ? { ok: true, txHash: r.txHash, ballotCommitment: r.ballotCommitment, mock: r.mock }
                     : { ok: false, error: r.error || "rejected" });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally { setBusy(false); }
  };

  // ---- success receipt ----
  if (result?.ok) {
    return (
      <div className="card receipt">
        <div className="receipt-badge"><Icon name="check" size={40} color="#fff" /></div>
        <h2>Vote recorded</h2>
        <p className="muted">Your privacy-preserving ballot is on the ledger. The receipt below proves it was cast,
          without revealing your choice.</p>
        <div className="kv"><span>Candidate</span><b>{candidates[candidateId]}</b></div>
        <div className="kv"><span>Transaction</span><b className="mono">{result.txHash || "(local mock)"}</b></div>
        <div className="kv"><span>Ballot commitment</span><b className="mono">{(result.ballotCommitment || "").slice(0, 26)}…</b></div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }}
          onClick={() => { setResult(null); setStep(0); setFace(null); setIris(null); setThumb(null); setCandidateId(null); }}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="booth">
      <div className="booth-head">
        <div>
          <div className="kicker">Voting Booth</div>
          <h2 className="h-title">Cast your vote</h2>
          <p className="h-sub">Live multimodal verification — face, iris and thumb — then a private, verifiable ballot.</p>
        </div>
        <div className="secure-pill"><Icon name="shield" size={14} /> Liveness · Deepfake · Anomaly · Geo</div>
      </div>

      <Stepper steps={STEPS} current={step} />

      <div className="card booth-body">
        {step === 0 && (
          <div className="pad">
            <label className="field-label">Voter ID / National ID (NIN)</label>
            <input className="field" placeholder="e.g. NIN-10234" value={nin} onChange={(e) => setNin(e.target.value)} />
            <Banner kind="info">Steps 2–4 capture your biometrics live. Make sure you allow camera access when asked.</Banner>
          </div>
        )}

        {step === 1 && (
          <div className="pad">
            <h3 className="cap-title"><Icon name="camera" size={18} /> Face capture</h3>
            <CameraCapture mode="face" onCapture={(b64, url) => setFace({ b64, url })} />
          </div>
        )}

        {step === 2 && (
          <div className="pad">
            <h3 className="cap-title"><Icon name="eye" size={18} /> Iris capture</h3>
            <CameraCapture mode="iris" onCapture={(b64, url) => setIris({ b64, url })} />
          </div>
        )}

        {step === 3 && (
          <div className="pad">
            <h3 className="cap-title"><Icon name="finger" size={18} /> Thumb impression (external scanner)</h3>
            <FingerprintCapture onCapture={(b64, source) => setThumb({ b64, source })} />
          </div>
        )}

        {step === 4 && (
          <div className="pad">
            <h3 className="cap-title"><Icon name="vote" size={18} /> Choose your candidate</h3>
            <div className="candidate-grid">
              {candidates.map((c, i) => (
                <button key={i} className={"candidate-card" + (candidateId === i ? " selected" : "")}
                  onClick={() => setCandidateId(i)}>
                  <span className="cc-mark">{candidateId === i ? <Icon name="check" size={16} color="#fff" /> : i + 1}</span>
                  <span className="cc-name">{c}</span>
                </button>
              ))}
            </div>

            <div className="review">
              <div className="review-item"><Icon name="user" size={15} /><span>Voter</span><b>{nin || "—"}</b></div>
              <div className="review-item"><Icon name="camera" size={15} /><span>Face</span><b className={face ? "ok" : "no"}>{face ? "captured" : "missing"}</b></div>
              <div className="review-item"><Icon name="eye" size={15} /><span>Iris</span><b className={iris ? "ok" : "no"}>{iris ? "captured" : "missing"}</b></div>
              <div className="review-item"><Icon name="finger" size={15} /><span>Thumb</span><b className={thumb ? "ok" : "no"}>{thumb ? `captured (${thumb.source})` : "missing"}</b></div>
            </div>

            {result && !result.ok && <Banner kind="bad">{result.error}</Banner>}

            <button className="btn btn-gold btn-block" disabled={busy || candidateId == null}
              onClick={cast}>
              {busy ? "Verifying & casting…" : <><Icon name="lock" size={16} /> Verify &amp; cast vote</>}
            </button>
          </div>
        )}
      </div>

      {/* captured thumbnails strip */}
      <div className="cap-strip">
        {[["Face", face?.url, "camera"], ["Iris", iris?.url, "eye"], ["Thumb", thumb ? `data:image/png;base64,${thumb.b64}` : null, "finger"]]
          .map(([lab, url, ic], i) => (
          <div key={i} className={"cap-tile" + (url ? " filled" : "")}>
            {url ? <img src={url} alt={lab} /> : <Icon name={ic} size={22} color="#9fb2b9" />}
            <span>{lab}</span>
          </div>
        ))}
      </div>

      {/* nav */}
      <div className="booth-nav">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        {step < 4
          ? <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Next <Icon name="check" size={14} />
            </button>
          : <span className="muted" style={{ alignSelf: "center" }}>Review and cast above ↑</span>}
      </div>
    </div>
  );
}
