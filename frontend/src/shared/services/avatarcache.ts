import RNFS from "react-native-fs";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AVATAR_CACHE_PREFIX = "avatar_cache_";

export const getAvatarPath = async (userId, url) => {
  if (!url) return null;

  const key = `${AVATAR_CACHE_PREFIX}${userId}`;

  // 1. check cache first
  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    const exists = await RNFS.exists(cached);
    if (exists) return cached;
  }

  // 2. download image
  try {
    const ext = url.split(".").pop().split("?")[0];
    const path = `${RNFS.CachesDirectoryPath}/avatar_${userId}.${ext}`;

    const download = await RNFS.downloadFile({
      fromUrl: url,
      toFile: path,
    }).promise;

    if (download.statusCode === 200) {
      await AsyncStorage.setItem(key, path);
      return path;
    }
  } catch (e) {
    console.log("Avatar cache error:", e);
  }

  return null;
};