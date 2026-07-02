import RNFS from "react-native-fs";

const MEDIA_DIR = `${RNFS.CachesDirectoryPath}/chat_media_cache`;

const safeName = (url) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  const ext = (url.split(".").pop() || "bin").split("?")[0].slice(0, 8);
  return `${Math.abs(hash)}.${ext}`;
};

async function ensureMediaDir() {
  const exists = await RNFS.exists(MEDIA_DIR);
  if (!exists) await RNFS.mkdir(MEDIA_DIR);
}

// Returns a local file:// path. Downloads + caches on first call; reuses after.
export async function getCachedMediaPath(remoteUrl) {
  if (!remoteUrl) return remoteUrl;
  if (remoteUrl.startsWith("file://")) return remoteUrl;

  await ensureMediaDir();
  const localPath = `${MEDIA_DIR}/${safeName(remoteUrl)}`;
  const tmpPath = `${localPath}.tmp`; // Temporary file path to prevent partial reads

  // 1. If the fully downloaded file already exists, return it
  const exists = await RNFS.exists(localPath);
  if (exists) return `file://${localPath}`;

  try {
    // 2. Download to the temporary file path first
    const res = await RNFS.downloadFile({ fromUrl: remoteUrl, toFile: tmpPath }).promise;
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // 3. Download successful! Rename .tmp to the actual file name (Atomic write)
      await RNFS.moveFile(tmpPath, localPath);
      return `file://${localPath}`;
    } else {
      // Bad status code, delete the garbage tmp file so it doesn't waste space
      if (await RNFS.exists(tmpPath)) {
        await RNFS.unlink(tmpPath);
      }
      return remoteUrl; // Fallback to remote URL
    }
  } catch (error) {
    // Download failed/interrupted, clean up the partial tmp file
    if (await RNFS.exists(tmpPath)) {
      await RNFS.unlink(tmpPath).catch(() => {}); 
    }
    return remoteUrl; // Fallback to remote URL
  }
}

// Fire-and-forget background download, used right when a message arrives/loads.
export function prefetchMedia(remoteUrl) {
  if (!remoteUrl || remoteUrl.startsWith("file://")) return;
  getCachedMediaPath(remoteUrl).catch(() => {});
}