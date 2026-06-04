"""Real-time anomaly / fraud detection (NEW feature).

Production: IsolationForest / autoencoder trained on session telemetry
(time-on-page, geo, device fingerprint reuse, IP velocity). Flags bots,
ballot stuffing and impersonation attempts in real time.
"""
from sklearn.ensemble import IsolationForest
import numpy as np

# Pre-fit on synthetic "normal" sessions so it runs offline. Re-fit on real logs.
_rng = np.random.default_rng(0)
_normal = np.column_stack([
    _rng.normal(120, 30, 500),   # seconds_on_page
    _rng.normal(9.0, 0.5, 500),  # geo_lat cluster
    _rng.normal(7.0, 0.5, 500),  # geo_lng cluster
])
_model = IsolationForest(contamination=0.05, random_state=0).fit(_normal)
_device_seen = {}


def score_session(s: dict):
    feats = np.array([[s["seconds_on_page"], s["geo_lat"], s["geo_lng"]]])
    raw = _model.decision_function(feats)[0]
    suspicious = raw < 0

    # Device fingerprint reuse heuristic (ballot stuffing signal)
    df = s.get("device_fingerprint", "")
    _device_seen[df] = _device_seen.get(df, 0) + 1
    if _device_seen[df] > 1:
        suspicious = True

    return bool(suspicious), round(float(-raw), 4)
