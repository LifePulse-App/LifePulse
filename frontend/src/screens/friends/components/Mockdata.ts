// Types for consistency
export type FriendUser = {
    id: string;
    name: string;
    username: string;
    avatarColor?: string;
  };
  
  export type FriendRequest = {
    id: string;
    name: string;
    username: string;
    avatarColor?: string;
    requestedAt: string;
  };
  
  // Suggested users
  export const MOCK_SUGGESTIONS: FriendUser[] = [
    { id: "1", name: "Alice Johnson", username: "@alice", avatarColor: "#F97316" },
    { id: "2", name: "Mark Davis", username: "@mark", avatarColor: "#22C55E" },
    { id: "3", name: "Sophia Lee", username: "@sophia", avatarColor: "#38BDF8" },
  ];
  
  // All users for searching
  export const MOCK_ALL_USERS: FriendUser[] = [
    ...MOCK_SUGGESTIONS,
    { id: "4", name: "John Doe", username: "@john" },
    { id: "5", name: "Emily Parker", username: "@emily" },
    { id: "6", name: "David Kim", username: "@david" },
  ];
  
  // Mock friend requests
  export const MOCK_FRIEND_REQUESTS: FriendRequest[] = [
    { id: "7", name: "Brian Rose", username: "@brian", avatarColor: "#F59E42", requestedAt: "2025-10-15T13:22:00Z" },
    { id: "8", name: "Linda Xu", username: "@linda", avatarColor: "#0EA5E9", requestedAt: "2025-11-01T09:10:00Z" },
    { id: "9", name: "Carlos Vega", username: "@carlos", avatarColor: "#A3E635", requestedAt: "2025-09-20T17:55:00Z" },
    { id: "10", name: "Jen Smith", username: "@jen", avatarColor: "#E879F9", requestedAt: "2025-08-18T19:30:00Z" },
  ];