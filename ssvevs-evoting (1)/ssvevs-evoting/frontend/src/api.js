const BASE = "/api";

async function post(path, body, token) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function get(path) { return (await fetch(BASE + path)).json(); }

export const api = {
  requestOtp: (voterId) => post("/auth/otp/request", { voterId }),
  verifyOtp: (voterId, code, role) => post("/auth/otp/verify", { voterId, code, role }),
  register: (data, token) => post("/voter/register", data, token),
  castVote: (data, token) => post("/vote/cast", data, token),
  stats: () => get("/admin/stats"),
  setPhase: (phase, token) => post("/admin/phase", { phase }, token),
};
