// Derive a stable numeric registration id from a string deviceId
export const toDeviceRegistrationId = (deviceId: string): number => {
    const hex = (deviceId || "").replace(/[^a-fA-F0-9]/g, "");
    const n = parseInt(hex.slice(-6) || "0", 16);
    // keep in positive 32-bit range; fallback to 1 if parse fails
    return n > 0 ? n : 1;
  };