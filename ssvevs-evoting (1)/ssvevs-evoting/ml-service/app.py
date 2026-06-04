"""
SSVEVS Biometric ML microservice (FastAPI).

Exposes the multimodal pipeline that the Node backend calls during
registration and voting. Extends the base paper with:
  - iris recognition
  - liveness / anti-spoofing (blink + texture)
  - deepfake-resistant facial verification
  - multimodal fusion (face + fingerprint + iris)
  - anomaly / fraud detection on voting behaviour

Run:  uvicorn app:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI
from pydantic import BaseModel
from modules import (
    face_recognition_module as face,
    fingerprint_module as fp,
    iris_module as iris,
    liveness_detection as live,
    deepfake_detection as deep,
    fusion,
    anomaly_detection as anomaly,
)

app = FastAPI(title="SSVEVS Biometric Service", version="1.0.0")


class ImagePayload(BaseModel):
    image_b64: str            # base64-encoded image from the frontend / Pi camera


class VerifyPayload(BaseModel):
    face_b64: str | None = None
    fingerprint_b64: str | None = None
    iris_b64: str | None = None
    voter_id: str


class BehaviourPayload(BaseModel):
    voter_id: str
    ip: str
    device_fingerprint: str
    seconds_on_page: float
    geo_lat: float
    geo_lng: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/enroll/face")
def enroll_face(p: ImagePayload):
    """Liveness + deepfake gate, then store the 128-d face embedding."""
    if not live.is_live(p.image_b64):
        return {"ok": False, "reason": "liveness_failed"}
    if deep.is_deepfake(p.image_b64):
        return {"ok": False, "reason": "deepfake_detected"}
    emb = face.embed(p.image_b64)
    return {"ok": True, "embedding": emb}


@app.post("/verify")
def verify(p: VerifyPayload):
    """Multimodal fusion verification used at the voting booth."""
    scores = {}
    if p.face_b64:
        if not live.is_live(p.face_b64):
            return {"ok": False, "reason": "liveness_failed"}
        if deep.is_deepfake(p.face_b64):
            return {"ok": False, "reason": "deepfake_detected"}
        scores["face"] = face.match(p.voter_id, p.face_b64)
    if p.fingerprint_b64:
        scores["fingerprint"] = fp.match(p.voter_id, p.fingerprint_b64)
    if p.iris_b64:
        scores["iris"] = iris.match(p.voter_id, p.iris_b64)

    fused, decision = fusion.fuse(scores)
    return {"ok": decision, "fused_score": fused, "modality_scores": scores}


@app.post("/anomaly/check")
def anomaly_check(p: BehaviourPayload):
    """Real-time fraud / intrusion signal for one voting session."""
    flag, score = anomaly.score_session(p.dict())
    return {"suspicious": flag, "anomaly_score": score}
