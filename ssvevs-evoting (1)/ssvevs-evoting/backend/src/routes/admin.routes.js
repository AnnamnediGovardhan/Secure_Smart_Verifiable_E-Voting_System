import { Router } from "express";
import { getContract } from "../services/blockchain.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const r = Router();

r.post("/phase", requireAuth("authority"), async (req, res) => {
  const { phase } = req.body; // 0..4
  const c = getContract();
  if (!c) return res.json({ ok: true, mock: true });
  const tx = await c.setPhase(phase);
  await tx.wait();
  res.json({ ok: true });
});

r.get("/stats", async (_req, res) => {
  const c = getContract();
  if (!c) return res.json({ registered: 0, cast: 0, mock: true });
  const [registered, cast, count] = await Promise.all([
    c.registeredCount(), c.castCount(), c.candidateCount(),
  ]);
  const candidates = [];
  for (let i = 0; i < Number(count); i++) candidates.push(await c.getCandidate(i));
  res.json({ registered: Number(registered), cast: Number(cast), candidates });
});

export default r;
