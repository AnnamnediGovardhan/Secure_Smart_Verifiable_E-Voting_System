import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./ui.jsx";

/**
 * Live webcam capture.
 *  props:
 *   mode      "face" | "iris"   (changes the on-screen alignment guide)
 *   onCapture (base64, dataUrl) => void   base64 is RAW (no data: prefix)
 *
 * Works on http://localhost (a secure context), so no HTTPS is needed locally.
 * Real iris recognition uses a near-infrared sensor; in this demo the webcam
 * captures a visible-light eye image as a stand-in for the same pipeline.
 */
export default function CameraCapture({ mode = "face", onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [on, setOn] = useState(false);
  const [shot, setShot] = useState(null);
  const [err, setErr] = useState("");

  const stop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setOn(false);
  };
  useEffect(() => stop, []); // cleanup on unmount

  const start = async () => {
    setErr(""); setShot(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("This browser does not expose a camera API. Use Chrome/Edge on http://localhost."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setOn(true);
    } catch (e) {
      setErr(e.name === "NotAllowedError"
        ? "Camera permission denied — click the camera icon in the address bar and allow access."
        : "Could not open the camera: " + e.message);
    }
  };

  const capture = () => {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1];
    setShot(dataUrl); stop();
    onCapture && onCapture(base64, dataUrl);
  };

  const retake = () => { setShot(null); start(); };

  // Fallback for machines without a webcam: load an image file instead.
  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result);
      const base64 = dataUrl.split(",")[1];
      stop(); setShot(dataUrl);
      onCapture && onCapture(base64, dataUrl);
    };
    r.readAsDataURL(f);
  };

  const guide = mode === "iris" ? "circle" : "oval";
  const hint = mode === "iris" ? "Align ONE eye inside the ring" : "Center your face in the oval";

  return (
    <div>
      <div className="capture-stage">
        {shot
          ? <img src={shot} alt="capture" />
          : <video ref={videoRef} playsInline muted />}
        {!shot && on && (
          <div className="guide"><div className={guide} /><div className="hint">{hint}</div></div>
        )}
        {!shot && !on && (
          <div className="guide"><div className="hint" style={{ position: "static" }}>Camera is off</div></div>
        )}
      </div>

      <div className="capture-actions">
        {!on && !shot && (
          <>
            <button className="btn btn-primary" onClick={start}>
              <Icon name={mode === "iris" ? "eye" : "camera"} size={16} /> Open camera
            </button>
            <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
              Use a photo instead
              <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            </label>
          </>
        )}
        {on && !shot && (
          <>
            <button className="btn btn-gold" onClick={capture}><Icon name="check" size={16} /> Capture</button>
            <button className="btn btn-ghost" onClick={stop}>Cancel</button>
          </>
        )}
        {shot && (
          <button className="btn btn-ghost" onClick={retake}><Icon name="refresh" size={16} /> Retake</button>
        )}
      </div>
      {err && <div className="banner bad" style={{ marginTop: 12 }}><Icon name="shield" size={16} /><span>{err}</span></div>}
    </div>
  );
}
