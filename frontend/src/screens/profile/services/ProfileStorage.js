import { storage } from "../../../auth/storage/storage";

const PROFILE_KEY = "profile_cache_v1";

const ProfileStorage = {
  saveProfile(profile) {
    try {
      storage.set(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.log("MMKV save error:", e);
    }
  },

  getProfile() {
    try {
      const raw = storage.getString(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  clearProfile() {
    storage.delete(PROFILE_KEY);
  },
};

export default ProfileStorage;