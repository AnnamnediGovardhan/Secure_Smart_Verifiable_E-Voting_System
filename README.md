# SSVEVS — Secure Smart Verifiable E-Voting System (Extended)

An extension of the IEEE Access paper *"Blockchain Integration With Multimodal
Biometric Authentication System for Secure Smart Verifiable Electronic Voting System"*
(Ajao et al., 2025). This repository keeps the paper's core (Ethereum blockchain,
homomorphic encryption, face + fingerprint biometrics, CNN matching, RFID,
Proof-of-Stake) and adds the requested new capabilities.

## What's new vs. the paper

| Area | Added feature | Where |
|------|---------------|-------|
| Biometrics | **Iris recognition**, **multimodal fusion** (face+fingerprint+iris) | `ml-service/modules/iris_module.py`, `fusion.py` |
| AI security | **Liveness / anti-spoofing**, **deepfake detection**, **anomaly/fraud detection** | `ml-service/modules/liveness_detection.py`, `deepfake_detection.py`, `anomaly_detection.py` |
| Blockchain | **ZKP-style commit + nullifier** (privacy + no double vote), **permissioned roles**, **batch registration**, **gas optimization** | `blockchain/contracts/VotingSystem.sol` |
| Voter verification | **OTP 2FA**, **geo-fence**, **device fingerprinting** | `backend/src/services/otp.service.js`, `geo.service.js`, `middleware/deviceFingerprint.middleware.js` |

## Folder layout

```
ssvevs-evoting/
├── blockchain/    Solidity smart contracts (Hardhat) — the decentralized ledger
├── backend/       Node.js + Express API gateway (ethers.js, JWT, OTP, geo)
├── ml-service/    Python + FastAPI biometric AI service (+ Kaggle training scripts)
├── frontend/      React + Vite voter & admin UI
└── docs/          Architecture, execution guide, feature notes
```

## Quick start (4 terminals)

```bash
# 1) Blockchain
cd blockchain && npm install && npx hardhat node          # terminal 1
cd blockchain && npm run deploy:local                     # terminal 2 (copy the address)

# 2) ML service
cd ml-service && pip install -r requirements.txt
uvicorn app:app --port 8000                               # terminal 3

# 3) Backend  (paste CONTRACT_ADDRESS + a hardhat key into backend/.env)
cd backend && npm install && cp .env.example .env && npm start   # terminal 4

# 4) Frontend
cd frontend && npm install && npm run dev                 # opens http://localhost:5173
```

Full step-by-step (including training on Kaggle data) is in
[`docs/EXECUTION_GUIDE.md`](docs/EXECUTION_GUIDE.md).

## Honest scope note

This is a **research/university-grade prototype scaffold**, not a certified
national election system. The biometric modules ship with offline-safe stubs so
the whole pipeline runs without a GPU; swap in the trained models
(`ml-service/training/`) for real accuracy. See `docs/FEATURES.md` for the
remaining hardening needed before any real deployment (audits, formal
verification, quantum-safe crypto, legal compliance).
