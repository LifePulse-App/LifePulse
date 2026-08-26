// src/utils/handleNotificationPress.ts
import { navigationRef } from './src/navigation/main/RootNavigation';

export function handleNotificationPress(data: any) {
  const type = data?.type;
  if (!type) return;
  if (type === 'incoming_call') {
    return; 
  }

  // Small delay to ensure navigator is ready
  setTimeout(() => {
    if (type === 'chat' && data.peerUserId) {
      navigationRef.current?.navigate('chat', {
        peerUserId: data.peerUserId,
        peerName: data.peerName,
      });
    } else if (type === 'friend_request') {
      navigationRef.current?.navigate('FriendRequests');
    } else if (type === 'friend_accepted' || type === 'friend_declined' || type === 'friend_removed') {
      navigationRef.current?.navigate('Friends');
    } else if (type === 'streak_reminder' || type === 'streak_ending' || type === 'streak_lost' || type === 'streak_milestone') {
      navigationRef.current?.navigate('Home');
    } else if (type === 'leaderboard_refresh' || type === 'leaderboard_rank_up' || type === 'leaderboard_rank_down') {
      navigationRef.current?.navigate('Leaderboard');
    } else if (type === 'mood_map' || type === 'mood_map_trending') {
      navigationRef.current?.navigate('MoodMap');
    } else if (type === 'daily_challenge' || type === 'challenge_completed') {
      navigationRef.current?.navigate('Challenges');
    } else if (type === 'weekly_recap' || type === 'points_milestone') {
      navigationRef.current?.navigate('Profile');
    } else if (type === 'admin_broadcast' || type === 'admin_direct' || type === 'welcome_back') {
      navigationRef.current?.navigate('Home');
    }
  }, 300);
}