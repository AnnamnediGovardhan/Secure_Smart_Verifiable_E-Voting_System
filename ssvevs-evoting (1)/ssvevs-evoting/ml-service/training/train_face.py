"""
Train / fine-tune a face embedding model on Kaggle LFW or CelebA.
Run on a machine WITH internet + GPU (this sandbox has neither).

    pip install tensorflow scikit-learn
    kaggle datasets download -d jessicali9530/lfw-dataset -p data/ --unzip
    python train_face.py --data data/lfw-deepfunneled --out ../models/face.keras
"""
import argparse, os


def build_model(embedding_dim=128):
    import tensorflow as tf
    base = tf.keras.applications.MobileNetV2(
        include_top=False, weights="imagenet", input_shape=(160, 160, 3), pooling="avg"
    )
    x = tf.keras.layers.Dense(embedding_dim)(base.output)
    x = tf.keras.layers.Lambda(lambda t: tf.math.l2_normalize(t, axis=1))(x)
    return tf.keras.Model(base.input, x)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="../models/face.keras")
    ap.add_argument("--epochs", type=int, default=10)
    args = ap.parse_args()

    import tensorflow as tf
    ds = tf.keras.utils.image_dataset_from_directory(
        args.data, image_size=(160, 160), batch_size=32
    )
    n_classes = len(ds.class_names)
    emb = build_model()
    clf = tf.keras.Sequential([emb, tf.keras.layers.Dense(n_classes, activation="softmax")])
    clf.compile("adam", "sparse_categorical_crossentropy", metrics=["accuracy"])
    clf.fit(ds.map(lambda x, y: (x / 255.0, y)), epochs=args.epochs)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    emb.save(args.out)  # save the embedding head for inference
    print("Saved embedding model to", args.out)


if __name__ == "__main__":
    main()
