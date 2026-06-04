"""Liveness / anti-spoofing (NEW feature).

Real version: MediaPipe blink ratio + texture (LBP) + frequency analysis,
or a trained CNN on the CASIA-FASD / Replay-Attack datasets.
This stub blocks obviously empty/flat inputs and is the integration point.
"""
import base64
import numpy as np


def is_live(image_b64: str) -> bool:
    try:
        raw = base64.b64decode(image_b64.split(",")[-1])
    except Exception:
        return False
    if len(raw) < 256:        # too small => likely not a real capture
        return False
    arr = np.frombuffer(raw, dtype=np.uint8).astype(np.float32)
    # Real captures have texture variance; flat printouts/screens often don't.
    return float(np.std(arr)) > 5.0
