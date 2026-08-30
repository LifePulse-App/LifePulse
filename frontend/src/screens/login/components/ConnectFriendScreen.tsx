import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Share, 
  Linking, 
  Platform, 
  StatusBar,
  ActivityIndicator,
  Animated,
  Image
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import { loginStyles } from './Loginstyles'; 
import socialApi from '../../friends/services/api_friends'; // ⚡ Hooked up to your real friend service
import { getAvatar } from '../../../storage/AvatarManager'; // ⚡ Utilizing your cached Avatar manager

const APP_LINK = "https://play.google.com/store/apps/details?id=com.streaksphere"; 
const INVITE_TEXT = `Hey👋
 Add me on StreakSphere! Let's explore new Era of Social Media together: ${APP_LINK}`;

export default function ConnectFriendsScreen() {
  const styles = loginStyles();
  const navigation = useNavigation<any>();
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<{ [key: string]: boolean }>({});
  const [avatarMap, setAvatarMap] = useState<Record<string, string | null>>({});

  // Background blob animations
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (animatedValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, { toValue: 1, duration: 9000, delay, useNativeDriver: true }),
          Animated.timing(animatedValue, { toValue: 0, duration: 9000, useNativeDriver: true }),
        ]),
      );
    makeLoop(anim1, 0).start();
    makeLoop(anim2, 1500).start();
    makeLoop(anim3, 3000).start();
  }, [anim1, anim2, anim3]);

  // 1. Fetch Live Suggested Users from Backend
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await socialApi.getSuggestedUsers(5);
        const data = (res?.data?.suggestions ?? []).filter((u: any) => u?._id);
        setSuggestedUsers(data);
      } catch (e) {
        console.log("Failed to fetch suggestions", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  // 2. Preload Avatars using your robust AvatarManager
  useEffect(() => {
    let isMounted = true;
    const preloadAvatars = async () => {
      const entries = await Promise.all(
        suggestedUsers.map(async (u: any) => {
          const raw = u.avatarThumbnailUrl || u.avatarUrl || (typeof u.avatar === "string" ? u.avatar : u.avatar?.url) || "";
          const local = await getAvatar(u._id, raw);
          return [u._id, local];
        })
      );
      if (!isMounted) return;
      setAvatarMap(Object.fromEntries(entries));
    };

    if (suggestedUsers.length > 0) {
      preloadAvatars();
    }
    return () => { isMounted = false; };
  }, [suggestedUsers]);

  // 3. Real Backend Friend Request Handler
  const sendFriendRequest = async (userId: string) => {
    setLoadingActions(userId);
    try {
      await socialApi.sendFriendRequest(userId);
      setSentRequests(prev => ({ ...prev, [userId]: true }));
    } catch (error) {
      console.log('Failed to send friend request', error);
    } finally {
      setLoadingActions(null);
    }
  };

  const inviteViaWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(INVITE_TEXT)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else openNativeShare();
    });
  };

  const inviteViaSMS = () => {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${separator}body=${encodeURIComponent(INVITE_TEXT)}`;
    Linking.openURL(url);
  };

  const openNativeShare = async () => {
    try {
      await Share.share({ message: INVITE_TEXT, title: 'Join StreakSphere' });
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  const finishOnboarding = () => {
    const isIOS26Plus = Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 26;
    if (isIOS26Plus) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'AppTabs' }],
        }),
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Drawer' }],
        }),
      );
    }
  };

  const renderSuggestedUser = ({ item }: any) => {
    const isSent = sentRequests[item._id] || item.requestSent;
    const isProcessing = loadingActions === item._id;
    const avatarUri = avatarMap[item._id];

    return (
      <View style={localStyles.userCard}>
        <View style={localStyles.userInfo}>
          {avatarUri ? (
            <FastImage source={{ uri: avatarUri }} style={localStyles.avatarImage} />
          ) : (
            <View style={localStyles.avatarPlaceholder}>
              <Text style={localStyles.avatarText}>{(item.name || item.username || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <View style={localStyles.userTextWrap}>
            <View style={localStyles.nameRow}>
              <Text style={localStyles.userName} numberOfLines={1}>{item.name ?? item.username}</Text>
              {item.tick === "golden" ? (
                <MaterialCommunityIcons name="check-decagram" size={14} color="#FBBF24" style={{ marginLeft: 4 }} />
              ) : item.tick === "verified" || item.isVerified ? (
                <MaterialCommunityIcons name="check-decagram" size={14} color="#38BDF8" style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            <Text style={localStyles.userHandle} numberOfLines={1}>@{item.username}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[localStyles.addButton, isSent && localStyles.sentButton]}
          onPress={() => sendFriendRequest(item._id)}
          disabled={isSent || isProcessing}
          activeOpacity={0.8}
        >
          <Text style={[localStyles.addButtonText, isSent && localStyles.sentButtonText]}>
            {isProcessing ? "Adding" : isSent ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.baseBackground} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.kbWrapper}>
        <View style={styles.appNameWrapper}>
          <Image 
            source={require('../../../shared/bootsplash/logo-bg.png')} 
            style={{ width: 180, height: 100, alignSelf: 'center', marginBottom: 0 }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.glassWrapper}>
          <View style={styles.glassContent}>
            <Text style={styles.mainTitle}>Find Your Friends</Text>
            <Text style={styles.mainSubtitle}>
              StreakSphere is better with friends. Add people or invite them below.
            </Text>

            <View style={localStyles.listContainer}>
              {loading ? (
                <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  data={suggestedUsers}
                  keyExtractor={item => item._id}
                  renderItem={renderSuggestedUser}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  ListEmptyComponent={
                    <Text style={localStyles.emptyText}>No suggestions available right now.</Text>
                  }
                  style={{ maxHeight: 210 }}
                />
              )}
            </View>

            <View style={localStyles.inviteSection}>
              <Text style={localStyles.sectionLabel}>Invite Externally</Text>
              <View style={localStyles.socialButtonsRow}>
                <TouchableOpacity style={localStyles.socialButton} onPress={inviteViaWhatsApp}>
                  <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
                </TouchableOpacity>
                <TouchableOpacity style={localStyles.socialButton} onPress={openNativeShare}>
                  <MaterialCommunityIcons name="instagram" size={22} color="#E1306C" />
                </TouchableOpacity>
                <TouchableOpacity style={localStyles.socialButton} onPress={inviteViaSMS}>
                  <MaterialCommunityIcons name="message-text" size={20} color="#0ea5e9" />
                </TouchableOpacity>
                <TouchableOpacity style={localStyles.socialButton} onPress={openNativeShare}>
                  <MaterialCommunityIcons name="share-variant" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={finishOnboarding} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={finishOnboarding} style={{ marginTop: 8 }} hitSlop={{ top: 10, bottom: 10 }}>
              <Text style={localStyles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  listContainer: {
    marginVertical: 4,
  },
  userCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(31, 41, 55, 0.8)', 
    padding: 10, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)'
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarPlaceholder: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: 'rgba(139, 92, 246, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  avatarImage: {
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    marginRight: 10,
  },
  avatarText: { 
    color: '#C4B5FD', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  userTextWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: { 
    color: '#F8FAFC', 
    fontWeight: '700', 
    fontSize: 13,
  },
  userHandle: { 
    color: '#94A3B8', 
    fontSize: 11,
    marginTop: 1,
  },
  addButton: { 
    backgroundColor: 'rgba(99, 102, 241, 0.3)', 
    borderColor: 'rgba(99, 102, 241, 0.6)',
    borderWidth: 1,
    paddingVertical: 6, 
    paddingHorizontal: 16, 
    borderRadius: 8,
  },
  sentButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  addButtonText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 12 
  },
  sentButtonText: {
    color: '#94A3B8',
  },
  emptyText: { 
    color: '#64748B', 
    textAlign: 'center', 
    fontSize: 12, 
    marginVertical: 10 
  },
  inviteSection: {
    marginVertical: 12,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialButtonsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  socialButton: { 
    flex: 1,
    height: 44, 
    borderRadius: 10, 
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    marginHorizontal: 4,
  },
  skipText: { 
    color: '#94A3B8', 
    textAlign: 'center', 
    fontSize: 12, 
    fontWeight: '500' 
  },
});