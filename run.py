#!/usr/bin/env python3
"""
SSVEVS+  —  single-terminal launcher.

Boots the whole four-tier system from ONE terminal, in the correct order,
without changing any tier's code or the ML models:

    1. Blockchain      :  npx hardhat node            (port 8545)
    2. Deploy contract :  hardhat run deploy.js        -> writes backend/.env
    3. ML service      :  uvicorn app:app              (port 8000)
    4. API gateway     :  node src/server.js           (port 4000)
    5. Frontend        :  vite dev server              (port 5173)

All logs are streamed into this one terminal with coloured [TAG] prefixes.
Press Ctrl+C once to stop every service cleanly.

USAGE
    python run.py                 # boot everything (local chain)
    python run.py --setup         # install all deps first, then boot
    python run.py --check         # verify prerequisites only, don't launch
    python run.py --no-frontend   # run chain + ML + API only (headless)
    python run.py --dev           # uvicorn --reload + node --watch (hot reload)
    python run.py --sepolia       # deploy to Sepolia testnet instead of local
    python run.py --help          # all options

The launcher never edits your source. The ML service is run with a single
warm worker and NO auto-reload by default, so the models load once and keep
full inference performance.
"""

import argparse, os, re, signal, socket, subprocess, sys, threading, time, secrets

IS_WIN = os.name == "nt"
ROOT = os.path.dirname(os.path.abspath(__file__))

# The four tiers that must sit in the same folder as run.py.
TIERS = ["blockchain", "backend", "ml-service", "frontend"]

# Standard first Hardhat dev account (account #0) — funded on the local node.
HARDHAT_KEY0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# ---------------------------------------------------------------- colour
def _enable_win_ansi():
    if not IS_WIN:
        return
    try:
        import ctypes
        k = ctypes.windll.kernel32
        k.SetConsoleMode(k.GetStdHandle(-11), 7)  # ENABLE_VIRTUAL_TERMINAL_PROCESSING
    except Exception:
        pass

COLORS = {"CHAIN":"36","DEPLOY":"35","ML":"32","DEVICE":"95","API":"33","WEB":"34","RUN":"96","ERR":"91"}
USE_COLOR = True
_print_lock = threading.Lock()

def log(tag, msg):
    with _print_lock:
        if USE_COLOR:
            c = COLORS.get(tag, "37")
            print(f"\033[{c}m[{tag:<6}]\033[0m {msg}", flush=True)
        else:
            print(f"[{tag:<6}] {msg}", flush=True)

# ---------------------------------------------------------------- helpers
def which(name):
    from shutil import which as _w
    return _w(name) or _w(name + (".cmd" if IS_WIN else ""))

def port_open(host, port):
    # Vite (and some servers) bind the IPv6 loopback (::1) first on Windows, so a
    # localhost service can be ready even when 127.0.0.1 is not yet listening.
    # Probe both families for loopback to avoid false "timed out" reports.
    targets = [host]
    if host in ("127.0.0.1", "localhost"):
        targets.append("::1")
    for h in targets:
        fam = socket.AF_INET6 if ":" in h else socket.AF_INET
        try:
            with socket.socket(fam, socket.SOCK_STREAM) as s:
                s.settimeout(0.6)
                if s.connect_ex((h, int(port))) == 0:
                    return True
        except OSError:
            pass
    return False

def wait_port(host, port, tag, timeout=180):
    log("RUN", f"waiting for {tag} on {host}:{port} ...")
    end = time.time() + timeout
    while time.time() < end:
        if port_open(host, port):
            log("RUN", f"{tag} is up ({host}:{port}).")
            return True
        time.sleep(0.6)
    log("ERR", f"timed out waiting for {tag} on {host}:{port}.")
    return False

def spawn(cmd, cwd, tag, env=None):
    """Start a long-running child process and pump its output into this terminal."""
    e = dict(os.environ)
    if env:
        e.update(env)
    kw = dict(cwd=cwd, env=e, shell=True, stdout=subprocess.PIPE,
              stderr=subprocess.STDOUT, text=True, bufsize=1)
    if IS_WIN:
        kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    p = subprocess.Popen(cmd, **kw)

    def pump():
        for line in iter(p.stdout.readline, ""):
            if line:
                log(tag, line.rstrip())
        p.stdout.close()
    threading.Thread(target=pump, daemon=True).start()
    return p

