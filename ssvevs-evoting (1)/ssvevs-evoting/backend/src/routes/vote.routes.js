import { Router } from "express";
import { verifyMultimodal, anomalyCheck } from "../services/biometric.service.js";
import { getContract, readEncryptedTally } from "../services/blockchain.service.js";
import { makeNullifier, ballotCommitment, homomorphicAdd, idCommitment } from "../utils/crypto.js";
import { withinAllowedRegion } from "../services/geo.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { deviceFingerprint } from "../middleware/deviceFingerprint.middleware.js";
import { config } from "../config.js";

const r = Router();

r.post("/cast", requireAuth("voter"), deviceFingerprint, async (req, res) => {
  try {
    const { nin, biometricHash, faceB64, fingerprintB64, irisB64,
            candidateId, secret, geo, secondsOnPage } = req.body;

    // 1) Geo-fence (NEW)
    if (geo && !withinAllowedRegion(geo.lat, geo.lng))
      return res.status(403).json({ error: "outside_allowed_region" });

    // 2) Anomaly / fraud screen (NEW)
    const anomaly = await anomalyCheck({
      voter_id: nin, ip: req.ip, device_fingerprint: req.deviceFingerprint,
      seconds_on_page: secondsOnPage || 0, geo_lat: geo?.lat || 0, geo_lng: geo?.lng || 0,
    });
    if (anomaly.suspicious)
      return res.status(403).json({ error: "session_flagged", anomaly });

    // 3) Multimodal biometric verification (face+fingerprint+iris fusion, NEW)
    const bio = await verifyMultimodal({
      voter_id: nin, face_b64: faceB64, fingerprint_b64: fingerprintB64, iris_b64: irisB64,
    });
    if (!bio.ok) return res.status(401).json({ error: "biometric_failed", bio });

    // 4) Privacy-preserving on-chain cast (ZKP-style commit + nullifier)
    const commit = idCommitment(nin, biometricHash, config.idCommitSalt);
    const nullifier = makeNullifier(secret);
    const { commitment } = ballotCommitment(candidateId);
    const prev = await readEncryptedTally(candidateId);
    const nextTally = homomorphicAdd(prev, candidateId);

    const c = getContract();
    let txHash = null;
    if (c) {
      const tx = await c.castVote(commit, nullifier, commitment, candidateId, nextTally);
      const rec = await tx.wait();
      txHash = rec.hash;
    }
    res.json({ ok: true, txHash, ballotCommitment: commitment, mock: !c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
