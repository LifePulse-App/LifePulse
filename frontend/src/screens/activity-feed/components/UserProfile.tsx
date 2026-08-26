import React, { useState, useEffect, useContext } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  useWindowDimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import RNFS from "react-native-fs";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚡ IMPORT YOUR API CLIENTS & CONTEXT
import FeedAPI from "../services/api_feed"; 
import apiClient from "../../../auth/api-client/api_client";
import AuthContext from "../../../auth/user/UserContext";

const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

// ============================================================
// LOCAL AVATAR CACHING HELPERS
// ============================================================
const BASE_DIR = RNFS.DocumentDirectoryPath + "/streaksphere/avatar";
const BASE_URL = apiClient.getBaseURL(); 
const baseUrl = apiClient.getBaseURL();
const newUrl = baseUrl.replace(/\/api\/?$/, "");

const ensureDir = async () => {
  const exists = await RNFS.exists(BASE_DIR);
  if (!exists) {
    await RNFS.mkdir(BASE_DIR);
  }
};

const getLocalAvatarPath = (userId: string) => `${BASE_DIR}/${userId}.jpg`;
const getVersionKey = (userId: string) => `avatar_version_${userId}`;

const cacheAvatar = async (userId: string, url: string, avatarVersion: number) => {
  try {
    await ensureDir();
    if (!url) return null;

    const localPath = getLocalAvatarPath(userId);
    const fullUrl = url.startsWith("http") 
      ? url 
      : (url.startsWith('/') ? newUrl + url : `${newUrl}/${url}`);

    const downloadResult = await RNFS.downloadFile({
      fromUrl: fullUrl,
      toFile: localPath,
      connectionTimeout: 30000, 
      readTimeout: 30000,       
    }).promise;

    if (downloadResult.statusCode === 200) {
      await AsyncStorage.setItem(getVersionKey(userId), String(avatarVersion || 1));
      return "file://" + localPath;
    }
    return null;
  } catch (e) {
    console.log("avatar cache error", e);
    return null;
  }
};

const getCachedAvatar = async (userId: string, url: string, avatarVersion = 1) => {
  try {
    if (!url) return null;
    const localPath = getLocalAvatarPath(userId);
    const exists = await RNFS.exists(localPath);
    const savedVersion = await AsyncStorage.getItem(getVersionKey(userId));

    const versionChanged = String(savedVersion) !== String(avatarVersion);

    if (exists && !versionChanged) return "file://" + localPath;
    if (exists && versionChanged) await RNFS.unlink(localPath);

    return await cacheAvatar(userId, url, avatarVersion);
  } catch (err) {
    console.log(err);
    return null;
  }
};

