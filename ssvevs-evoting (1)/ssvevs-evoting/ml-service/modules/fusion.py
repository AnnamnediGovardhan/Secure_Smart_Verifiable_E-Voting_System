"""Multimodal score-level fusion (NEW feature).

Weighted sum of face/fingerprint/iris scores. Weights reflect reliability
and can be tuned per the paper's usability table.
"""
WEIGHTS = {"face": 0.4, "fingerprint": 0.3, "iris": 0.3}
DECISION_THRESHOLD = 0.6


def fuse(scores: dict):
    if not scores:
        return 0.0, False
    total_w = sum(WEIGHTS[m] for m in scores)
    fused = sum(scores[m] * WEIGHTS[m] for m in scores) / (total_w + 1e-9)
    return round(fused, 4), fused >= DECISION_THRESHOLD
