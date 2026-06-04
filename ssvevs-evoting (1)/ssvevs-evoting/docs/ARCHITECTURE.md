# Architecture

```
                          ┌──────────────────────────────┐
                          │   Frontend (React + Vite)     │
                          │  voter / registrar / admin    │
                          └───────────────┬──────────────┘
                                          │ HTTPS /api (JWT)
                          ┌───────────────▼──────────────┐
                          │   Backend gateway (Node)      │
                          │  OTP · geo · device-fp · JWT  │
                          └───────┬───────────────┬──────┘
                       ethers.js  │               │ HTTP
              ┌───────────────────▼──┐     ┌──────▼───────────────────┐
              │  Blockchain (Solidity)│     │  ML service (FastAPI)     │
              │  permissioned ledger  │     │  face·fingerprint·iris    │
              │  commit + nullifier   │     │  liveness·deepfake·fusion │
              │  encrypted tally      │     │  anomaly detection        │
              └───────────────────────┘     └───────────────────────────┘
```

## Vote lifecycle (privacy-preserving)
1. **Register** — registrar captures biometrics → ML service runs liveness +
   deepfake checks → backend computes `idCommitment = SHA256(NIN|biometric|salt)`
   → contract stores only the commitment (never plaintext identity).
2. **Authenticate to vote** — OTP 2FA → multimodal biometric fusion (face +
   fingerprint + iris) → geo-fence + anomaly screen.
3. **Cast** — backend derives a one-time `nullifier` and a `ballotCommitment`
   (hash of choice + randomness). The contract burns the nullifier (no double
   voting) and updates a homomorphically-combined encrypted tally. The on-chain
   record reveals *that* a vote happened, never *what* it was.
4. **Tally** — authority homomorphically decrypts the accumulators and calls
   `publishTally`. Anyone can audit the public ledger.

## Why these choices map to the requested features
- **ZKP-style commit + nullifier** → privacy + verifiability without revealing ballots.
- **Permissioned roles + batch register** → scalability + controlled access.
- **Homomorphic accumulator** → tally correctness without decrypting individual votes.
- **Liveness + deepfake + anomaly** → anti-spoofing the paper lacked.
- **OTP + geo + device fingerprint** → layered voter verification.
