# Execution Guide

## 0. Prerequisites
- **Node.js 18+** and npm
- **Python 3.10+** and pip
- A code editor; (optional) a GPU machine for training the biometric models
- (Optional) MetaMask + a Sepolia testnet account for public-chain deployment

> The biometric ML modules run **without** a GPU using offline-safe stubs, so you can
> see the full end-to-end flow first, then plug in trained models for real accuracy.

---

## 1. Blockchain (smart contract ledger)

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat test          # runs registration + double-vote-prevention tests
npx hardhat node          # leave running (local chain on :8545)
```

In a second terminal, deploy and copy the printed address:

```bash
cd blockchain
npm run deploy:local
# -> VotingSystem deployed to: 0xABC...   (copy this)
```

For the public Sepolia testnet (matches the paper), put `SEPOLIA_RPC_URL` and
`PRIVATE_KEY` in `blockchain/.env`, then `npm run deploy:sepolia`.

---

## 2. ML biometric service

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
# health check:  curl http://localhost:8000/health
```

### Training the models on real / Kaggle data (do this on a machine with internet + GPU)
See `ml-service/training/datasets.md` for exact Kaggle download commands. Then:

```bash
cd ml-service/training
python train_face.py     --data data/lfw-deepfunneled --out ../models/face.keras
python train_iris.py     --data data/CASIA-Iris        --out ../models/iris_db.npz
python train_deepfake.py --data data/frames            --out ../models/deepfake.keras
```

After training, load each model inside the matching function of the corresponding
module (e.g. in `modules/deepfake_detection.py`, replace the stub with
`model = keras.models.load_model("models/deepfake.keras")`). The function
signatures (`embed`, `match`, `is_live`, `is_deepfake`) stay identical, so nothing
else changes.

---

## 3. Backend API gateway

```bash
cd backend
npm install
cp .env.example .env
# edit .env: set CONTRACT_ADDRESS (from step 1) and REGISTRAR_PRIVATE_KEY
# (use one of the private keys printed by `npx hardhat node`)
npm start
# -> SSVEVS backend listening on http://localhost:4000
```

If `CONTRACT_ADDRESS` / key are left blank, the backend runs in **mock mode**
(everything works except real on-chain writes) — useful for a first demo.

---

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

### Demo walkthrough
1. **Admin tab** → login as `authority` (any NIN, OTP printed in backend console) →
   set phase to **Registration**.
2. **Login tab** → login as `registrar` → **Register tab** → enter a NIN, choose a
   face image → enroll (liveness + deepfake gate runs).
3. **Admin tab** → set phase to **Voting**.
4. **Login tab** → login as `voter` → **Vote tab** → enter the same NIN, attach
   face/fingerprint/iris images, pick a candidate → **Verify & Vote**
   (multimodal fusion + anomaly + geo-fence + on-chain commit run).
5. **Admin tab** → **Refresh stats** to see registered/cast counts.

---

## Troubleshooting
- *Backend can't reach chain*: confirm `npx hardhat node` is running and the address in `.env` is correct.
- *ML calls fail*: confirm `uvicorn` is on port 8000 and `ML_SERVICE_URL` matches.
- *Geo-fence rejects you*: edit the allowed region in `backend/src/services/geo.service.js`.
- *CORS / proxy*: the Vite dev server proxies `/api` to `:4000` (see `vite.config.js`).
