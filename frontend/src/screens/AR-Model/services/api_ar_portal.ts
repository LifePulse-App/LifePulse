import api from "../../../auth/api-client/api_client";

/**
 * Public AR Portal (Spots + Messages)
 *
 * Backend endpoints expected:
 * - GET    /ar-portal/spots/nearby?lat=..&lon=..&radius=150&heading=..&headingTolerance=35
 * - POST   /ar-portal/spots
 * - GET    /ar-portal/spots/:spotId/messages
 * - POST   /ar-portal/spots/:spotId/messages
 * - POST   /ar-portal/react
 * - DELETE /ar-portal/spots/:spotId
 * - DELETE /ar-portal/messages/:messageId
 */

export type ArGeo = { lat: number; lon: number };

export type ArSpot = {
  _id: string;
  name: string;
  geo: ArGeo;
  radiusMeters?: number;
  distanceMeters?: number;
  createdAt?: string;
  updatedAt?: string;
  bearingDeg?: number;
  createdBy?: string;
};

export type ArMedia = {
  url: string;
  mimeType?: string;
  size?: number;
  name?: string;
  thumbnailUrl?: string;
  duration?: number;
};

export type ArSpotMessage = {
  _id: string;
  spotId: string;
  senderId: any; // can be populated or raw id
  text?: string;
  messageType?: "text" | "image" | "video" | "sticker";
  media?: ArMedia;
  createdAt?: string;
  updatedAt?: string;
  reactions?: Array<{ userId: string; emoji: string; reactedAt: string }>;
};

export const createArSpot = (payload: {
  name: string;
  geo: ArGeo;
  radiusMeters?: number; // backend default is 100 in your controller
  bearingDeg?: number;   // optional but useful
  heading: number,
}) => api.post("/ar-portal/spots", payload);

export const listNearbyArSpots = (params: {
  lat: number;
  lon: number;
  radius?: number; // default 150
  heading?: number; // device compass heading (0..359)
  headingTolerance?: number; // relaxed degree filter, e.g. 35
}) =>
  api.get("/ar-portal/spots/nearby", {
    params: {
      lat: params.lat,
      lon: params.lon,
      radius: params.radius ?? 150,
      ...(params.heading !== undefined ? { heading: params.heading } : {}),
      ...(params.headingTolerance !== undefined
        ? { headingTolerance: params.headingTolerance }
        : {}),
    },
  });

export const getArSpotMessages = (spotId: string) =>
  api.get(`/ar-portal/spots/${spotId}/messages`);

export const postArSpotMessage = (
  spotId: string,
  payload: {
    text?: string;
    media?: ArMedia | null;
    messageType?: "text" | "image" | "video" | "sticker";
  }
) => api.post(`/ar-portal/spots/${spotId}/messages`, payload);

export const reactToArMessage = (payload: { messageId: string; emoji: string }) =>
  api.post("/ar-portal/react", payload);

export const deleteArSpot = (spotId: string) => {
  return api.delete(`/ar-portal/spots/${spotId}`);
};

export const deleteArMessage = (messageId: string) => {
  return api.delete(`/ar-portal/messages/${messageId}`);
};