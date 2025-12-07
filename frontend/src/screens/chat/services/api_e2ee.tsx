import api from "../../../auth/api-client/api_client";

export const registerDeviceBundle = (payload: any) => api.post("/e2ee/devices/register", payload);
export const topupPrekeys = (payload: any) => api.post("/e2ee/devices/prekeys", payload);
export const fetchDevices = (userId: string) => api.get(`/e2ee/devices/${userId}`);
export const sendCipher = (payload: any) => api.post("/e2ee/messages", payload);
export const pullMessages = (deviceId: string) => api.get("/e2ee/messages", { params: { deviceId } });
export const fetchConversations = () => api.get("/e2ee/conversations");