def kill(p):
    if p is None or p.poll() is not None:
        return
    try:
        if IS_WIN:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.killpg(os.getpgid(p.pid), signal.SIGTERM)
    except Exception:
        try: p.terminate()
        except Exception: pass

# ---------------------------------------------------------------- .env
def load_env_file(path):
    d = {}
    if os.path.exists(path):
        for ln in open(path, encoding="utf-8"):
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                d[k.strip()] = v.strip()
    return d

def write_backend_env(contract_addr, args):
    """Create/refresh backend/.env so the gateway finds the freshly deployed contract."""
    backend = os.path.join(ROOT, "backend")
    env_path = os.path.join(backend, ".env")
    example = load_env_file(os.path.join(backend, ".env.example"))
    cur = load_env_file(env_path)
    cfg = {**example, **cur}  # keep user values, fall back to example

    cfg["PORT"] = str(args.api_port)
    cfg["RPC_URL"] = args.rpc_url
    cfg["ML_SERVICE_URL"] = f"http://127.0.0.1:{args.ml_port}"
    if contract_addr:
        cfg["CONTRACT_ADDRESS"] = contract_addr
    # registrar key: on the local chain default to Hardhat account #0 if unset/placeholder
    if not args.sepolia:
        rk = cfg.get("REGISTRAR_PRIVATE_KEY", "")
        if (not rk) or rk.startswith("0xLocal") or rk == "":
            cfg["REGISTRAR_PRIVATE_KEY"] = HARDHAT_KEY0
    # fill obvious placeholders with strong random values, once
    if cfg.get("JWT_SECRET", "") in ("", "change_me_in_production", "dev_secret"):
        cfg["JWT_SECRET"] = secrets.token_hex(24)
    if cfg.get("ID_COMMIT_SALT", "") in ("", "replace_with_random_salt", "salt"):
        cfg["ID_COMMIT_SALT"] = secrets.token_hex(16)

    order = ["PORT", "JWT_SECRET", "RPC_URL", "CONTRACT_ADDRESS",
             "REGISTRAR_PRIVATE_KEY", "ML_SERVICE_URL", "ID_COMMIT_SALT"]
    lines = ["# Auto-generated by run.py — safe to edit; CONTRACT_ADDRESS is refreshed each run.\n"]
    for k in order:
        if k in cfg:
            lines.append(f"{k}={cfg[k]}\n")
    for k, v in cfg.items():
        if k not in order:
            lines.append(f"{k}={v}\n")
    open(env_path, "w", encoding="utf-8").writelines(lines)
    log("DEPLOY", f"wrote backend/.env  (CONTRACT_ADDRESS={contract_addr or 'unchanged'})")

# ---------------------------------------------------------------- layout
def resolve_project_root():
    """Make sure run.py is in the project root. If the four tier folders are not
    here but live in a single sub-folder (e.g. the zip extracted nested), adopt
    that sub-folder. Returns True if a valid layout was found."""
    global ROOT
    if all(os.path.isdir(os.path.join(ROOT, t)) for t in TIERS):
        return True
    try:
        for name in sorted(os.listdir(ROOT)):
            cand = os.path.join(ROOT, name)
            if os.path.isdir(cand) and all(os.path.isdir(os.path.join(cand, t)) for t in TIERS):
                ROOT = cand
                log("RUN", f"using project folder: {ROOT}")
                return True
    except Exception:
        pass
    missing = [t for t in TIERS if not os.path.isdir(os.path.join(ROOT, t))]
    log("ERR", "Project files not found next to run.py.")
    log("ERR", f"Current folder: {ROOT}")
    log("ERR", "Missing folder(s): " + ", ".join(missing))
    log("ERR", "-" * 60)
    log("ERR", "run.py must sit INSIDE the 'ssvevs-evoting' folder, beside these folders:")
    log("ERR", "    blockchain\\   backend\\   ml-service\\   frontend\\")
    log("ERR", "Fix: extract the FULL ssvevs-evoting.zip, then run run.py from inside")
    log("ERR", "     the extracted 'ssvevs-evoting' folder (not from a folder with only run.py).")
    return False

