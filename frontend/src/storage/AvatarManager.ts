import RNFS from "react-native-fs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../auth/api-client/api_client";

const BASE_DIR = RNFS.DocumentDirectoryPath + "/streaksphere/avatar";
const baseUrl = apiClient.getBaseURL();
const newUrl = baseUrl.replace(/\/api\/?$/, "");

const ensureDir = async () => {
  const exists = await RNFS.exists(BASE_DIR);
  if (!exists) {
    await RNFS.mkdir(BASE_DIR);
  }
};

export const getLocalAvatarPath = (userId) => {
  return `${BASE_DIR}/${userId}.jpg`;
};

const getVersionKey = (userId) => `avatar_version_${userId}`;

// download + store avatar     
export const cacheAvatar = async (userId, url, avatarVersion) => {
  try {
    await ensureDir();
    if (!url) return null;

    const localPath = getLocalAvatarPath(userId);

    // FIX: Safely handle both absolute (Google/HTTP) and relative (/api/...) paths
    const fullUrl = url.startsWith("http") 
      ? url 
      : (url.startsWith('/') ? newUrl + url : `${newUrl}/${url}`);

    const downloadResult = await RNFS.downloadFile({
      fromUrl: fullUrl,
      toFile: localPath,
      connectionTimeout: 30000, 
      readTimeout: 30000,       
    }).promise;

    if (downloadResult.statusCode === 200) {
      await AsyncStorage.setItem(getVersionKey(userId), String(avatarVersion || 1));
      return "file://" + localPath;
    }

    return null;
  } catch (e) {
    console.log("avatar cache error", e);
    return null;
  }
};

// get avatar (local first)
export const getAvatar = async (userId, url, avatarVersion = 1) => {
  try {
    if (!url) return null;
    const localPath = getLocalAvatarPath(userId);
    const exists = await RNFS.exists(localPath);
    const savedVersion = await AsyncStorage.getItem(getVersionKey(userId));

    const versionChanged = String(savedVersion) !== String(avatarVersion);

    if (exists && !versionChanged) {
      return "file://" + localPath;
    }

    if (exists && versionChanged) {
      await RNFS.unlink(localPath);
    }

    return await cacheAvatar(userId, url, avatarVersion);
  } catch (err) {
    console.log(err);
    return null;
  }
};

// cleanup unused avatars (future use)
export const clearAvatarCache = async () => {
  const exists = await RNFS.exists(BASE_DIR);
  if (exists) {
    await RNFS.unlink(BASE_DIR);
    await RNFS.mkdir(BASE_DIR);
  }
};