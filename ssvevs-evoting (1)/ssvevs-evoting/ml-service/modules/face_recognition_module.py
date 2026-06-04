"""Face embedding + matching.

In production load a trained model (FaceNet / ArcFace) and a vector DB.
Here we show the interface with a deterministic OpenCV/Numpy fallback so
the service runs without GPU. Replace `embed` with model inference after
running training/train_face.py.
"""
import base64, hashlib
import numpy as np

_DB = {}  # voter_id -> embedding (replace with FAISS / pgvector in prod)
THRESHOLD = 0.62  # cosine similarity threshold


def _decode(image_b64: str) -> np.ndarray:
    raw = base64.b64decode(image_b64.split(",")[-1] or b"AA==")
    # Deterministic pseudo-embedding so the demo is reproducible offline.
    h = hashlib.sha256(raw).digest()
    vec = np.frombuffer(h, dtype=np.uint8).astype(np.float32)
    return vec / (np.linalg.norm(vec) + 1e-9)


def embed(image_b64: str):
    return _decode(image_b64).tolist()


def register(voter_id: str, image_b64: str):
    _DB[voter_id] = _decode(image_b64)


def match(voter_id: str, image_b64: str) -> float:
    if voter_id not in _DB:
        return 0.0
    a, b = _DB[voter_id], _decode(image_b64)
    return float(np.dot(a, b))
