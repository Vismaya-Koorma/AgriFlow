import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from PIL import Image, ImageDraw

# Set seeds for reproducibility
np.random.seed(42)
tf.random.set_seed(42)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_SAVE_PATH = os.path.join(MODEL_DIR, "crop_disease_mobilenetv2.keras")
DATASET_DIR = os.path.join(MODEL_DIR, "plantvillage_dataset")

# PlantVillage Crop Disease Classes
DISEASE_CLASSES = [
    "Tomato___Healthy",
    "Tomato___Early_Blight",
    "Tomato___Late_Blight",
    "Tomato___Leaf_Mold",
    "Rice___Healthy",
    "Rice___Brown_Spot",
    "Rice___Bacterial_Blight",
    "Potato___Healthy",
    "Potato___Early_Blight",
    "Potato___Late_Blight",
    "Corn___Healthy",
    "Corn___Common_Rust",
    "Apple___Healthy",
    "Apple___Black_Rot"
]

NUM_CLASSES = len(DISEASE_CLASSES)
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 5


def generate_synthetic_plantvillage_dataset():
    """
    Generates a structured PlantVillage crop leaf dataset for training & evaluation.
    Creates sample images for each crop disease class if local dataset folder doesn't exist.
    """
    print(f"[1/4] Preparing PlantVillage dataset structure at: {DATASET_DIR}")
    os.makedirs(DATASET_DIR, exist_ok=True)

    for class_name in DISEASE_CLASSES:
        class_dir = os.path.join(DATASET_DIR, class_name)
        os.makedirs(class_dir, exist_ok=True)

        # Ensure at least 30 synthetic images per class for training/eval
        existing_imgs = [f for f in os.listdir(class_dir) if f.endswith('.jpg') or f.endswith('.png')]
        if len(existing_imgs) < 30:
            for i in range(30 - len(existing_imgs)):
                img = Image.new('RGB', IMG_SIZE, color=(
                    np.random.randint(40, 100),
                    np.random.randint(100, 200),
                    np.random.randint(40, 100)
                ))
                draw = ImageDraw.Draw(img)
                # Draw unique texture/spots depending on disease type
                if "Healthy" in class_name:
                    draw.ellipse([60, 60, 160, 160], fill=(50, 180, 50))
                elif "Blight" in class_name or "Spot" in class_name or "Rot" in class_name:
                    draw.ellipse([60, 60, 160, 160], fill=(60, 150, 60))
                    for _ in range(8):
                        x = np.random.randint(70, 150)
                        y = np.random.randint(70, 150)
                        draw.ellipse([x, y, x + 15, y + 15], fill=(80, 40, 20))
                elif "Rust" in class_name or "Mold" in class_name:
                    draw.ellipse([60, 60, 160, 160], fill=(70, 160, 60))
                    for _ in range(12):
                        x = np.random.randint(70, 150)
                        y = np.random.randint(70, 150)
                        draw.ellipse([x, y, x + 10, y + 10], fill=(200, 120, 30))

                img.save(os.path.join(class_dir, f"sample_{i+1}.jpg"))


def build_mobilenetv2_model():
    """
    Constructs Transfer Learning Model using pre-trained MobileNetV2 backbone.
    """
    print("[2/4] Initializing MobileNetV2 CNN Transfer Learning Model...")
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3)
    )
    base_model.trainable = False  # Freeze pre-trained ImageNet backbone

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    predictions = Dense(NUM_CLASSES, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def train_and_evaluate():
    """
    Trains MobileNetV2 on dataset and evaluates Accuracy, Precision, Recall, F1-Score, Confusion Matrix.
    """
    generate_synthetic_plantvillage_dataset()

    # Load dataset using Keras ImageDataGenerator
    datagen = tf.keras.preprocessing.image.ImageDataGenerator(
        rescale=1.0 / 255.0,
        validation_split=0.2,
        rotation_range=20,
        zoom_range=0.15,
        horizontal_flip=True
    )

    train_gen = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        shuffle=True
    )

    val_gen = datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        shuffle=False
    )

    model = build_mobilenetv2_model()

    print(f"[3/4] Training MobileNetV2 Model for {EPOCHS} epochs...")
    model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
        verbose=1
    )

    # Save trained Keras model
    print(f"Saving trained model to: {MODEL_SAVE_PATH}")
    model.save(MODEL_SAVE_PATH)

    # Save class indices mapping
    class_indices_path = os.path.join(MODEL_DIR, "crop_disease_classes.json")
    import json
    with open(class_indices_path, "w") as f:
        json.dump(train_gen.class_indices, f, indent=2)

    # Evaluate Model on Validation Set
    print("\n[4/4] Evaluating Model Metrics (Accuracy, Precision, Recall, F1-Score)...")
    val_gen.reset()
    y_pred_probs = model.predict(val_gen)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = val_gen.classes

    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
    cm = confusion_matrix(y_true, y_pred)

    print("=" * 60)
    print("      MOBILENETV2 CROP DISEASE MODEL EVALUATION RESULTS     ")
    print("=" * 60)
    print(f"Accuracy : {acc * 100:.2f}%")
    print(f"Precision: {precision * 100:.2f}%")
    print(f"Recall   : {recall * 100:.2f}%")
    print(f"F1-Score : {f1 * 100:.2f}%")
    print("\nConfusion Matrix:")
    print(cm)
    print("\nDetailed Classification Report:")
    target_names = list(train_gen.class_indices.keys())
    print(classification_report(y_true, y_pred, target_names=target_names, zero_division=0))
    print("=" * 60)

    # Save evaluation summary to text file
    metrics_path = os.path.join(MODEL_DIR, "model_evaluation_report.txt")
    with open(metrics_path, "w") as f:
        f.write(f"Accuracy: {acc * 100:.2f}%\n")
        f.write(f"Precision: {precision * 100:.2f}%\n")
        f.write(f"Recall: {recall * 100:.2f}%\n")
        f.write(f"F1-Score: {f1 * 100:.2f}%\n\n")
        f.write("Confusion Matrix:\n")
        f.write(np.array2string(cm) + "\n\n")
        f.write("Classification Report:\n")
        f.write(classification_report(y_true, y_pred, target_names=target_names, zero_division=0))

    return acc, precision, recall, f1


if __name__ == "__main__":
    train_and_evaluate()
