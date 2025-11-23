from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List
import torch
import torchvision.transforms as T
from torchvision import models
from PIL import Image
import json
import os

app = FastAPI()

# ---------- INPUT MODEL ----------

class ProofInput(BaseModel):
    imageUrl: str      # local path to image: uploads/xxxx.jpg
    habitName: str     # e.g. "pushups", "reading", "drink water"

# ---------- MODEL LOADING ----------

# Load pre-trained ResNet-50 on ImageNet
# This downloads weights first time
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
model.eval()
model.to(device)

# Load ImageNet class names
# You can download this file once and put it in your project
# For convenience, we include a fallback list if missing.
IMAGENET_LABELS_PATH = "imagenet_class_index.json"

if os.path.exists(IMAGENET_LABELS_PATH):
  with open(IMAGENET_LABELS_PATH, "r") as f:
      idx_to_label_raw = json.load(f)
  # idx_to_label: int -> label string (e.g. "Labrador_retriever")
  idx_to_label = {int(k): v[1] for k, v in idx_to_label_raw.items()}
else:
  # Minimal fallback if file not present
  idx_to_label = {i: f"class_{i}" for i in range(1000)}

# ---------- TRANSFORMS ----------

transform = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(
        mean=[0.485, 0.456, 0.406],  # ImageNet means
        std=[0.229, 0.224, 0.225],
    ),
])

# ---------- HABIT -> LABELS MAPPING ----------

# Map your habits to sets of ImageNet label keywords.
# You can expand/customize this mapping per your domain.
HABIT_LABEL_MAP: Dict[str, List[str]] = {
    "pushups": [
        "parallel_bars", "horizontal_bar", "dumbbell", "barbell", "gymnastic_bar",
        "hand_blower",  # custom; adjust as needed
    ],
    "running": [
        "running_shoe", "track", "sports_car", "athletic_shoe", "jogging",
    ],
    "reading": [
        "bookshop", "library", "notebook", "book_jacket", "binder",
    ],
    "drink water": [
        "water_bottle", "sports_bottle", "cup", "goblet", "jug",
    ],
    # default habit catch-all can be added if necessary
}

def get_habit_labels(habit_name: str) -> List[str]:
    # normalize key
    key = habit_name.strip().lower()
    # simple mapping; you can add synonyms or slugify here
    for mapped_habit, labels in HABIT_LABEL_MAP.items():
        if key == mapped_habit.lower():
            return labels
    # if unknown habit, you might return empty or a default set
    return []

# ---------- INFERENCE HELPER ----------

def predict_image_labels(image_path: str, topk: int = 5):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    img = Image.open(image_path).convert("RGB")
    x = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)

    top_probs, top_idxs = probs.topk(topk, dim=1)
    top_probs = top_probs[0].cpu().numpy()
    top_idxs = top_idxs[0].cpu().numpy()

    # map to human labels
    top_labels = [idx_to_label.get(int(i), f"class_{int(i)}") for i in top_idxs]
    return list(zip(top_labels, top_probs))  # [(label, prob), ...]

def compute_habit_score(habit_name: str, predictions: List[tuple]) -> float:
    """
    Compute how likely this image matches the habit.
    We compare predicted ImageNet labels to the habit's allowed labels.
    Score is sum of probabilities of matching labels.
    """
    habit_labels = get_habit_labels(habit_name)
    if not habit_labels:
        # unknown habit -> low confidence
        return 0.0

    score = 0.0
    for label, prob in predictions:
        for h_label in habit_labels:
            # simple partial matching, case-insensitive
            if h_label.lower() in label.lower():
                score += float(prob)
    # clamp between 0 and 1
    return float(min(score, 1.0))

# ---------- API ENDPOINT ----------

@app.post("/verify")
async def verify_proof(data: ProofInput):
    """
    Input:
      - imageUrl: local path (e.g. uploads/xyz.jpg) on Node server,
                  OR a path mounted/shared to this service.
      - habitName: e.g. "pushups"
    Output:
      - verified: bool
      - score: float [0,1]
      - top_predictions: optional debug (label + prob)
    """
    image_path = data.imageUrl

    try:
        preds = predict_image_labels(image_path, topk=5)
        score = compute_habit_score(data.habitName, preds)

        # threshold: tweak e.g. 0.3 as you like
        threshold = 0.3
        is_verified = score >= threshold

        # optional: include top predictions for debugging / logging
        top_predictions = [
            {"label": label, "probability": float(prob)}
            for (label, prob) in preds
        ]

        return {
            "verified": is_verified,
            "score": round(score, 3),
            "top_predictions": top_predictions,
        }
    except FileNotFoundError as e:
        return {
            "verified": False,
            "score": 0.0,
            "error": str(e),
        }
    except Exception as e:
        # in production, log this somewhere
        return {
            "verified": False,
            "score": 0.0,
            "error": f"Model inference failed: {e}",
        }