# ---------------------------------------------------------------- prereqs
def check_prereqs(args):
    ok = True
    node, npm = which("node"), which("npm")
    py = sys.executable
    log("RUN", f"node : {node or 'NOT FOUND'}")
    log("RUN", f"npm  : {npm or 'NOT FOUND'}")
    log("RUN", f"python: {py}")
    if not node or not npm:
        log("ERR", "Node.js + npm are required. Install the Node.js LTS from https://nodejs.org")
        ok = False
    # uvicorn importable?
    try:
        subprocess.run([py, "-c", "import uvicorn, fastapi"], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log("RUN", "python ML deps (fastapi, uvicorn): OK")
    except Exception:
        log("ERR", "ML deps missing. Run:  python run.py --setup   (or: pip install -r ml-service/requirements.txt)")
        ok = ok and False
    # node_modules present?
    for tier in (["blockchain", "backend"] + ([] if args.no_frontend else ["frontend"])):
        if not os.path.isdir(os.path.join(ROOT, tier, "node_modules")):
            log("ERR", f"{tier}/node_modules missing. Run:  python run.py --setup")
            ok = False
    return ok

def run_setup(args):
    py = sys.executable
    steps = [("blockchain", "npm install"), ("backend", "npm install")]
    if not args.no_frontend:
        steps.append(("frontend", "npm install"))
    for tier, cmd in steps:
        log("RUN", f"installing {tier} deps ...")
        r = subprocess.run(cmd, cwd=os.path.join(ROOT, tier), shell=True)
        if r.returncode != 0:
            log("ERR", f"{tier}: '{cmd}' failed."); return False
    log("RUN", "installing ml-service deps ...")
    r = subprocess.run(f'"{py}" -m pip install --prefer-binary --disable-pip-version-check -r requirements.txt',
                       cwd=os.path.join(ROOT, "ml-service"), shell=True)
    if r.returncode != 0:
        log("ERR", "ml-service pip install failed."); return False
    log("RUN", "setup complete.")
    return True

def deploy_contract(args, env):
    network = "sepolia" if args.sepolia else "localhost"
    log("DEPLOY", f"deploying VotingSystem to {network} ...")
    r = subprocess.run(f"npx hardhat run scripts/deploy.js --network {network}",
                       cwd=os.path.join(ROOT, "blockchain"), shell=True, env=env,
                       capture_output=True, text=True)
    for ln in (r.stdout or "").splitlines() + (r.stderr or "").splitlines():
        if ln.strip():
            log("DEPLOY", ln.rstrip())
    if r.returncode != 0:
        log("ERR", "contract deployment failed.")
        return None
    m = re.search(r"deployed to:\s*(0x[0-9a-fA-F]{40})", r.stdout or "")
    if not m:
        m = re.search(r"(0x[0-9a-fA-F]{40})", r.stdout or "")
    return m.group(1) if m else None

# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Single-terminal launcher for the SSVEVS+ e-voting system.")
    ap.add_argument("--setup", action="store_true", help="install all dependencies before launching")
    ap.add_argument("--check", action="store_true", help="verify prerequisites and exit (no launch)")
    ap.add_argument("--no-frontend", action="store_true", help="run chain + ML + API only (headless)")
    ap.add_argument("--dev", action="store_true", help="enable hot-reload (uvicorn --reload, node --watch)")
    ap.add_argument("--sepolia", action="store_true", help="deploy/use the Sepolia testnet instead of a local chain")
    ap.add_argument("--no-color", action="store_true", help="disable coloured output")
    ap.add_argument("--api-port", default="4000")
    ap.add_argument("--ml-port", default="8000")
    ap.add_argument("--web-port", default="5173")
    ap.add_argument("--chain-port", default="8545")
    ap.add_argument("--device-port", default="8085", help="fingerprint device-agent port")
    ap.add_argument("--no-device", action="store_true", help="do not start the fingerprint device agent")
    ap.add_argument("--ml-workers", default="1", help="uvicorn workers (keep 1 to share warm model state)")
    args = ap.parse_args()

    global USE_COLOR
    USE_COLOR = not args.no_color
    _enable_win_ansi()

    log("RUN", "SSVEVS+  single-terminal launcher")
    log("RUN", "=" * 52)

    if not resolve_project_root():
        sys.exit(1)

    args.rpc_url = (load_env_file(os.path.join(ROOT, "blockchain", ".env")).get("SEPOLIA_RPC_URL", "")
                    if args.sepolia else f"http://127.0.0.1:{args.chain_port}")

    if args.setup and not run_setup(args):
        sys.exit(1)
    if not check_prereqs(args):
        if not args.setup:
            log("ERR", "Prerequisites missing — fix the items above (try: python run.py --setup).")
        sys.exit(1)
    if args.check:
        log("RUN", "All prerequisites satisfied. (--check: not launching.)")
        return

    base_env = dict(os.environ)
    procs = []  # (tag, Popen) in start order

    def shutdown(*_):
        log("RUN", "shutting down all services ...")
        for tag, p in reversed(procs):
            log("RUN", f"stopping {tag} ...")
            kill(p)
        time.sleep(0.6)
        log("RUN", "all services stopped. Bye.")
        os._exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if not IS_WIN:
        signal.signal(signal.SIGTERM, shutdown)

    try:
        # 1) blockchain (skip if --sepolia: assumes a remote RPC)
        if not args.sepolia:
            if port_open("127.0.0.1", args.chain_port):
                log("ERR", f"port {args.chain_port} already in use — is a chain already running? "
                           f"Use --chain-port to change it."); sys.exit(1)
            chain = spawn(f"npx hardhat node --port {args.chain_port}",
                          os.path.join(ROOT, "blockchain"), "CHAIN", base_env)
            procs.append(("CHAIN", chain))
            if not wait_port("127.0.0.1", args.chain_port, "blockchain"):
                shutdown()

        # 2) deploy + write backend/.env
        addr = deploy_contract(args, base_env)
        if not addr and not args.sepolia:
            log("ERR", "no contract address captured — aborting."); shutdown()
        write_backend_env(addr, args)

        # 3) ML service  (no --reload by default => models stay warm = full performance)
        py = sys.executable
        reload_flag = " --reload" if args.dev else ""
        workers = "" if (args.dev or args.ml_workers == "1") else f" --workers {args.ml_workers}"
        ml = spawn(f'"{py}" -m uvicorn app:app --host 127.0.0.1 --port {args.ml_port}{reload_flag}{workers}',
                   os.path.join(ROOT, "ml-service"), "ML", base_env)
        procs.append(("ML", ml))
        if not wait_port("127.0.0.1", args.ml_port, "ML service"):
            shutdown()

        # 3b) fingerprint device agent (external thumb scanner bridge; simulated if no hardware)
        agent = os.path.join(ROOT, "device-agent", "fingerprint_agent.py")
        if not args.no_device and os.path.exists(agent):
            dev = spawn(f'"{py}" "{agent}" --port {args.device_port}',
                        os.path.join(ROOT, "device-agent"), "DEVICE", base_env)
            procs.append(("DEVICE", dev))
            wait_port("127.0.0.1", args.device_port, "fingerprint agent", timeout=60)

        # 4) API gateway
        api_cmd = "node --watch src/server.js" if args.dev else "node src/server.js"
        api = spawn(api_cmd, os.path.join(ROOT, "backend"), "API",
                    {**base_env, "PORT": str(args.api_port)})
        procs.append(("API", api))
        if not wait_port("127.0.0.1", args.api_port, "API gateway"):
            shutdown()

        # 5) frontend
        if not args.no_frontend:
            web = spawn(f"npm run dev -- --port {args.web_port}",
                        os.path.join(ROOT, "frontend"), "WEB", base_env)
            procs.append(("WEB", web))
            wait_port("127.0.0.1", args.web_port, "frontend", timeout=120)

        # banner
        log("RUN", "=" * 52)
        log("RUN", "ALL SERVICES RUNNING — one terminal, Ctrl+C to stop everything")
        if not args.no_frontend:
            log("RUN", f"  Frontend (open this):  http://localhost:{args.web_port}")
        log("RUN", f"  API gateway:           http://localhost:{args.api_port}/health")
        log("RUN", f"  ML service:            http://localhost:{args.ml_port}/docs")
        if not args.no_device and os.path.exists(os.path.join(ROOT, "device-agent", "fingerprint_agent.py")):
            log("RUN", f"  Fingerprint agent:     http://localhost:{args.device_port}/health")
        if not args.sepolia:
            log("RUN", f"  Blockchain RPC:        http://127.0.0.1:{args.chain_port}")
        log("RUN", "=" * 52)

        # 6) supervise — exit if a critical service dies
        while True:
            for tag, p in procs:
                if p.poll() is not None:
                    log("ERR", f"service '{tag}' exited (code {p.returncode}). Stopping the rest.")
                    shutdown()
            time.sleep(1.0)

    except KeyboardInterrupt:
        shutdown()
    except Exception as ex:
        log("ERR", f"launcher error: {ex}")
        shutdown()

if __name__ == "__main__":
    main()
