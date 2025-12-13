import api from "../../../auth/api-client/api_client";

export const registerDeviceBundle = (payload: any) =>
  api.post("/e2ee/devices/register", payload);
export const topupPrekeys = (payload: any) =>
  api.post("/e2ee/devices/prekeys", payload);

// FIX: correct path to list all devices for a user (receiver)
export const fetchDevices = (userId: string) =>
  api.get(`/e2ee/devices/user/${userId}`);

export const sendCipher = (payload: any) => api.post("/e2ee/messages", payload);
export const pullMessages = (deviceId: string) =>
  api.get("/e2ee/messages", { params: { deviceId } });
export const fetchConversations = () => api.get("/e2ee/conversations");