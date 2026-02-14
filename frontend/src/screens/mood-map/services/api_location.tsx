import client from "../../../auth/api-client/api_client";

export type ShareMode = "all" | "none" | "custom";

export const updateMyLocation = (lng: number, lat: number) =>
  client.post("/location/update", { lng, lat });

export const setLocationShare = (shareMode: ShareMode, sharedWith: string[] = []) =>
  client.post("/location/share", { shareMode, sharedWith });

export const getFriendsLocations = () =>
  client.get("/location/friends");

export default {
  updateMyLocation,
  setLocationShare,
  getFriendsLocations,
};