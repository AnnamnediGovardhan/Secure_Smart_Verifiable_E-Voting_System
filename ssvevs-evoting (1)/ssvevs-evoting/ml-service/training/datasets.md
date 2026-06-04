# Datasets for training (Kaggle + public)

> Network is required and is done **on your own machine** (this build environment has no internet).
> Use the Kaggle API: `pip install kaggle`, put `kaggle.json` in `~/.kaggle/`, then run the commands below.

## 1. Face recognition
- **LFW (Labeled Faces in the Wild)** — `kaggle datasets download -d jessicali9530/lfw-dataset`
- **VGGFace2 / CelebA** for larger training — `kaggle datasets download -d jessicali9530/celeba-dataset`
- Model: FaceNet / ArcFace → 128-d or 512-d embeddings.

## 2. Iris recognition (NEW)
- **CASIA Iris** mirror — search Kaggle "CASIA iris" (e.g. `kaggle datasets download -d <owner>/casia-iris`)
- **MMU Iris** — small, good for prototyping.
- Pipeline: Daugman segmentation → normalization → Gabor → IrisCode → Hamming distance.

## 3. Liveness / anti-spoofing (NEW)
- **CASIA-FASD**, **Replay-Attack**, or **NUAA** — search Kaggle "face anti spoofing".
- Train a binary CNN (live vs spoof) or use MediaPipe blink + LBP texture.

## 4. Deepfake detection (NEW)
- **DFDC (Deepfake Detection Challenge)** — `kaggle competitions download -c deepfake-detection-challenge`
- **FaceForensics++** (request access).
- Model: XceptionNet / EfficientNet-B0 fine-tuned for real-vs-fake.

## 5. Fingerprint
- **SOCOFing** — `kaggle datasets download -d ruizgara/socofing`
- Minutiae extraction or a learned descriptor.

## After training
Save models to `ml-service/models/` and load them inside the matching stub of each
module (`face_recognition_module.py`, `iris_module.py`, `deepfake_detection.py`, ...).
The service interfaces (`embed`, `match`, `is_live`, `is_deepfake`) stay the same.
