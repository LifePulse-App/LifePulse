import client from '../../../auth/api-client/api_client';
import {
  UserProfile,
  FollowStatusResponse,
  FollowersListResponse,
  FollowingListResponse,
  FollowRequestsResponse,
  SuggestedUsersResponse,
  GenericResponse
} from '../models/FriendModel';

// Follow a user
const followUser = async (userId: string, currentUserId: string) => {
  try {
    return await client.post<GenericResponse>(`/social/follow/${userId}/${currentUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Unfollow a user
const unfollowUser = async (userId: string, currentUserId: string) => {
  try {
    return await client.post<GenericResponse>(`/social/unfollow/${userId}/${currentUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Accept follow request
const acceptFollowRequest = async (userId: string, requesterId: string) => {
  try {
    return await client.post<GenericResponse>(`/social/follow-accept/${userId}/${requesterId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Remove follow request
const removeFollowRequest = async (userId: string, requesterId: string) => {
  try {
    return await client.post<GenericResponse>(`/social/remove-request/${userId}/${requesterId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get follow requests for current user
const getFollowRequests = async () => {
  try {
    return await client.get<FollowRequestsResponse>('/social/follow-requests');
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get follow status
const getFollowStatus = async (userId: string, currentUserId: string) => {
  try {
    return await client.get<FollowStatusResponse>(`/social/follow-status/${userId}/${currentUserId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get followers list
const getFollowersList = async (userId: string) => {
  try {
    return await client.get<FollowersListResponse>(`/social/followers/${userId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get following list
const getFollowingList = async (userId: string) => {
  try {
    return await client.get<FollowingListResponse>(`/social/following/${userId}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get specific user profile
const getSpecificUser = async (id: string) => {
  try {
    return await client.get<UserProfile>(`/social/user/${id}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Search users
const searchUsers = async (query: string) => {
  try {
    return await client.get<UserProfile[]>(`/social/search${query ? `?${query}` : ''}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

// Get suggested users
const getSuggestedUsers = async (limit = 6) => {
  try {
    return await client.get<SuggestedUsersResponse>(`/social/suggestion-users?limit=${limit}`);
  } catch (error: any) {
    if (!error.response) throw new Error('Server is offline, try again later.');
    throw error;
  }
};

export default {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  removeFollowRequest,
  getFollowRequests,
  getFollowStatus,
  getFollowersList,
  getFollowingList,
  getSpecificUser,
  searchUsers,
  getSuggestedUsers,
};