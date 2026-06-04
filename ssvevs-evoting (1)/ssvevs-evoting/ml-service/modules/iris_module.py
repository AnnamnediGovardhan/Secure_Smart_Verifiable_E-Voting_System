"""Iris recognition (NEW feature).

Production: Daugman normalization -> Gabor -> IrisCode -> Hamming distance.
Here we expose the same match() interface with an offline-safe stub.
"""
import base64, hashlib
import numpy as np

_DB = {}
THRESHOLD = 0.65  # IrisCode similarity (1 - normalized Hamming distance)


def _iriscode(image_b64: str) -> np.ndarray:
    raw = base64.b64decode(image_b64.split(",")[-1] or b"AA==")
    h = hashlib.sha256(b"iris" + raw).digest()
    bits = np.unpackbits(np.frombuffer(h, dtype=np.uint8))
    return bits.astype(np.float32)


def register(voter_id, image_b64): _DB[voter_id] = _iriscode(image_b64)


def match(voter_id, image_b64) -> float:
    if voter_id not in _DB:
        return 0.0
    a, b = _DB[voter_id], _iriscode(image_b64)
    return float(1.0 - np.mean(np.abs(a - b)))  # 1 - normalized Hamming
