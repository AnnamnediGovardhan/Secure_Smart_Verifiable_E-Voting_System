import { Router } from "express";
import { enrollFace } from "../services/biometric.service.js";
import { getContract } from "../services/blockchain.service.js";
import { idCommitment } from "../utils/crypto.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const r = Router();

// Registrar enrolls a voter: biometric gate (liveness + deepfake) then on-chain commitment.
r.post("/register", requireAuth("registrar"), async (req, res) => {
  try {
    const { nin, faceImageB64, biometricHash } = req.body;
    if (!nin || !faceImageB64) return res.status(400).json({ error: "nin and face required" });

    const faceResult = await enrollFace(faceImageB64);
    if (!faceResult.ok) return res.status(422).json({ error: faceResult.reason });

    const commit = idCommitment(nin, biometricHash || faceResult.embedding?.slice(0, 8).join(""), config.idCommitSalt);
    const c = getContract();
    if (c) {
      const tx = await c.register(commit);
      await tx.wait();
    }
    res.json({ ok: true, idCommitment: commit, mock: !c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
