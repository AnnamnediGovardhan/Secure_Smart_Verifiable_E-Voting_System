import React, { useState } from "react";
import { Icon } from "./ui.jsx";

/**
 * Thumb / fingerprint capture from an EXTERNAL device.
 *
 * Browsers cannot read a raw optical/USB fingerprint scanner directly, so a
 * tiny local "device agent" (device-agent/fingerprint_agent.py) talks to the
 * scanner and exposes it over localhost. Vite proxies /device -> the agent.
 *
 *  - "Scan thumb"  : asks the agent to capture from the connected sensor
 *                    (the agent simulates a capture if no hardware is present).
 *  - "Upload"      : fallback — load a fingerprint image file.
 *
 * onCapture(base64, source) — base64 is RAW (no data: prefix).
 */
export default function FingerprintCapture({ onCapture }) {
  const [status, setStatus] = useState("idle"); // idle | scanning | done | error
  const [info, setInfo] = useState(null);        // {quality, source}
  const [err, setErr] = useState("");

  const scan = async () => {
    setErr(""); setStatus("scanning");
    try {
      const res = await fetch("/device/fingerprint/capture", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      if (!res.ok) throw new Error("agent returned " + res.status);
      const d = await res.json();
      const b64 = d.image_b64 || d.template_b64;
      if (!d.ok || !b64) throw new Error(d.error || "no capture returned");
      setInfo({ quality: d.quality, source: d.source });
      setStatus("done");
      onCapture && onCapture(b64, d.source || "device");
    } catch (e) {
      setStatus("error");
      setErr("Fingerprint device agent not reachable (" + e.message +
             "). Start it with the launcher, or use Upload below.");
    }
  };

  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const b64 = String(r.result).split(",")[1];
      setInfo({ quality: "—", source: "upload" }); setStatus("done");
      onCapture && onCapture(b64, "upload");
    };
    r.readAsDataURL(f);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 120, height: 120, margin: "0 auto 6px", borderRadius: 18,
        background: status === "done" ? "var(--okbg)" : "var(--c1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: status === "scanning" ? "3px solid var(--gold)" : "3px solid transparent" }}>
        <Icon name="finger" size={56}
          color={status === "done" ? "var(--ok)" : status === "scanning" ? "var(--gold)" : "var(--teal)"} />
      </div>

      <div style={{ marginBottom: 10 }}>
        {status === "idle" && <span className="badge pending">Place thumb on the scanner</span>}
        {status === "scanning" && <span className="badge scan">Scanning… hold still</span>}
        {status === "done" && <span className="badge ok"><Icon name="check" size={13} /> Captured
          {info?.source ? ` (${info.source}${info.quality && info.quality !== "—" ? `, q=${info.quality}` : ""})` : ""}</span>}
        {status === "error" && <span className="badge scan">Device not found</span>}
      </div>

      <div className="capture-actions">
        <button className="btn btn-primary" onClick={scan} disabled={status === "scanning"}>
          <Icon name="finger" size={16} /> {status === "done" ? "Re-scan thumb" : "Scan thumb"}
        </button>
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          Upload image
          <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        </label>
      </div>
      {err && <div className="banner warn" style={{ marginTop: 12, textAlign: "left" }}>
        <Icon name="finger" size={16} /><span>{err}</span></div>}
    </div>
  );
}
