import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Platform 
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LoaderKitView from 'react-native-loader-kit';
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import apiClient from "../../../auth/api-client/api_client";
import { useFocusEffect } from "@react-navigation/native";

const BLOCKED_USERS_CACHE_KEY = 'settings:blockedUsers:list:v1';

export default function BlockedUsersScreen({ navigation }: any) {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const [offline, setOffline] = useState(false);
  const offlineRef = useRef(false);

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  // 1. Setup Network Listener
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });

    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  // 2. Fetch and Cache Logic
  const loadBlockedUsers = useCallback(async () => {
    let hasCachedData = false;

    // A. Load from Cache First (Instant UI)
    try {
      const cachedRaw = await AsyncStorage.getItem(BLOCKED_USERS_CACHE_KEY);
      if (cachedRaw) {
        setBlockedUsers(JSON.parse(cachedRaw));
        hasCachedData = true;
        setLoading(false); // Stop loading spinner instantly
      }
    } catch (e) {
      console.log("Cache read error:", e);
    }

    // B. Stop if Offline
    if (offlineRef.current) {
      if (!hasCachedData) setLoading(false);
      return;
    }

    // C. Fetch fresh data from backend
    try {
      const response = await apiClient.get('/friends/user/blocked');
      if (response.data && response.data.success) {
        const freshData = response.data.blockedUsers;
        setBlockedUsers(freshData);
        // Overwrite cache with fresh data
        await AsyncStorage.setItem(BLOCKED_USERS_CACHE_KEY, JSON.stringify(freshData));
      }
    } catch (error) {
      console.log("Failed to fetch blocked users", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when screen mounts or comes into focus
  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers();
    }, [loadBlockedUsers])
  );

  // 3. Unblock logic (Updates state and cache instantly)
  const handleUnblock = async (targetId: string) => {
    setUnblockingId(targetId);
    try {
      await apiClient.post(`/friends/user/${targetId}/unblock`);
      
      // Update local state instantly for snappy UI
      const updatedList = blockedUsers.filter(user => user._id !== targetId);
      setBlockedUsers(updatedList);
      
      // Update Cache instantly
      await AsyncStorage.setItem(BLOCKED_USERS_CACHE_KEY, JSON.stringify(updatedList));
      
    } catch (error) {
      console.log("Failed to unblock user", error);
    } finally {
      setUnblockingId(null);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Blocked Users</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderOfflineBanner = () => {
    if (!offline) return null;
    return (
      <View style={styles.offlineBanner}>
        <Icon name="wifi-off" size={14} color="#94A3B8" />
        <Text style={styles.offlineText}>Offline — showing cached data</Text>
      </View>
    );
  };

  if (loading && blockedUsers.length === 0) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <View style={styles.centerContent}>
          <LoaderKitView
            style={{ width: 45, height: 45 }}
            name={'BallSpinFadeLoader'}
            color={'#6366f1'}
          />
          <Text style={styles.loadingText}>Fetching accounts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderOfflineBanner()}

        <View style={styles.card}>

          {blockedUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Icon name="account-check-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {blockedUsers.map(user => {
                const avatarUri = user.avatarUrl 
                  ? (user.avatarUrl.startsWith("http") ? user.avatarUrl : newUrl + user.avatarUrl) 
                  : null;

                return (
                  <View key={user._id} style={styles.userCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Icon name="account" size={24} color="#818CF8" />
                        </View>
                      )}
                      
                      <View style={styles.textContainer}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={styles.nameText} numberOfLines={1}>{user.name}</Text>
                          {user.tick === "verified" && <Icon name="check-decagram" size={14} color="#3b82f6" style={{ marginLeft: 4 }} />}
                        </View>
                        <Text style={styles.usernameText}>@{user.username}</Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.unblockBtn} 
                      onPress={() => handleUnblock(user._id)}
                      disabled={unblockingId === user._id || offline}
                      activeOpacity={0.8}
                    >
                      {unblockingId === user._id ? (
                        <LoaderKitView
                          style={{ width: 16, height: 16 }}
                          name={'BallSpinFadeLoader'}
                          color={'#F87171'}
                        />
                      ) : (
                        <Text style={[styles.unblockBtnText, offline && { opacity: 0.5 }]}>Unblock</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617', 
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? '3%' : '5%',
    paddingBottom: 20, 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 20,
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
  },

  // List Styles
  listContainer: {
    marginTop: 10,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25 
  },
  avatarFallback: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: "rgba(99,102,241,0.15)", 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)"
  },
  textContainer: { 
    marginLeft: 14, 
    flex: 1, 
    overflow: "hidden" 
  },
  nameText: { 
    color: "#F9FAFB", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  usernameText: { 
    color: "#94A3B8", 
    fontSize: 13, 
    marginTop: 4 
  },
  unblockBtn: { 
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 12,
    minWidth: 85,
    alignItems: "center",
    justifyContent: "center",
  },
  unblockBtnText: { 
    color: "#F87171", 
    fontWeight: "700", 
    fontSize: 13 
  },
});