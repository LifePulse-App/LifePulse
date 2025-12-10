import client from '../../../auth/api-client/api_client';

export const getMonthlyLeaderboard = (scope: string, country?: string, city?: string) =>
  client.get('/leaderboard/monthly', { params: { scope, country, city } });

export const getPermanentLeaderboard = (scope: string, country?: string, city?: string) =>
  client.get('/leaderboard/permanent', { params: { scope, country, city } });

// Set/update the user’s saved location
export const updateLocation = (country: string, city?: string) =>
  client.post('/profile/me/location', { country, city });

// Get location lock status
export const getLocationLockStatus = () =>
  client.get('/profile/me/location/lock');