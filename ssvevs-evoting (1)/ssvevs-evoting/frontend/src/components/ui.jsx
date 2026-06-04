import React from "react";

export const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    shield: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
    camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    finger: <><path d="M12 11v5" /><path d="M8 13c0-2 1.8-4 4-4s4 2 4 4v2" /><path d="M5 12a7 7 0 0 1 14 0v3" /><path d="M9 17c0 1.5.5 3 .5 3" /><path d="M15 16c0 2-1 4-1 4" /></>,
    check: <path d="M20 6L9 17l-5-5" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
    vote: <><path d="M9 12l2 2 4-4" /><rect x="3" y="4" width="18" height="16" rx="2" /></>,
    cube: <><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></>,
    lock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    pin: <><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></>,
    gauge: <><path d="M12 14l4-4" /><path d="M3 12a9 9 0 0 1 18 0" /></>,
  };
  return <svg {...p} aria-hidden="true">{paths[name] || paths.shield}</svg>;
};

export const Banner = ({ kind = "info", children }) =>
  children ? <div className={`banner ${kind}`}><Icon name={kind === "ok" ? "check" : kind === "bad" ? "shield" : "gauge"} size={16} /><span>{children}</span></div> : null;

export const Stepper = ({ steps, current }) => (
  <div className="stepper">
    {steps.map((s, i) => (
      <div key={i} className={`step ${i === current ? "active" : ""} ${i < current ? "done" : ""}`}>
        <span className="dot">{i < current ? "✓" : i + 1}</span>{s}
      </div>
    ))}
  </div>
);

export const Stat = ({ num, lab }) => (
  <div className="stat"><div className="num">{num}</div><div className="lab">{lab}</div></div>
);
