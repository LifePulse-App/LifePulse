from fastapi import FastAPI, UploadFile, File, Form
from typing import Dict, List, Tuple
import torch
import torchvision.transforms as T
from torchvision import models
from PIL import Image
import json
import io

app = FastAPI()

# ---------- MODEL LOADING ----------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
model.eval()
model.to(device)

# ---------- IMAGENET LABELS ----------
IMAGENET_LABELS_PATH = "imagenet_class_index.json"
if os.path.exists(IMAGENET_LABELS_PATH):
    with open(IMAGENET_LABELS_PATH, "r", encoding="utf-8") as f:
        idx_to_label_raw = json.load(f)
    idx_to_label: Dict[int, str] = {int(k): str(v[1]) for k, v in idx_to_label_raw.items()}
else:
    idx_to_label = {i: f"class_{i}" for i in range(1000)}

# ---------- TRANSFORMS ----------
transform = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.ToTensor(),
    T.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

# ---------- HABIT -> LABELS MAPPING ----------
HABIT_LABEL_MAP: Dict[str, List[str]] = {
    # ---------------- MOVEMENT / FITNESS ----------------
    "pushups": [
        "parallel_bars", "horizontal_bar", "dumbbell", "barbell",
        "gymnastic_bar", "parallel_bars", "balance_beam"
    ],
    "pullups": [
        "horizontal_bar", "parallel_bars", "gymnastic_bar"
    ],
    "plank": [
        "horizontal_bar", "parallel_bars", "gymnastic_bar"
    ],
    "squats": [
        "barbell", "dumbbell", "weight_lifting_belt", "gymnasium_indoor"
    ],
    "deadlifts": [
        "barbell", "dumbbell", "weight_lifting_belt"
    ],
    "bench press": [
        "barbell", "dumbbell", "weight_lifting_belt", "gymnasium_indoor"
    ],
    "yoga": [
        "mat", "bath_towel", "quilt", "studio_couch"
    ],
    "meditation": [
        "altar", "mosque", "monastery", "church", "stupa"
    ],
    "running": [
        "running_shoe", "track", "athletic_shoe", "stadium", "sports_car"
    ],
    "jogging": [
        "running_shoe", "athletic_shoe", "track"
    ],
    "walking": [
        "running_shoe", "athletic_shoe", "sandal"
    ],
    "cycling": [
        "mountain_bike", "bicycle-built-for-two", "unicycle", "tricycle"
    ],
    "swimming": [
        "swimming_trunks", "swimming_pool", "lifeboat", "snorkel"
    ],
    "jump rope": [
        "whip", "chain", "bolo_tie"
    ],
    "stretching": [
        "gymnasium_indoor", "horizontal_bar", "parallel_bars"
    ],
    "football": [
        "football_helmet", "football", "jersey", "stadium"
    ],
    "basketball": [
        "basketball", "basketball_hoop"
    ],
    "tennis": [
        "racket", "tennis_ball", "sportswear", "Wimbledon"
    ],
    "badminton": [
        "racket", "shuttlecock"
    ],
    "table tennis": [
        "ping-pong_ball", "racket"
    ],
    "boxing": [
        "boxing_glove", "punching_bag", "helmet"
    ],
    "martial arts": [
        "kimono", "dojo", "punching_bag"
    ],
    "dance practice": [
        "stage", "theater_curtain", "spotlight"
    ],

    # ---------------- HEALTH / NUTRITION ----------------
    "drink water": [
        "water_bottle", "sports_bottle", "cup", "goblet", "jug", "pitcher", "beer_glass"
    ],
    "drink tea": [
        "teapot", "cup", "mug"
    ],
    "drink coffee": [
        "espresso", "cup", "mug", "coffee_mug"
    ],
    "eat breakfast": [
        "plate", "bowl", "coffee_mug", "croissant"
    ],
    "eat lunch": [
        "plate", "bowl", "dining_table"
    ],
    "eat dinner": [
        "plate", "bowl", "dining_table"
    ],
    "eat fruit": [
        "granny_smith", "orange", "banana", "pineapple", "strawberry", "lemon"
    ],
    "eat vegetables": [
        "broccoli", "cabbage", "cauliflower", "cucumber", "artichoke"
    ],
    "no junk food": [
        "hamburger", "cheeseburger", "hotdog", "french_loaf"
    ],
    "cook at home": [
        "stove", "gas_stove", "microwave", "oven", "refrigerator"
    ],
    "meal prep": [
        "lunch_box", "tupperware", "refrigerator"
    ],
    "take vitamins": [
        "pill_bottle", "syringe", "medicine_chest"
    ],
    "brush teeth": [
        "toothbrush", "sink", "washbasin", "bathroom_cabinet"
    ],
    "floss teeth": [
        "toothbrush", "washbasin"
    ],
    "skincare routine": [
        "lotion", "lipstick", "hair_spray", "powder"
    ],
    "weigh yourself": [
        "bathroom_scale"
    ],

    # ---------------- SLEEP & RECOVERY ----------------
    "go to bed early": [
        "bed", "bunk_bed", "four-poster"
    ],
    "wake up early": [
        "alarm_clock", "digital_clock"
    ],
    "power nap": [
        "bed", "pillow", "sofa"
    ],

    # ---------------- LEARNING / MENTAL ----------------
    "reading": [
        "bookshop", "library", "notebook", "book_jacket", "binder", "comic_book"
    ],
    "study": [
        "desk", "notebook", "laptop", "computer_keyboard", "desktop_computer"
    ],
    "online course": [
        "laptop", "desktop_computer", "monitor", "projector"
    ],
    "language learning": [
        "bookshop", "library", "notebook", "dictionary"
    ],
    "journal": [
        "notebook", "fountain_pen", "ballpoint", "desk"
    ],
    "gratitude journal": [
        "notebook", "fountain_pen", "ballpoint"
    ],
    "planning day": [
        "notebook", "calendar", "desk", "fountain_pen"
    ],
    "coding practice": [
        "laptop", "desktop_computer", "keyboard", "monitor"
    ],
    "music practice": [
        "piano", "acoustic_guitar", "electric_guitar", "violin", "drum", "trumpet"
    ],
    "draw or paint": [
        "paintbrush", "easel", "palette", "drawing_kit"
    ],
    "play instrument": [
        "piano", "guitar", "violin", "trumpet", "sax"
    ],

    # ---------------- WORK / PRODUCTIVITY ----------------
    "deep work": [
        "desk", "laptop", "desktop_computer", "office"
    ],
    "no phone distraction": [
        "cellular_telephone"
    ],
    "check email once": [
        "laptop", "desktop_computer", "smartphone"
    ],
    "daily review": [
        "notebook", "laptop", "calendar"
    ],
    "clean desk": [
        "desk", "wastebasket", "paper_towel"
    ],

    # ---------------- HOUSEHOLD / CHORES ----------------
    "clean room": [
        "broom", "vacuum", "feather_boa", "wastebasket"
    ],
    "do laundry": [
        "washing_machine", "laundry_basket", "clothes_dryer"
    ],
    "wash dishes": [
        "dishwasher", "sink", "plate", "bowl"
    ],
    "make bed": [
        "bed", "pillow", "quilt"
    ],
    "take out trash": [
        "garbage_truck", "wastebasket"
    ],
    "grocery shopping": [
        "shopping_cart", "grocery_store", "plastic_bag"
    ],
    "water plants": [
        "watering_can", "potted_plant", "garden"
    ],
    "pet care": [
        "dog", "cat", "leash", "dog_lead"
    ],

    # ---------------- SOCIAL / FAMILY ----------------
    "call family": [
        "cellular_telephone", "telephone"
    ],
    "meet a friend": [
        "coffee_mug", "restaurant", "cafe"
    ],
    "play with kids": [
        "teddy", "toyshop", "swing", "slide"
    ],
    "date night": [
        "restaurant", "candle", "wine_bottle"
    ],

    # ---------------- MINDFULNESS / SELF-CARE ----------------
    "meditate": [
        "altar", "monastery", "mosque", "church"
    ],
    "breathing exercise": [
        "yoga_mat", "mat", "meditation"
    ],
    "gratitude practice": [
        "notebook", "fountain_pen"
    ],
    "digital detox": [
        "cellular_telephone", "laptop", "television"
    ],
    "walk in nature": [
        "valley", "forest", "park_bench", "lakeside"
    ],

    # ---------------- FINANCE & ADMIN ----------------
    "track expenses": [
        "calculator", "laptop", "notebook", "ledger"
    ],
    "budget review": [
        "calculator", "notebook", "laptop"
    ],
    "check investments": [
        "laptop", "desktop_computer"
    ],

    # ---------------- CREATIVE / HOBBIES ----------------
    "photography practice": [
        "camera", "reflex_camera", "tripod"
    ],
    "video editing": [
        "laptop", "desktop_computer", "monitor"
    ],
    "gaming": [
        "joystick", "game_controller", "monitor", "television"
    ],
    "cooking practice": [
        "stove", "microwave", "refrigerator", "skillet"
    ],
    "baking": [
        "oven", "mixing_bowl", "measuring_cup"
    ],
    "gardening": [
        "potted_plant", "garden", "lawn_mower", "wheelbarrow"
    ],
    "art practice": [
        "paintbrush", "palette", "easel", "pencil_box"
    ],

    # ---------------- COMMUTE / ERRANDS ----------------


    "bike to work": [
        "bicycle-built-for-two", "mountain_bike", "road_bike"
    ],
    "walk to work": [
        "running_shoe", "athletic_shoe"
    ],
    "public transport": [
        "bus", "tram", "subway_train", "train"
    ],

    # ---------------- FAITH / SPIRITUAL ----------------
    "prayer": [
        "mosque", "church", "monastery", "stupa"
    ],
    "read scripture": [
        "book_jacket", "library"
    ],
}