const UserProfile = ({ route, navigation }: any) => {
  const authContext = useContext(AuthContext);
  
  const loggedInUser = authContext?.User?.user || authContext?.User || authContext;
  const CURRENT_USER_ID = loggedInUser?.id || loggedInUser?._id;

  const routeUserId = route.params?.userId;
  const userId = routeUserId || CURRENT_USER_ID;
  const isCurrentUser = !routeUserId || String(userId) === String(CURRENT_USER_ID) || userId === "current-user-id";

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const THUMBNAIL_SIZE = SCREEN_WIDTH / 3;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [cachedAvatarUri, setCachedAvatarUri] = useState<string | null>(null);

  const [postToDelete, setPostToDelete] = useState<any>(null);

  // ⚡ STATE FOR CUSTOM GLASSY ALERT
  const [glassAlertVisible, setGlassAlertVisible] = useState(false);
  const [glassAlertConfig, setGlassAlertConfig] = useState({ title: "", message: "", type: "error" });

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        let profileData = null;

        const res: any = await apiClient.get(`/friends/preview/${userId}`);
        const data = res?.data || res;
        profileData = {
          id: data.user._id,
          name: data.user.name,
          username: data.user.username,
          avatar: data.user.avatarUrl || data.user.avatar?.url || "",
          avatarVersion: data.user.avatarVersion || 1,
          bio: data.user.title || "Building awesome habits 🚀",
          tick: data.user.tick || "none",
          isPremium: data.user.isPremium || false,
        };

        setProfile(profileData);

        if (profileData.avatar) {
          const localUri = await getCachedAvatar(profileData.id, profileData.avatar, profileData.avatarVersion);
          setCachedAvatarUri(localUri || profileData.avatar);
        }

        try {
          const userPostsRes: any = await FeedAPI.GetUserPosts(userId);
          const rawPosts = userPostsRes?.posts || userPostsRes?.data?.posts || [];

          const formattedUserPosts = rawPosts.map((post: any) => {
            const cleanPath = post.mediaUrl ? post.mediaUrl.replace(/\\/g, '/') : '';
            const fullImageUrl = cleanPath.startsWith("http") 
              ? cleanPath 
              : `${BASE_URL}${cleanPath}`;
            
            return {
              ...post,
              mediaUrl: fullImageUrl,
            };
          });

          setPosts(formattedUserPosts);
        } catch (err) {
          const feedRes: any = await FeedAPI.GetFeed("world");
          const allPosts = feedRes?.posts || feedRes?.data?.posts || [];
          const filtered = allPosts.filter((p: any) => String(p.user?.id) === String(userId));
          
          const formattedFallback = filtered.map((post: any) => {
            const cleanPath = post.mediaUrl ? post.mediaUrl.replace(/\\/g, '/') : '';
            const fullImageUrl = cleanPath.startsWith("http") 
              ? cleanPath 
              : `${BASE_URL}${cleanPath}`;

            return { ...post, mediaUrl: fullImageUrl };
          });

          setPosts(formattedFallback);
        }

      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  const totalLikes = posts.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);

  const executeDeletePost = async () => {
    if (!postToDelete) return;
    const targetId = postToDelete.id;
    setPostToDelete(null);

    try {
      await FeedAPI.DeletePost(targetId);
      setPosts(prev => prev.filter(p => p.id !== targetId));
    } catch (err) {
      console.error("Failed to delete post", err);
    }
  };

  if (loading || !profile) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Image source={{ uri: cachedAvatarUri || profile.avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
      
      <View style={styles.nameRow}>
        <Text style={styles.nameText}>{profile.name}</Text>
        
        {profile.tick === "golden" ? (
          <Icon name="check-decagram" size={18} color="#FBBF24" style={{ marginLeft: 4 }} />
        ) : profile.tick === "verified" ? (
          <Icon name="check-decagram" size={18} color="#38BDF8" style={{ marginLeft: 4 }} />
        ) : null}

        {profile.isPremium && (
          <Icon name="crown" size={16} color="#F59E0B" style={{ marginLeft: 4 }} />
        )}
      </View>

      <Text style={styles.usernameText}>@{profile.username}</Text>
      
      <View style={styles.statsRowSingle}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalLikes}</Text>
          <Text style={styles.statLabel}>Total Likes</Text>
        </View>
      </View>

      <View style={styles.horizontalDivider} />
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navIcon}>
          <Icon name="arrow-left" size={26} color="#F9FAFB" />
        </TouchableOpacity>
      </View>

      {/* Profile Posts Grid */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="image-outline" size={48} color="#475569" />
            <Text style={styles.emptyText}>No activity posts yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              if (item.adminRemoved) {
                // ⚡ TRIGGER GLASSY CARD INSTEAD OF NATIVE ALERT
                setGlassAlertConfig({
                  title: "Post Removed",
                  message: "This post was removed because it violated our community guidelines.",
                  type: "error"
                });
                setGlassAlertVisible(true);
              } else {
                navigation.navigate("UserFeedScreen", { 
                  userId: userId, 
                  initialPostId: item.id 
                });
              }
            }}
            onLongPress={() => { if (isCurrentUser && !item.adminRemoved) setPostToDelete(item); }}
          >
            <View style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, padding: 1 }}>
              
              {item.adminRemoved ? (
                <View style={[styles.thumbnailImg, { backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' }]}>
                  <Icon name="shield-alert-outline" size={26} color="#EF4444" />
                </View>
              ) : (
                <>
                  <Image source={{ uri: item.mediaUrl }} style={styles.thumbnailImg} />
                  <View style={styles.viewsOverlay}>
                    <Icon name="heart" size={12} color="#EF4444" />
                    <Text style={styles.viewsText}>{item.likesCount || 0}</Text>
                  </View>
                </>
              )}

            </View>
          </TouchableOpacity>
        )}
      />

      {/* CUSTOM GLASSY DELETE CONFIRMATION MODAL CARD */}
      {postToDelete && (
        <View style={styles.glassModalOverlay}>
          <View style={styles.glassModalCard}>
            <View style={styles.glassModalIconWrap}>
              <Icon name="trash-can-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.glassModalTitle}>Delete Post</Text>
            <Text style={styles.glassModalSubText}>Are you sure you want to permanently delete this post?</Text>

            <View style={styles.glassModalButtonRow}>
              <TouchableOpacity 
                style={styles.glassModalCancelBtn} 
                onPress={() => setPostToDelete(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.glassModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.glassModalDeleteBtn} 
                onPress={executeDeletePost}
                activeOpacity={0.8}
              >
                <Text style={styles.glassModalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ⚡ CUSTOM GLASSY ALERT MODAL */}
      <Modal
        visible={glassAlertVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setGlassAlertVisible(false)}
      >
        <View style={styles.glassModalOverlay}>
          <View style={styles.glassModalCard}>
            <View style={[
              styles.glassModalIconWrap, 
              { backgroundColor: glassAlertConfig.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                borderColor: glassAlertConfig.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }
            ]}>
              <Icon 
                name={glassAlertConfig.type === 'success' ? "check-circle-outline" : "alert-circle-outline"} 
                size={32} 
                color={glassAlertConfig.type === 'success' ? "#10B981" : "#EF4444"} 
              />
            </View>
            <Text style={styles.glassModalTitle}>{glassAlertConfig.title}</Text>
            <Text style={styles.glassModalSubText}>{glassAlertConfig.message}</Text>
            
            <TouchableOpacity 
              style={[styles.glassModalBtn, { width: '100%', marginTop: 8 }]} 
              onPress={() => setGlassAlertVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.glassModalBtnText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 15, paddingHorizontal: 16, marginTop: 10 },
  navIcon: { width: 40, alignItems: "center" },
  headerContainer: { alignItems: "center", paddingVertical: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: "#8B5CF6", marginBottom: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  nameText: { color: "#F9FAFB", fontSize: 18, fontWeight: "700" },
  usernameText: { color: "#9CA3AF", fontSize: 14, marginTop: 2 },
  statsRowSingle: { flexDirection: "row", alignItems: "center", marginTop: 16, justifyContent: "center" },
  statBox: { alignItems: "center", paddingHorizontal: 20 },
  statNumber: { color: "#F9FAFB", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#94A3B8", fontSize: 12, marginTop: 4 },
  horizontalDivider: { width: "80%", height: 1, backgroundColor: "rgba(148, 163, 184, 0.2)", marginTop: 16 },
  thumbnailImg: { width: "100%", height: "100%", backgroundColor: "#1E293B" },
  viewsOverlay: { position: "absolute", bottom: 6, left: 6, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  viewsText: { color: "#fff", fontSize: 11, fontWeight: "600", marginLeft: 4 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: "#64748B", fontSize: 14, marginTop: 10 },

  glassModalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", zIndex: 99999, elevation: 99999, paddingHorizontal: 24 },
  glassModalCard: { width: "100%", maxWidth: 340, backgroundColor: "rgba(15, 23, 42, 0.95)", borderRadius: 24, borderWidth: 1, borderColor: GLASS_BORDER, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.6, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 20 },
  glassModalIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.3)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  glassModalTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  glassModalSubText: { color: "#94A3B8", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 24 },
  glassModalButtonRow: { flexDirection: "row", width: "100%", justifyContent: "space-between" },
  glassModalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: "rgba(148, 163, 184, 0.15)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", alignItems: "center", marginRight: 8 },
  glassModalCancelText: { color: "#CBD5E1", fontSize: 14, fontWeight: "600" },
  glassModalDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: "#EF4444", alignItems: "center", marginLeft: 8 },
  glassModalDeleteText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  glassModalBtn: { paddingVertical: 14, borderRadius: 14, backgroundColor: "rgba(148, 163, 184, 0.15)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", alignItems: "center" },
  glassModalBtnText: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
});

export default UserProfile;