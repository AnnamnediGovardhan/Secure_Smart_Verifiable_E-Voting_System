"""Deepfake-resistant facial verification (NEW feature).

Production: XceptionNet / EfficientNet trained on FaceForensics++ or the
Kaggle Deepfake Detection Challenge (DFDC). Returns True if the frame looks
synthetic. Stub returns False (genuine) but is the single hook to swap in
the trained model from training/train_deepfake.py.
"""
import base64


def is_deepfake(image_b64: str) -> bool:
    try:
        base64.b64decode(image_b64.split(",")[-1])
    except Exception:
        return True  # undecodable => reject
    # TODO: load model = keras.models.load_model("models/deepfake.keras")
    #       return model.predict(preprocess(frame))[0][0] > 0.5
    return False
