from fastapi import FastAPI, UploadFile, File, Form
from typing import Dict, List
import torch
from PIL import Image
import io
import clip  # pip install git+https://github.com/openai/CLIP.git

app = FastAPI()

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)
model.eval()
model.to(device)

# -------------- HABIT ACTIVITY KEYS (exact match backend seeds) --------------
ACTIVITY_KEYS: List[str] = [
    # MOVEMENT / FITNESS
    "pushups", "pullups", "situps", "plank", "squats", "lunges", "deadlifts", "bench_press", "yoga",
    "meditation", "running", "jogging", "walking", "cycling", "swimming", "jump_rope", "stretching", "tai_chi",
    "football", "basketball", "tennis", "badminton", "table_tennis", "boxing", "martial_arts", "dance_practice",
    "mountain_climbing", "canoeing", "skating", "parkour", "hiking", "pilates", "calisthenics", "surfing",
    "climbing", "obstacle_course", "gymnastics", "jumping_jacks", "burpees", "walk_the_dog", "skiing",
    "rowing", "parcours", "standup_paddle", "handstand", "park_workout",
    # HEALTH / NUTRITION
    "drink_water", "drink_tea", "drink_coffee", "eat_breakfast", "eat_lunch", "eat_dinner", "eat_snack",
    "eat_fruit", "eat_vegetables", "no_junk_food", "cook_at_home", "meal_prep", "take_vitamins",
    "brush_teeth", "floss_teeth", "skincare_routine", "weigh_yourself", "track_calories", "eat_whole_grains",
    "eat_protein", "avoid_sugar", "hydrate_regularly", "eat_nuts", "eat_salad", "fermented_food",
    "drink_smoothie", "eat_fish", "meal_log",
    # SLEEP & RECOVERY
    "go_to_bed_early", "wake_up_early", "power_nap", "full_sleep", "avoid_screen_night", "night_routine",
    "morning_routine", "set_alarm", "sleep_stretch", "power_down", "white_noise", "dream_journal",
    # LEARNING / MENTAL
    "reading", "study", "online_course", "language_learning", "journal", "gratitude_journal", "planning_day",
    "coding_practice", "music_practice", "draw_paint", "play_instrument", "chess_practice", "puzzle_solving",
    "research_topic", "memorize", "watch_documentary", "flashcards", "mental_math", "visualization",
    # WORK / PRODUCTIVITY
    "deep_work", "no_phone_distraction", "check_email_once", "daily_review", "clean_desk", "organize_files",
    "clear_inbox", "write_report", "sync_calendar", "backup_files", "focus_block", "meeting_prep", "review_goals",
    # HOUSEHOLD / CHORES
    "clean_room", "do_laundry", "wash_dishes", "make_bed", "take_out_trash", "grocery_shopping", "water_plants",
    "pet_care", "vacuum_house", "clean_bathroom", "dust_furniture", "organize_closet", "wash_windows", "mop_floor",
    "clean_fridge", "sort_mail", "declutter", "wash_car", "change_sheets", "empty_dishwasher",
    # SOCIAL / FAMILY
    "call_family", "meet_friend", "play_with_kids", "date_night", "cook_with_family", "eat_together",
    "story_time", "board_games", "family_walk", "send_message", "family_game", "celebrate",
    # MINDFULNESS / SELF-CARE
    "meditate", "breathing_exercise", "gratitude_practice", "digital_detox", "walk_in_nature", "affirmations",
    "self_compassion", "mindful_eating", "body_scan", "hot_bath", "self_reflection", "read_affirmation",
    # FINANCE / ADMIN
    "track_expenses", "budget_review", "check_investments", "pay_bills", "review_transactions",
    "check_credit_score", "pay_debt", "save_money", "expense_report", "scan_receipts", "donate",
    # CREATIVE / HOBBIES
    "photography_practice", "video_editing", "gaming", "cooking_practice", "baking", "gardening",
    "art_practice", "lego_building", "crafts", "woodworking", "scrapbooking", "writing_poetry",
    "paint_miniatures", "write_blog", "knitting", "origami",
    # COMMUTE / ERRANDS
    "bike_to_work", "walk_to_work", "public_transport", "errand_run", "drop_package", "fill_gas",
    "maintenance_car", "book_appointment", "collect_parcel", "return_items",
    # FAITH / SPIRITUAL (Islamic, etc.)
    "fajr", "dhuhr", "asr", "maghrib", "isha", "tahajjud", "duha", "witr", "read_quran", "dua", "dhikr",
    "friday_prayer", "charity", "help_others", "read_scripture", "istikhara", "send_salawat", "make_wudu",
    "help_mosque", "feed_fast", "taraweeh", "qiyam", "eid_prayer", "visit_graveyard", "learn_dua", 
    "teach_quran", "help_neighbor", "tasbeeh", "islamic_lecture", "quran_memorization", "istighfar",
    "prophet_story", "azkar_morning", "azkar_evening", "family_islamic", "fast_voluntary", "give_zakat",
    # Christian
    "morning_prayer_christian", "read_bible",
    # Hindu
    "aarti", "read_bhagavad_gita"
]

