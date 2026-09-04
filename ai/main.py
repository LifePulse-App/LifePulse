from fastapi import FastAPI, UploadFile, File, Form
from typing import Dict, List
import torch
from PIL import Image
import io
import clip  # pip install git+https://github.com/openai/CLIP.git

# --- ADD THIS TO SUPPORT HEIC FILES FROM IPHONES ---
import pillow_heif
pillow_heif.register_heif_opener()
# ---------------------------------------------------

app = FastAPI()

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)
model.eval()
model.to(device)

# -------------- 31 ACTIVITY KEYS (exact match with MongoDB keys) --------------
ACTIVITY_KEYS: List[str] = [
    # Movement / Fitness
    "workout",
    "cardio",
    "yoga_stretching",
    "play_sports",
    "outdoor_activity",

    # Health / Nutrition
    "eat_healthy_meal",
    "healthy_hydration",
    "personal_hygiene",

    # Sleep & Recovery
    "good_sleep",
    "daily_routine",

    # Learning / Mental
    "reading",
    "study_learn",
    "journaling",

    # Work / Tech / Productivity
    "coding_dev",
    "computer_work",
    "deep_work",
    "organize_workspace",

    # Household / Chores
    "house_cleaning",
    "pet_care",

    # Social / Leisure
    "gaming",
    "watch_content",
    "social_hangout",
    "quality_time",
    "take_selfie",

    # Mindfulness / Self-care
    "meditation",

    # Finance & Admin
    "financial_management",

    # Creative / Hobbies
    "creative_hobby",

    # Commute / Errands
    "commute_errands",

    # Faith / Spiritual
    "daily_prayer",
    "read_scripture",
    "charity_help",
]

# -------------- NATURAL LANGUAGE PROMPTS (1-to-1 with ACTIVITY_KEYS) --------------
ACTIVITY_PROMPTS: List[str] = [
    # Movement / Fitness
    "a person working out at the gym, lifting weights, or doing strength exercises",
    "a person doing cardio, running, cycling, or swimming",
    "a person practicing yoga or doing stretching exercises on a mat",
    "a person playing sports like football, basketball, tennis, or badminton",
    "a person hiking, walking on a trail, or exploring nature outdoors",

    # Health / Nutrition
    "a healthy plate of food, fresh meal, salad, or home-cooked dish",
    "a person drinking a glass of water, bottle of water, or tea",
    "a person doing personal hygiene, brushing teeth, washing face, or skincare",

    # Sleep & Recovery
    "a person sleeping in bed or an empty made bed ready for sleep",
    "a person doing their morning or evening self care routine",

    # Learning / Mental
    "a person reading a printed paper book, novel, or textbook",
    "a study desk with open notebooks, textbooks, study notes, and pens",
    "a person writing in a personal journal or physical paper diary",

    # Work / Tech / Productivity
    "a computer screen displaying lines of source code or software development",
    "a person typing on a laptop keyboard or working on a computer screen",
    "a person focused on work, paperwork, or reading documents at a desk",
    "a tidy and organized desk workspace with computer and stationery",

    # Household / Chores
    "a person cleaning the room, doing laundry, mopping floors, or washing dishes",
    "a domestic pet like a dog or cat being petted, walked, or fed",

    # Social / Leisure
    "a person playing video games on a computer monitor, console, or smartphone",
    "a television or monitor screen streaming a movie, video, or series",
    "a group of friends hanging out together at a cafe or having a park picnic",
    "family or friends talking and spending quality time together indoors",
    "a selfie photo of a person taken with a front-facing smartphone camera",

    # Mindfulness / Self-care
    "a person sitting quietly meditating with eyes closed or deep breathing",

    # Finance & Admin
    "a person reviewing financial bills, invoices, receipts, or spreadsheets",

    # Creative / Hobbies
    "a person drawing, painting, making crafts, or playing a musical instrument",

    # Commute / Errands
    "a person driving a car, riding public transit, or running daily errands",

    # Faith / Spiritual
    "a person performing prayer, namaz, prostration, or praying",
    "a person reading the Quran, Bible, or holy religious scripture",
    "a person giving charity money, food donations, or helping someone",
]
def predict_activity(img_bytes: bytes) -> Dict:
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    image_input = preprocess(image).unsqueeze(0).to(device)
    text_inputs = torch.cat([clip.tokenize(prompt) for prompt in ACTIVITY_PROMPTS]).to(device)
    with torch.no_grad():
        logits_per_image, _ = model(image_input, text_inputs)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]
        best_idx = probs.argmax()
        return {
            "activity": ACTIVITY_KEYS[best_idx],
            "probability": float(probs[best_idx]),
            "all_scores": dict(zip(ACTIVITY_KEYS, map(float, probs)))
        }

@app.post("/verify")
async def verify_proof_ai(
    habitKey: str = Form(...),
    image: UploadFile = File(...)
):
    img_bytes = await image.read()
    result = predict_activity(img_bytes)
    requested = habitKey.strip().lower()
    predicted = result["activity"].strip().lower()
    is_verified = (result["probability"] >= 0.1)  # You can tune threshold!
    return {
        "verified": is_verified,
        "score": round(result["probability"], 3),
        "predicted_activity": result["activity"],
        "all_scores": result["all_scores"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)