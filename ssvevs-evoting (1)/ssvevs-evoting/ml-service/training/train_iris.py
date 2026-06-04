"""
Train an iris matcher on CASIA / MMU iris datasets.
Classic pipeline (no GPU needed): segment -> normalize -> Gabor -> IrisCode.

    pip install opencv-python numpy
    python train_iris.py --data data/CASIA-Iris --out ../models/iris_db.npz
Stores a {label: iriscode} gallery for Hamming-distance matching.
"""
import argparse, os, glob
import numpy as np
import cv2


def iris_code(path):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    img = cv2.resize(img, (64, 512))                  # pseudo-normalized strip
    g = cv2.getGaborKernel((21, 21), 3.5, 0, 0.11, 0.5)
    resp = cv2.filter2D(img.astype(np.float32), cv2.CV_32F, g)
    return (resp > 0).astype(np.uint8).flatten()      # IrisCode bits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="../models/iris_db.npz")
    args = ap.parse_args()

    gallery = {}
    for path in glob.glob(os.path.join(args.data, "**", "*.*"), recursive=True):
        if path.lower().endswith((".jpg", ".png", ".bmp")):
            code = iris_code(path)
            if code is not None:
                gallery[os.path.basename(os.path.dirname(path))] = code
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    np.savez_compressed(args.out, **gallery)
    print(f"Saved {len(gallery)} iris codes to {args.out}")


if __name__ == "__main__":
    main()
