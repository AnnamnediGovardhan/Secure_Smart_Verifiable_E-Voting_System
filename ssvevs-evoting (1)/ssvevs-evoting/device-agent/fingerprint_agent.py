#!/usr/bin/env python3
"""
SSVEVS+  Fingerprint Device Agent
=================================
Browsers cannot read a raw USB/optical fingerprint scanner, so this small local
service does it and exposes the capture over localhost. The frontend calls it
through Vite's /device proxy:  POST /device/fingerprint/capture

Modes
-----
* SIMULATION (default): generates a synthetic fingerprint image so the whole
  flow works with NO hardware attached. Good for demos and development.
* REAL DEVICE: pass --real and wire your scanner inside read_real_fingerprint().
  A ready-to-edit hook for common serial scanners (R307 / ZFM-20 / FPM10A on a
  USB-TTL adapter or Arduino bridge) is provided.

Run
---
    python fingerprint_agent.py                 # simulation, port 8085
    python fingerprint_agent.py --real --serial COM3 --baud 57600
"""
import argparse, base64, hashlib, io, os, time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

try:
    import numpy as np
    import cv2
    _HAVE_CV = True
except Exception:
    _HAVE_CV = False

app = FastAPI(title="SSVEVS+ Fingerprint Device Agent", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ARGS = argparse.Namespace(real=False, serial="COM3", baud=57600)


class CaptureReq(BaseModel):
    mode: str = "auto"          # "auto" | "simulate" | "device"
    voter_id: str | None = None


def _b64_png(img) -> str:
    ok, buf = cv2.imencode(".png", img)
    return base64.b64encode(buf.tobytes()).decode("ascii")


def make_synthetic_fingerprint(seed_text: str = "") -> tuple[str, int]:
    """Create a believable synthetic ridge pattern -> (base64_png, quality)."""
    seed = int(hashlib.sha256((seed_text or str(time.time())).encode()).hexdigest(), 16) % (2**32)
    if not _HAVE_CV:
        # 1x1 transparent PNG fallback if opencv/numpy are unavailable
        tiny = ("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC")
        return tiny, 40
    rng = np.random.default_rng(seed)
    h = w = 320
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2 + rng.uniform(-30, 30), h / 2 + rng.uniform(-30, 30)
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    theta = np.arctan2(yy - cy, xx - cx)
    ridges = np.sin(r / (3.0 + rng.uniform(0, 1.2)) + 2.2 * theta + rng.uniform(0, 6.28))
    img = ((ridges * 0.5 + 0.5) * 255).astype(np.uint8)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    img = cv2.equalizeHist(img)
    # oval mask so it looks like a fingertip
    mask = (((xx - w / 2) / (w * 0.42)) ** 2 + ((yy - h / 2) / (h * 0.46)) ** 2) <= 1.0
    out = np.full((h, w), 255, np.uint8)
    out[mask] = img[mask]
    quality = int(60 + rng.uniform(0, 35))
    return _b64_png(out), quality


def read_real_fingerprint() -> tuple[str, int]:
    """
    HOOK FOR REAL HARDWARE.
    Wire your scanner here and return (base64_png_image, quality).

    Example for a serial R307 / ZFM-20 / FPM10A sensor (USB-TTL or Arduino bridge):

        import serial                       # pip install pyserial
        from pyfingerprint.pyfingerprint import PyFingerprint   # pip install pyfingerprint
        f = PyFingerprint(ARGS.serial, ARGS.baud, 0xFFFFFFFF, 0x00000000)
        f.verifyPassword()
        while not f.readImage():
            time.sleep(0.1)
        f.downloadImage('/tmp/fp.bmp')      # library writes the captured image
        img = cv2.imread('/tmp/fp.bmp', cv2.IMREAD_GRAYSCALE)
        return _b64_png(img), 90

    Until you enable the block above, we fall back to a synthetic capture so the
    application keeps working.
    """
    # TODO: implement your sensor here, then `return _b64_png(img), quality`
    return make_synthetic_fingerprint("real-device-fallback")


@app.get("/health")
def health():
    return {"status": "ok", "mode": "device" if ARGS.real else "simulation",
            "opencv": _HAVE_CV, "serial": ARGS.serial if ARGS.real else None}


@app.post("/fingerprint/capture")
def capture(req: CaptureReq):
    use_device = ARGS.real and req.mode != "simulate"
    try:
        if use_device:
            b64, q = read_real_fingerprint()
            source = "device"
        else:
            b64, q = make_synthetic_fingerprint(req.voter_id or "")
            source = "simulated"
        # a compact "template" hash stands in for a minutiae template
        template = hashlib.sha256(b64.encode()).hexdigest()
        return {"ok": True, "image_b64": b64, "template_b64": template,
                "quality": q, "source": source}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def main():
    global ARGS
    ap = argparse.ArgumentParser(description="SSVEVS+ fingerprint device agent")
    ap.add_argument("--port", type=int, default=8085)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--real", action="store_true", help="read from a real serial scanner (see read_real_fingerprint)")
    ap.add_argument("--serial", default="COM3", help="serial port of the scanner (e.g. COM3 or /dev/ttyUSB0)")
    ap.add_argument("--baud", type=int, default=57600)
    ARGS = ap.parse_args()
    print(f"[fingerprint-agent] mode={'DEVICE' if ARGS.real else 'SIMULATION'} "
          f"listening on http://{ARGS.host}:{ARGS.port}")
    uvicorn.run(app, host=ARGS.host, port=ARGS.port, log_level="warning")


if __name__ == "__main__":
    main()
