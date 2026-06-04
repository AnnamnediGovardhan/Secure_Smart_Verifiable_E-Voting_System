"""
Train a deepfake detector (real vs fake) on DFDC / FaceForensics++ frames.
Run on a GPU machine with internet.

    kaggle competitions download -c deepfake-detection-challenge -p data/
    python train_deepfake.py --data data/frames --out ../models/deepfake.keras
Folder layout: data/frames/real/*.jpg  data/frames/fake/*.jpg
"""
import argparse, os


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="../models/deepfake.keras")
    ap.add_argument("--epochs", type=int, default=8)
    args = ap.parse_args()

    import tensorflow as tf
    train = tf.keras.utils.image_dataset_from_directory(
        args.data, image_size=(224, 224), batch_size=32, label_mode="binary",
        validation_split=0.2, subset="training", seed=42)
    val = tf.keras.utils.image_dataset_from_directory(
        args.data, image_size=(224, 224), batch_size=32, label_mode="binary",
        validation_split=0.2, subset="validation", seed=42)

    base = tf.keras.applications.EfficientNetB0(include_top=False, weights="imagenet",
                                                input_shape=(224, 224, 3), pooling="avg")
    out = tf.keras.layers.Dense(1, activation="sigmoid")(base.output)
    model = tf.keras.Model(base.input, out)
    model.compile("adam", "binary_crossentropy", metrics=["accuracy", tf.keras.metrics.AUC()])
    model.fit(train, validation_data=val, epochs=args.epochs)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    model.save(args.out)
    print("Saved deepfake detector to", args.out)


if __name__ == "__main__":
    main()
