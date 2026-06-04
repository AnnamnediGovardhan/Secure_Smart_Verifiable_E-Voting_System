"""Fingerprint matching (minutiae / SIFT style).

Replace with an FPM10A template comparison or a learned descriptor.
The interface mirrors the paper's Gabor + minutiae pipeline.
"""
import base64, hashlib
import numpy as np

_DB = {}
THRESHOLD = 0.60


def _template(image_b64: str) -> np.ndarray:
    raw = base64.b64decode(image_b64.split(",")[-1] or b"AA==")
    h = hashlib.sha256(b"fp" + raw).digest()
    v = np.frombuffer(h, dtype=np.uint8).astype(np.float32)
    return v / (np.linalg.norm(v) + 1e-9)


def register(voter_id, image_b64): _DB[voter_id] = _template(image_b64)


def match(voter_id, image_b64) -> float:
    if voter_id not in _DB:
        return 0.0
    return float(np.dot(_DB[voter_id], _template(image_b64)))