def get_habit_labels(habit_name: str) -> List[str]:
    return [str(l) for l in HABIT_LABEL_MAP.get(habit_name.strip().lower(), [])]

def predict_image_labels(img_bytes: bytes, topk: int = 5) -> List[Tuple[str, float]]:
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    x = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)
    top_probs, top_idxs = probs.topk(topk, dim=1)
    top_probs = top_probs[0].cpu().numpy()
    top_idxs = top_idxs[0].cpu().numpy()
    top_labels = [idx_to_label.get(int(i), f"class_{int(i)}") for i in top_idxs]
    return list(zip(top_labels, top_probs))

def compute_habit_score(habit_name: str, predictions: List[Tuple[str, float]]) -> float:
    habit_labels = get_habit_labels(habit_name)
    if not habit_labels:
        return 0.0
    score = 0.0
    for label, prob in predictions:
        label = str(label)
        for h_label in habit_labels:
            if h_label.lower() in label.lower():
                score += float(prob)
    return float(min(score, 1.0))

# ---------- VERIFY ENDPOINT ----------
@app.post("/verify")
async def verify_proof_ai(
    habitName: str = Form(...), 
    image: UploadFile = File(...)
):
    img_bytes = await image.read()

    preds = predict_image_labels(img_bytes, topk=5)
    score = compute_habit_score(habitName, preds)
    threshold = 0.3
    is_verified = score >= threshold

    top_predictions = [{"label": str(label), "probability": float(prob)} for label, prob in preds]

    return {
        "verified": is_verified,
        "score": round(score, 3),
        "top_predictions": top_predictions,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)