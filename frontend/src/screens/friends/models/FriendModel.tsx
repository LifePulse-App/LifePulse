// User profile with optional fields
export interface UserProfile {
    _id: string;
    username: string;
    avatar: string;
    bio?: string;
    // Add more fields as needed
  }
  
  // For follow status check
  export interface FollowStatusResponse {
    isFollowing: boolean;
    isRequestSent: boolean;
  }
  
  // For followers list
  export interface Follower {
    user: UserProfile;
    followedAt?: string;
  }
  export interface FollowersListResponse {
    followers: Follower[];
  }
  
  // For following list
  export interface Following {
    user: UserProfile;
    followedAt?: string;
  }
  export type FollowingListResponse = Following[];
  
  // For pending follow requests
  export interface FollowRequest {
    user: UserProfile;
    requestedAt: string;
  }
  export interface FollowRequestsResponse {
    pendingRequests: FollowRequest[];
  }
  
  // For suggested users
  export interface SuggestedUsersResponse {
    suggestions: UserProfile[];
  }
  
  // For generic responses (e.g. success, error)
  export interface GenericResponse {
    message: string;
    success?: boolean;
    [key: string]: any;
  }