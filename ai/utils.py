import os
import numpy as np
import cv2
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.layers import Input
from picamera2 import Picamera2
import RPi.GPIO as GPIO
import time

# Ultrasonic sensor GPIO pins
TRIG = 23  # You can change to your actual pin
ECHO = 24  # You can change to your actual pin

GPIO.setmode(GPIO.BCM)
GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)

def get_distance():
    GPIO.output(TRIG, False)
    time.sleep(0.05)

    GPIO.output(TRIG, True)
    time.sleep(0.00001)
    GPIO.output(TRIG, False)

    while GPIO.input(ECHO) == 0:
        pulse_start = time.time()

    while GPIO.input(ECHO) == 1:
        pulse_end = time.time()

    pulse_duration = pulse_end - pulse_start
    distance = pulse_duration * 17150
    distance = round(distance, 2)
    return distance


# Load the trained model and build the feature extractor
def load_feature_extractor(path_name):
    model_path = os.path.join("models", f"{path_name}_mobilenetv2.keras")

    if not os.path.exists(model_path):
        print(f"[â] Model not found at: {os.path.abspath(model_path)}")
        return None

    try:
        print(f"[â¹] Loading model from: {model_path}")
        model = load_model(model_path, compile=False)

        # Extract intermediate feature layer
        feature_model = Model(inputs=model.input, outputs=model.get_layer('global_average_pooling2d').output)
        print("[â] Feature extractor ready")
        return feature_model

    except Exception as e:
        print(f"[â] Model loading failed: {str(e)}")
        return None

# Normalize a vector to unit length
def l2_normalize(vec):
    norm = np.linalg.norm(vec)
    if norm > 0:
        return vec / norm
    return vec

# Extract features from a single frame (with normalization)
def extract_frame_features(feature_model, frame):
    try:
        if frame is None or frame.size == 0:
            raise ValueError("Invalid frame")

        # Preprocess
        frame = cv2.resize(frame, (224, 224))
        if len(frame.shape) == 2:
            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)
        else:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        frame = frame.astype('float32') / 255.0
        frame = np.expand_dims(frame, axis=0)

        # Extract and normalize features
        features = feature_model.predict(frame, verbose=0).flatten()
        features = l2_normalize(features)

        # Verify normalization
        debug_norm = np.linalg.norm(features)
        assert np.isclose(debug_norm, 1.0), f"Normalization failed: norm={debug_norm}"

        return features

    except Exception as e:
        print(f"[â] Feature extraction failed: {str(e)}")
        return None

# Compute cosine dissimilarity (1 - cosine similarity)
def calculate_similarity(f1, f2):
    try:
        cosine_similarity = np.dot(f1, f2)
        return 1 - cosine_similarity  # Dissimilarity
    except Exception as e:
        print(f"[â] Similarity error: {str(e)}")
        return 1.0

# Load one reference frame from each class and compute its feature
def load_class_reference_features(feature_model, dataset_folder="datasets"):
    """
    Loads all frames from each class folder and extracts features using the given model.
    Returns a dictionary mapping (pathname, class_name, filename) -> feature_vector.
    """
    class_features = {}

    for pathname in sorted(os.listdir(dataset_folder)):
        pathname_path = os.path.join(dataset_folder, pathname)
        if not os.path.isdir(pathname_path):
            continue

        for class_name in sorted(os.listdir(pathname_path)):
            class_path = os.path.join(pathname_path, class_name)
            if not os.path.isdir(class_path):
                continue

            for file in sorted(os.listdir(class_path)):
                if not file.lower().endswith(".jpg"):
                    continue

                frame_path = os.path.join(class_path, file)
                frame = cv2.imread(frame_path)

                features = extract_frame_features(feature_model, frame)
                if features is not None:
                    class_features[(pathname, class_name, file)] = features
                    print(f"[â] Feature extracted for: {pathname}/{class_name}/{file}")

    print(f"[â] Total extracted features: {len(class_features)}")
    return class_features

# Main navigation function with strict order matching
def start_navigation(path_name):
    print(f"[INFO] Starting frame-wise matching for class_0 using model: {path_name}")
    model = load_feature_extractor(path_name)
    if model is None:
        print("[â] Exiting due to model load failure")
        return

    reference_features = load_class_reference_features(model, "datasets")
    if not reference_features:
        print("[â] No reference features found.")
        return

    # Only get frames of class_0
    class_0_frames = sorted([
        (key, feat) for key, feat in reference_features.items()
        if key[1] == "class_0"
    ])

    if not class_0_frames:
        print("[â] No frames found for class_0.")
        return

    cap = Picamera2()
    cap.preview_configuration.main.size=(1920, 1080)
    cap.preview_configuration.main.format="RGB888"
    cap.start()

    current_index = 0

    while current_index < len(class_0_frames):
        distance = get_distance()
        if distance < 50:

            print(f"[⏸] Object detected at {distance} cm - Pausing frame matching.")
            time.sleep(0.5)
            continue
			
        frame = cap.capture_array()
      
        features = extract_frame_features(model, frame)
        if features is None:
            continue

        (pathname, class_name, filename), ref_feat = class_0_frames[current_index]
        dissimilarity = calculate_similarity(features, ref_feat)

        if dissimilarity <= 0.35:
            text = f"â Matched Frame {current_index + 1}: {filename} (D: {dissimilarity:.3f})"
            color = (0, 255, 0)
            current_index += 1

            if current_index >= len(class_0_frames):
                print("[ð] All frames of class_0 matched in order.")
                break
        else:
            text = f"â Not Matched - Expecting Frame {current_index + 1}: {filename} (D: {dissimilarity:.3f})"
            color = (0, 0, 255)

        cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.imshow("Frame-wise Match - Class 0", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("[â¹] Quitting.")
            break
    GPIO.cleanup()
    cv2.destroyAllWindows()


# Entry point
if __name__ == "__main__":
    start_navigation("acad_to_concordia")
