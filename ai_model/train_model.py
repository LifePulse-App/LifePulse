import os
import numpy as np
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.optimizers import Adam

def build_model(num_classes):
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    base_model.trainable = False  # Freeze the base layers

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    outputs = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=outputs)
    return model

def train_model(path_name):
    dataset_path = os.path.join("datasets", path_name)
    if not os.path.exists(dataset_path):
        print(f"[❌] Dataset folder {dataset_path} does not exist.")
        return None

    print("[INFO] Preparing image data...")
    image_size = (224, 224)
    batch_size = 32

    print("[INFO] Creating data generators...")
    datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,
        validation_split=0.2,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.1,
        horizontal_flip=True
    )

    try:
        train_generator = datagen.flow_from_directory(
            dataset_path,
            target_size=image_size,
            batch_size=batch_size,
            class_mode='sparse',
            subset='training',
            shuffle=True
        )
        validation_generator = datagen.flow_from_directory(
            dataset_path,
            target_size=image_size,
            batch_size=batch_size,
            class_mode='sparse',
            subset='validation',
            shuffle=False
        )
    except Exception as e:
        print(f"[❌] Data generator failed: {str(e)}")
        return None

    if train_generator.samples == 0:
        print("[❌] No training images found")
        return None

    num_classes = len(train_generator.class_indices)
    print(f"[INFO] Detected {num_classes} classes: {train_generator.class_indices}")

    print("[INFO] Building model with MobileNetV2 backbone...")
    model = build_model(num_classes)
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

    early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)

    print("[INFO] Training model...")
    model.fit(
        train_generator,
        validation_data=validation_generator,
        epochs=5,
        callbacks=[early_stop]
    )

    model_path = os.path.join("models", f"{path_name}_mobilenetv2.keras")
    os.makedirs(os.path.dirname(model_path), exist_ok=True)

    try:
        model.save(model_path)
        print(f"[✔] Model saved to {model_path}")

        # Verification step
        test_model = load_model(model_path, compile=False)
        test_input = np.ones((1, 224, 224, 3), dtype=np.float32)
        _ = test_model.predict(test_input)
        print("[✔] Model verification successful")
        return model
    except Exception as e:
        print(f"[❌] Model saving failed: {str(e)}")
        return None

if __name__ == "__main__":
    path_name = "acad_to_concordia"  # 👈 change to your dataset folder name
    trained_model = train_model(path_name)
    if trained_model is None:
        print("[❌] Training failed")
