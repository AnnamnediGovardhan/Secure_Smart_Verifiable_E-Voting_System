# Feature status & roadmap

## Implemented in this scaffold
- ZKP-style commit/reveal with nullifiers (privacy + double-vote prevention)
- Permissioned blockchain roles + gas-optimized contract + batch registration
- Homomorphic-tally interface (additive accumulator hook)
- Multimodal biometric fusion: **face + fingerprint + iris**
- Liveness / anti-spoofing gate
- Deepfake-resistant facial verification hook
- Real-time anomaly / fraud detection (IsolationForest + device-reuse heuristic)
- OTP 2FA, geo-fence, device fingerprinting
- Training scripts + Kaggle dataset guide for real accuracy

## Implemented as interface/stub (swap in trained model or library)
- Face/fingerprint/iris matchers ship deterministic offline stubs so the
  pipeline runs without a GPU. Replace with FaceNet/ArcFace, SOCOFing-trained
  fingerprint, and CASIA IrisCode after training.
- Homomorphic add is a placeholder; wire in `paillier-bigint` for true Paillier.

## Recommended future hardening (NOT done here — be honest in your report)
- **Quantum-safe cryptography** (e.g. lattice-based signatures) for long-term security
- **On-chain zero-knowledge proofs** (zk-SNARKs via circom/snarkjs) instead of hash commitments
- **Federated biometric learning** so raw biometrics never leave the device
- **Explainable AI** for biometric accept/reject decisions
- **Offline secure voting** capability with later reconciliation
- **Lightweight / L2 blockchain** for national-scale throughput
- **Formal verification + professional security audit** of the smart contracts
- **Disaster recovery, redundant servers, failover, cloud backup**
- **Legal/regulatory compliance** (data-protection, electoral law)

## Known limitations (carry these into your analysis)
- Throughput and cost at national scale require an L2 / sidechain.
- Real deployment needs certified hardware and supervised polling.
- Biometric accuracy depends entirely on the trained models you plug in.
