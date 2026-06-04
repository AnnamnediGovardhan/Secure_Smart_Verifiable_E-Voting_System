# Running SSVEVS+ from a single terminal

The whole four-tier system (blockchain, ML service, API gateway, frontend) now
starts from **one command in one terminal**. The launcher (`run.py`) only
*orchestrates* the existing folders — it does not merge or modify any tier's
source code, and it runs the ML models exactly as written, so model accuracy and
efficiency are unchanged.

## One-time setup (installs all dependencies)

```
python run.py --setup
```

This runs `npm install` in `blockchain/`, `backend/`, `frontend/`, and
`pip install -r requirements.txt` in `ml-service/`. You only need it once
(or whenever dependencies change).

> Windows: double-click **`run.bat`** or run `run.bat --setup`.
> macOS/Linux: `./run.sh --setup`.
> You can also use `npm run setup`.

## Start everything

```
python run.py
```

Equivalent shortcuts: `run.bat` (Windows), `./run.sh` (mac/Linux), or `npm start`.

The launcher then, in order:

1. starts the **Hardhat blockchain** and waits for port `8545`;
2. **deploys** `VotingSystem.sol` and writes the address into `backend/.env`
   automatically (also fills a local registrar key, JWT secret and salt);
3. starts the **ML service** (`uvicorn`) and waits for port `8000`;
4. starts the **API gateway** (`node`) and waits for port `4000`;
5. starts the **frontend** (Vite) on port `5173`.

All logs stream into the same terminal with coloured tags
`[CHAIN] [DEPLOY] [ML] [API] [WEB]`. When you see the banner, open:

```
http://localhost:5173
```

Press **Ctrl+C once** to stop every service cleanly.

## Useful flags

| Command | What it does |
|---|---|
| `python run.py --setup` | install all deps, then boot |
| `python run.py --check` | verify prerequisites only (no launch) |
| `python run.py --no-frontend` | run chain + ML + API only (headless / API testing) |
| `python run.py --dev` | hot-reload mode (`uvicorn --reload`, `node --watch`) |
| `python run.py --sepolia` | deploy/use the public Sepolia testnet instead of a local chain |
| `python run.py --api-port 4100 --ml-port 8100 --web-port 5200` | change ports |
| `python run.py --no-color` | plain (uncoloured) logs |

## Notes on model performance

- By default the ML service runs **without `--reload`** and with **one worker**,
  so the models load once and stay warm — this gives full inference performance.
  Use `--dev` only while editing Python code.
- The four tiers still run as separate processes (clean separation of concerns);
  "single terminal" means one command and one supervised log stream, not one
  merged process. This keeps the architecture and the models intact.
- To enable the heavier trained models, install the optional DL deps listed in
  `ml-service/requirements.txt` (TensorFlow / PyTorch) on a GPU machine and set
  the `USE_TORCH` flag as documented there; the launcher passes your environment
  straight through.

## Prerequisites

- **Node.js LTS** (includes `npm` / `npx`) — https://nodejs.org
- **Python 3.10+**
- First run needs internet to download npm/pip packages; after that it runs offline
  against the local chain.

## Troubleshooting

- *"port 8545 already in use"* — a chain is already running; close it or use
  `--chain-port 8546`.
- *"ML deps missing"* / *"node_modules missing"* — run `python run.py --setup`.
- *"npm not recognized"* (Windows) — install Node.js LTS and reopen the terminal.
