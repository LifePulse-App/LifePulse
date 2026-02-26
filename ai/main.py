from fastapi import FastAPI, UploadFile, File, Form
from typing import Dict, List
import torch
from PIL import Image
import io
import clip  # pip install git+https://github.com/openai/CLIP.git

app = FastAPI()

# ---------- MODEL LOADING ----------
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)
model.eval()
model.to(device)

# ---------- ACTIVITY PROMPTS ----------
# Use your habit names as activities list (case-insensitive)
ACTIVITIES: List[str] = [
    "pushups", "pullups", "plank", "squats", "deadlifts", "bench press", "yoga", 
    "meditation", "running", "jogging", "walking", "cycling", "swimming", "jump rope", 
    "stretching", "football", "basketball", "tennis", "badminton", "table tennis", "boxing", 
    "martial arts", "dance practice", "drink water", "drink tea", "drink coffee", 
    "eat breakfast", "eat lunch", "eat dinner", "eat fruit", "eat vegetables", "no junk food", 
    "cook at home", "meal prep", "take vitamins", "brush teeth", "floss teeth", "skincare routine",
    "weigh yourself", "go to bed early", "wake up early", "power nap", "reading", "study", 
    "online course", "language learning", "journal", "gratitude journal", "planning day", 
    "coding practice", "music practice", "draw or paint", "play instrument", "deep work", 
    "no phone distraction", "check email once", "daily review", "clean desk", "clean room", 
    "do laundry", "wash dishes", "make bed", "take out trash", "grocery shopping", "water plants", 
    "pet care", "call family", "meet a friend", "play with kids", "date night", "meditate", 
    "breathing exercise", "gratitude practice", "digital detox", "walk in nature", "track expenses", 
    "budget review", "check investments", "photography practice", "video editing", "gaming", 
    "cooking practice", "baking", "gardening", "art practice", "bike to work", "walk to work", 
    "public transport", "prayer", "read scripture"
]

def predict_activity(img_bytes: bytes, activities: List[str]) -> Dict:
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    image_input = preprocess(image).unsqueeze(0).to(device)
    # Construct text prompts in natural language
    text_prompts = [f"a person doing {act}" for act in activities]
    text_inputs = torch.cat([clip.tokenize(prompt) for prompt in text_prompts]).to(device)
    with torch.no_grad():
        logits_per_image, _ = model(image_input, text_inputs)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]
        best_idx = probs.argmax()
        return {
            "activity": activities[best_idx],
            "probability": float(probs[best_idx]),
            "all_scores": dict(zip(activities, map(float, probs)))
        }

# ---------- VERIFY ENDPOINT ----------
@app.post("/verify")
async def verify_proof_ai(
    habitName: str = Form(...), 
    image: UploadFile = File(...)
):
    img_bytes = await image.read()
    result = predict_activity(img_bytes, ACTIVITIES)
    # Compare requested habit to best activity predicted
    requested = habitName.strip().lower()
    predicted = result["activity"].strip().lower()

    is_verified = (requested == predicted) and (result["probability"] >= 0.2)  # You can tune threshold!
    return {
        "verified": is_verified,
        "score": round(result["probability"], 3),
        "predicted_activity": result["activity"],
        "all_scores": result["all_scores"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)