import cv2
import os, time
import numpy as np
from skimage.metrics import structural_similarity as ssim

def frame_difference(frame1, frame2):
    """Return similarity score (0 = different, 1 = same) using structural similarity."""
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    score, _ = ssim(gray1, gray2, full=True)
    return score

def capture_frames_from_camera(folder_name, target_size=(128, 128), similarity_threshold=0.30):
    """
    Capture frames from camera until 's' is pressed.
    Save frames to datasets/<folder_name>/class_0 if they differ by at least similarity_threshold.
    """
    save_folder = os.path.join("datasets", folder_name, "class_0")
    os.makedirs(save_folder, exist_ok=True)

    cap = cv2.VideoCapture(0)
    saved_count = 0
    last_saved_frame = None

    print("[INFO] Press 's' to stop capturing.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        resized_frame = cv2.resize(frame, target_size)

        if last_saved_frame is None:
            # Save first frame
            time.sleep(5)
            frame_path = os.path.join(save_folder, f"frame_{saved_count:04d}.jpg")
            cv2.imwrite(frame_path, resized_frame)
            print(f"[✔] Saved: {frame_path}")
            last_saved_frame = resized_frame
            saved_count += 1
        else:
            similarity = frame_difference(resized_frame, last_saved_frame)
            if similarity < (1 - similarity_threshold):  # dissimilar enough
                frame_path = os.path.join(save_folder, f"frame_{saved_count:04d}.jpg")
                cv2.imwrite(frame_path, resized_frame)
                print(f"[✔] Saved (dissimilarity {1-similarity:.2f}): {frame_path}")
                last_saved_frame = resized_frame
                saved_count += 1

        cv2.imshow("Camera Feed", frame)

        if cv2.waitKey(1) & 0xFF == ord('s'):
            print("[INFO] Capture stopped by user.")
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"[✔] Total saved frames: {saved_count}")

if __name__ == "__main__":
    # Example usage: pass folder name from main or set here
    folder_name_from_main = "acad_to_concordia"  # replace as needed
    capture_frames_from_camera(folder_name_from_main)