# -------------- CLIP PROMPTS (natural lang, same order as keys) --------------
ACTIVITY_PROMPTS: List[str] = [
    "a person doing push-ups", "a person doing pull-ups", "a person doing sit-ups", "a person holding a plank",
    "a person doing squats", "a person doing lunges", "a person doing deadlifts", "a person doing bench press",
    "a person doing yoga", "a person meditating", "a person running", "a person jogging", "a person walking",
    "a person cycling", "a person swimming", "a person jumping rope", "a person stretching", "a person practicing tai chi",
    "a person playing football", "a person playing basketball", "a person playing tennis", "a person playing badminton",
    "a person playing table tennis", "a person boxing", "a person practicing martial arts", "a person practicing dance",
    "a person mountain climbing", "a person canoeing", "a person skating", "a person doing parkour", "a person hiking",
    "a person doing pilates", "a person doing calisthenics", "a person surfing", "a person climbing", "a person on an obstacle course",
    "a person practicing gymnastics", "a person doing jumping jacks", "a person doing burpees", "a person walking a dog", "a person skiing",
    "a person rowing", "a person practicing parcours", "a person stand-up paddling", "a person practicing handstand", "a person working out in a park",

    "a person drinking water", "a person drinking tea", "a person drinking coffee", "a person eating breakfast", "a person eating lunch",
    "a person eating dinner", "a person having a snack", "a person eating fruit", "a person eating vegetables", "a person avoiding junk food",
    "a person cooking at home", "a person meal prepping", "a person taking vitamins", "a person brushing teeth", "a person flossing teeth",
    "a person doing skincare routine", "a person weighing themselves", "a person tracking calories", "a person eating whole grains", "a person eating protein",
    "a person avoiding sugar", "a person hydrating regularly", "a person eating nuts", "a person eating salad", "a person eating fermented food",
    "a person drinking a smoothie", "a person eating fish", "a person logging their meals",

    "a person going to bed early", "a person waking up early", "a person taking a power nap", "a person getting a full night sleep", "a person putting away screens at night",
    "a person doing a night routine", "a person doing a morning routine", "a person setting an alarm", "a person stretching before sleep",
    "a person turning off devices at night", "a person playing white noise", "a person writing in a dream journal",

    "a person reading", "a person studying", "a person taking an online course", "a person learning a language", "a person journaling", "a person writing a gratitude journal",
    "a person planning the day", "a person practicing coding", "a person practicing music", "a person drawing or painting", "a person playing an instrument",
    "a person practicing chess", "a person solving puzzles", "a person researching a topic", "a person memorizing something", "a person watching a documentary",
    "a person reviewing flashcards", "a person practicing mental math", "a person visualizing goals",

    "a person doing deep work", "a person not using a phone", "a person checking email once", "a person doing a daily review", "a person cleaning a desk",
    "a person organizing files", "a person clearing inbox", "a person writing a report", "a person syncing a calendar", "a person backing up files",
    "a person starting a focus block", "a person preparing for a meeting", "a person reviewing goals",

    "a person cleaning a room", "a person doing laundry", "a person washing dishes", "a person making a bed", "a person taking out trash", "a person shopping for groceries",
    "a person watering plants", "a person taking care of a pet", "a person vacuuming a house", "a person cleaning a bathroom", "a person dusting furniture",
    "a person organizing a closet", "a person washing windows", "a person mopping floors", "a person cleaning a fridge", "a person sorting mail", "a person decluttering",
    "a person washing a car", "a person changing sheets", "a person emptying the dishwasher",

    "a person calling family", "a person meeting a friend", "a person playing with kids", "a person on a date night", "a person cooking with family", "a person eating together",
    "a person having story time", "a person playing board games", "a person on a family walk", "a person sending a message", "a person playing a family game", "a person celebrating",

    "a person meditating", "a person doing a breathing exercise", "a person practicing gratitude", "a person doing a digital detox", "a person walking in nature",
    "a person saying affirmations", "a person practicing self compassion", "a person eating mindfully", "a person doing a body scan", "a person taking a hot bath",
    "a person reflecting on the day", "a person reading an affirmation",

    "a person tracking expenses", "a person reviewing their budget", "a person checking investments", "a person paying bills", "a person reviewing transactions",
    "a person checking credit score", "a person paying debt", "a person saving money", "a person filing an expense report", "a person scanning receipts", "a person donating to charity",

    "a person practicing photography", "a person editing a video", "a person playing video games", "a person cooking for practice", "a person baking", "a person gardening", "a person practicing art",
    "a person building with legos", "a person crafting", "a person woodworking", "a person scrapbooking", "a person writing poetry", "a person painting miniatures", "a person writing a blog",
    "a person knitting", "a person making origami",

    "a person biking to work", "a person walking to work", "a person using public transport", "a person running errands", "a person dropping off a package", "a person filling gas tank",
    "a person doing car maintenance", "a person booking an appointment", "a person collecting a parcel", "a person returning purchased items",

    "a person performing Fajr prayer", "a person performing Dhuhr prayer", "a person performing Asr prayer", "a person performing Maghrib prayer", "a person performing Isha prayer",
    "a person performing Tahajjud prayer", "a person performing Duha prayer", "a person performing Witr prayer", "a person reading Quran", "a person making dua prayer", "a person performing dhikr",
    "a person attending Friday prayer", "a person giving charity", "a person helping others", "a person reading scripture", "a person performing Istikhara prayer", "a person sending Salawat",
    "a person performing wudu", "a person helping at mosque", "a person feeding someone fasting", "a person performing Taraweeh prayer", "a person performing Qiyam Al-Layl prayer", "a person performing Eid prayer",
    "a person visiting a graveyard", "a person learning dua", "a person teaching Quran", "a person helping a neighbor", "a person counting tasbeeh", "a person attending Islamic lecture",
    "a person memorizing Quran", "a person saying Istighfar", "a person reading prophet story", "a person reciting azkar in morning", "a person reciting azkar in evening",
    "a person having Islamic discussion with family", "a person observing a voluntary fast", "a person giving zakat",

    "a person saying a Christian morning prayer", "a person reading the Bible",

    "a person performing Aarti rituals", "a person reading Bhagavad Gita",
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