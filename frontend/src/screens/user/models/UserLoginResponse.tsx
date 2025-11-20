export interface ProviderInfo {
  provider: "google" | "apple";
  providerId: string;
  deviceId?: string;
}

export interface AvatarInfo {
  public_id?: string;
  url?: string;
}

export interface RefreshTokenInfo {
  token: string;
  deviceId?: string;
  expiresAt: number;
}

export interface DeviceInfo {
  deviceName?: string;
  deviceBrand?: string;
  deviceModel?: string;
}

export interface StreakInfo {
  count: number;
  lastUpdated?: string;
}
export interface user {
id: string; // Mongo _id
name: string;
username?: string;
email: string;
phone?: string;
}

export interface UserLoginResponse {
  user: user
  role: string;
  isVerified: boolean;
  currentTitle?: string;
  xp: number;
  streak: StreakInfo;
  avatar?: AvatarInfo;
  providers?: ProviderInfo[];
  deviceInfo?: DeviceInfo[];
  refreshTokens?: RefreshTokenInfo[];
  accessToken: string;   // JWT from backend
  refreshToken: string;  // JWT from backend
  createdAt: string;
  updatedAt: string;
  UserName: string;
  Password: string;
}
