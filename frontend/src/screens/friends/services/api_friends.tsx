import client from "../../../auth/api-client/api_client";

type GenericResponse = { message?: string; [k: string]: any };
type FriendStatusResponse = { isFriend: boolean; requestSent?: boolean; requestIncoming?: boolean };
type FriendsListResponse = { friends: Array<{ _id: string; name: string; username?: string; avatar?: any; since?: string }> };
type PendingRequestsResponse = { requests: Array<{ _id: string; name: string; username?: string; avatar?: any; requestedAt?: string }> };
type SearchUsersResponse = { user: Array<{ _id: string; name: string; username?: string; avatar?: any; isFriend?: boolean; requestSent?: boolean; requestIncoming?: boolean }>; filteredUsersCount: number };
type SuggestedUsersResponse = { suggestions: Array<{ _id: string; name: string; username?: string; avatar?: any; isFriend?: boolean; requestSent?: boolean; requestIncoming?: boolean }> };

// Send a friend request
const sendFriendRequest = async (targetUserId: string) => {
  try {
    return await client.post<GenericResponse>(`/friends/request/${targetUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Accept a friend request (requesterId -> me)
const acceptFriendRequest = async (requesterId: string) => {
  try {
    return await client.post<GenericResponse>(`/friends/accept/${requesterId}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Remove/decline/cancel a pending request
const removeFriendRequest = async (requesterId: string) => {
  try {
    return await client.post<GenericResponse>(`/friends/remove/${requesterId}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Unfriend
const unfriend = async (userId: string) => {
  try {
    return await client.post<GenericResponse>(`/friends/unfriend/${userId}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Friend status
const getFriendStatus = async (userId: string) => {
  try {
    return await client.get<FriendStatusResponse>(`/friends/status/${userId}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// My friends list
const getFriends = async () => {
  try {
    return await client.get<FriendsListResponse>(`/friends/list`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Incoming pending requests
const getPendingFriendRequests = async () => {
  try {
    return await client.get<PendingRequestsResponse>(`/friends/pending`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Search users (with friend flags)
const searchUsers = async (query: string) => {
  try {
    return await client.get<SearchUsersResponse>(`/friends/search${query ? `?${query}` : ""}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

// Suggested users (not yet friends)
const getSuggestedUsers = async (limit = 6) => {
  try {
    return await client.get<SuggestedUsersResponse>(`/friends/suggested?limit=${limit}`);
  } catch (error: any) {
    if (!error.response) throw new Error("Server is offline, try again later.");
    throw error;
  }
};

export default {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendRequest,
  unfriend,
  getFriendStatus,
  getFriends,
  getPendingFriendRequests,
  searchUsers,
  getSuggestedUsers,
};