// shared/services/stableDeviceId.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const INSTALL_KEY = "APP_INSTALL_ID";

async function getInstallId() {
  let id = await AsyncStorage.getItem(INSTALL_KEY);
  if (!id) {
    id = `install-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await AsyncStorage.setItem(INSTALL_KEY, id);
  }
  return id;
}

/**
 * Device id unique per (user account on this install).
 * Supports multiple accounts on same phone.
 */
export async function getStableDeviceId(userId: string) {
  const installId = await getInstallId();
  const KEY = `E2EE_STABLE_DEVICE_ID_${userId}_${installId}`;

  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = `dev-${userId.slice(-6)}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}