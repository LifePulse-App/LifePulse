import os
import sys
import time
import random
from utils import start_navigation
from extract_frames import extract_frames
from train_model import train_model
from extract_frames import capture_frames_from_camera

def main():
    print("Welcome to NAVBOT!")
    print("Please choose a path for navigation (or training):")
    print("1. Acad to Concordia")
    print("2. Concordia to Acad")
    
    # Take user input for path selection
    choice = input("Enter the number corresponding to the path: ").strip()

    # Map the choice to the video name
    if choice == "1":
        video_name = "acad_to_concordia.mp4"
        path_name = "acad_to_concordia"
    elif choice == "2":
        video_name = "concordia_to_acad.mp4"
        path_name = "concordia_to_acad"
    else:
        print("[❌] Invalid choice. Exiting program.")
        sys.exit(1)

    # Extract frames from video
    print(f"[INFO] Extracting frames for {path_name}...")
    capture_frames_from_camera(path_name)

    print(f"[INFO] Training model for {path_name}...")
    train_model(path_name)  # Train the model for the selected path
    print(f"[INFO] Starting navigation for {path_name}...")
    start_navigation(path_name)  # Start navigation for the selected path

if __name__ == "__main__":
    main()
