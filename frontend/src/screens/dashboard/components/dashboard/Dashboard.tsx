import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "@rneui/themed";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Icon1 from "react-native-vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import RNFS from "react-native-fs";

import MainLayout from "../../../../shared/components/MainLayout";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import DashboardService from "../../services/api_dashboard";
import socialApi from "../../../friends/services/api_friends";
import FeedAPI from "../../../activity-feed/services/api_feed"; 
import DeviceInfo from "react-native-device-info";
import { ensureDeviceKeys } from "../../../chat/services/bootstrap"; 
import AuthContext from "../../../../auth/user/UserContext";
import { getStableDeviceId } from "../../../../shared/services/stableDeviceId";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FastImage from "react-native-fast-image";

import { getAvatar } from "../../../../storage/AvatarManager"; 
import api_profile from "../../../profile/services/api_profile";
import apiClient from "../../../../auth/api-client/api_client"; 

const BASE_DIR = RNFS.DocumentDirectoryPath + "/streaksphere/avatar";
const baseUrl = apiClient.getBaseURL();
const newUrl = baseUrl.replace(/\/api\/?$/, "");

const DASHBOARD_CACHE_KEY = "dashboard:summary:v1";
const TODAY_HABITS_CACHE_KEY = "dashboard:todayHabits:v1";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";
const ICON_GLASS_BG = "rgba(15, 23, 42, 0)";

const MOOD_METADATA: Record<
  string,
  { label: string; icon: string; color?: string }
> = {
  ecstatic: { label: "Ecstatic", icon: "emoticon-excited-outline", color: "#FACC15" },
  happy: { label: "Happy", icon: "emoticon-happy-outline", color: "#FBBF24" },
  grateful: { label: "Grateful", icon: "hand-heart-outline", color: "#F97316" },
  calm: { label: "Calm", icon: "meditation", color: "#22C55E" },
  relaxed: { label: "Relaxed", icon: "emoticon-neutral-outline", color: "#38BDF8" },
  lovely: { label: "Lovely", icon: "heart-outline", color: "#FB7185" },

  neutral: { label: "Okay", icon: "emoticon-neutral-outline", color: "#9CA3AF" },
  meh: { label: "Meh", icon: "minus-circle-outline", color: "#9CA3AF" },
  tired: { label: "Tired", icon: "sleep", color: "#818CF8" },
  confused: { label: "Confused", icon: "help-circle-outline", color: "#F97316" },

  sad: { label: "Sad", icon: "emoticon-sad-outline", color: "#60A5FA" },
  lonely: { label: "Lonely", icon: "account-off-outline", color: "#6B7280" },
  discouraged: { label: "Discouraged", icon: "arrow-down-bold-circle-outline", color: "#F97316" },
  numb: { label: "Numb", icon: "emoticon-dead-outline", color: "#9CA3AF" },

  anxious: { label: "Anxious", icon: "alert-circle-outline", color: "#F97316" },
  stressed: { label: "Stressed", icon: "clock-alert-outline", color: "#FBBF24" },
  overwhelmed: { label: "Overwhelmed", icon: "water", color: "#38BDF8" },

  annoyed: { label: "Annoyed", icon: "emoticon-angry-outline", color: "#FB923C" },
  frustrated: { label: "Frustrated", icon: "emoticon-angry-outline", color: "#F97316" },
  angry: { label: "Angry", icon: "emoticon-angry-outline", color: "#EF4444" },
};

type Comment = {
  id: string;
  postId: string;
  parentId?: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    avatarVersion?: number;
    isVerified?: boolean;
    tick?: string;        
    isPremium?: boolean;  
    isAdmin?: boolean;
  };
  text: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
};

const Dashboard = ({ navigation }: any) => {
  const [isCheckingCache, setIsCheckingCache] = useState(true); 
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendReqCount, setFriendReqCount] = useState(0);
  const userContext = useContext(AuthContext);
  const user = userContext?.User?.user;
  const userr = userContext?.User;
  const myUserId = user?.id;

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const [finalAvatarUri, setFinalAvatarUri] = useState<string | null>(null);
  const [userBadges, setUserBadges] = useState({ tick: null, isPremium: false });

  const [profile, setProfile] = useState<any>(null);
  const [secondaryCards, setSecondaryCards] = useState<any>(null);
  const [habits, setHabits] = useState([]);
  const [currentMood, setCurrentMood] = useState<any>(null);
  const [friendsMoods, setFriendsMoods] = useState<any[]>([]);

  // ============================================================
  // ACTIVITY FEED STATE
  // ============================================================
  const [activeTab, setActiveTab] = useState<"foryou" | "world" | "country" | "city" | "friends">("foryou");
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [cachedAvatars, setCachedAvatars] = useState<{ [key: string]: string }>({});

  const [glassAlertVisible, setGlassAlertVisible] = useState(false);
  const [glassAlertConfig, setGlassAlertConfig] = useState({ title: "", message: "", type: "success" });

  const reportSheetRef = useRef<TrueSheet>(null);
  const [selectedPostForReport, setSelectedPostForReport] = useState<any>(null);

  const commentsSheetRef = useRef<TrueSheet>(null);
  const commentInputRef = useRef<TextInput>(null);
  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Double-tap heart state for inline feed posts
  const lastTapRef = useRef<{ [key: string]: number }>({});
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const [activeHeartPostId, setActiveHeartPostId] = useState<string | null>(null);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const triggerHeartAnimation = (postId: string) => {
    setActiveHeartPostId(postId);
    heartScale.value = 0.4;
    heartOpacity.value = 1;
    heartScale.value = withSequence(
      withSpring(1.25, { damping: 6, stiffness: 250 }),
      withTiming(1, { duration: 100 })
    );
    heartOpacity.value = withTiming(0, { duration: 450 }, (finished) => {
      if (finished) runOnJS(setActiveHeartPostId)(null);
    });
  };

  const handleImageDoubleTap = (postId: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    const lastTap = lastTapRef.current[postId] || 0;

    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      const targetPost = posts.find((post) => post.id === postId);
      if (targetPost && !targetPost.isLiked) {
        handleLike(postId);
      }
      triggerHeartAnimation(postId);
    } else {
      lastTapRef.current[postId] = now;
    }
  };

  // Keyboard listener for comments sheet
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height - 175));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const getTimeAgo = (dateInput: string) => {
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `Just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  };

  const ensureDir = async () => {
    const exists = await RNFS.exists(BASE_DIR);
    if (!exists) await RNFS.mkdir(BASE_DIR);
  };

  const getCachedAvatarFeed = async (userId: string, url: string, avatarVersion = 1) => {
    try {
      if (!url) return null;
      await ensureDir();
      const localPath = `${BASE_DIR}/${userId}.jpg`;
      const exists = await RNFS.exists(localPath);
      const savedVersion = await AsyncStorage.getItem(`avatar_version_${userId}`);
      if (exists && String(savedVersion) === String(avatarVersion)) return "file://" + localPath;
      if (exists) await RNFS.unlink(localPath);

      const fullUrl = url.startsWith("http") ? url : (url.startsWith('/') ? newUrl + url : `${newUrl}/${url}`);
      const res = await RNFS.downloadFile({ fromUrl: fullUrl, toFile: localPath }).promise;
      if (res.statusCode === 200) {
        await AsyncStorage.setItem(`avatar_version_${userId}`, String(avatarVersion || 1));
        return "file://" + localPath;
      }
      return null;
    } catch { return null; }
  };

  const resolveAvatars = async (items: any[]) => {
    const newAvatarMap: { [key: string]: string } = {};
    for (const item of items) {
      const u = item.user;
      if (u && u.id && u.avatar && !cachedAvatars[u.id]) {
        const localUri = await getCachedAvatarFeed(u.id, u.avatar, u.avatarVersion || 1);
        if (localUri) newAvatarMap[u.id] = localUri;
      }
    }
    if (Object.keys(newAvatarMap).length > 0) {
      setCachedAvatars(prev => ({ ...prev, ...newAvatarMap }));
    }
  };

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshingFeed(true);
    else setIsLoadingFeed(true);

    try {
      const res: any = await FeedAPI.GetFeed(activeTab);
      const feedData = res?.posts || res?.data?.posts || [];
      const formattedPosts = feedData.map((post: any) => {
        const cleanPath = post.mediaUrl.replace(/\\/g, '/');
        const fullImageUrl = cleanPath.startsWith("http") ? cleanPath : `${baseUrl.replace(/\/api\/?$/, "")}${cleanPath}`;
        return { ...post, mediaUrl: fullImageUrl };
      });
      setPosts(formattedPosts);
      resolveAvatars(formattedPosts);
    } catch (e) {
      console.log("Failed to load feed", e);
    } finally {
      setIsRefreshingFeed(false);
      setIsLoadingFeed(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [activeTab]);

  // Feed handlers
  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p));
    try { await FeedAPI.ToggleLikePost(postId); } catch {}
  };

  const openComments = async (post: any) => {
    setSelectedPostForComments(post);
    setCommentText("");
    setReplyingTo(null);
    setExpandedReplies({});
    setComments([]);
    commentsSheetRef.current?.present();
    setIsLoadingComments(true);
    try {
      const res: any = await FeedAPI.GetComments(post.id);
      const fetched = res?.comments || res?.data?.comments || [];
      setComments(fetched);
      resolveAvatars(fetched);
    } catch {} finally { setIsLoadingComments(false); }
  };

  const closeComments = () => {
    commentsSheetRef.current?.dismiss();
    setSelectedPostForComments(null);
    setCommentText("");
    setReplyingTo(null);
    Keyboard.dismiss();
  };

  const getRootComments = () => comments.filter(c => c.postId === selectedPostForComments?.id && !c.parentId);
  const getReplies = (commentId: string) => comments.filter(c => c.parentId === commentId).reverse();
  const toggleReplies = (commentId: string) => setExpandedReplies(p => ({ ...p, [commentId]: !p[commentId] }));

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || !selectedPostForComments) return;
    const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : undefined;
    setCommentText(""); setReplyingTo(null); Keyboard.dismiss();
    try {
      const res: any = await FeedAPI.AddComment(selectedPostForComments.id, { text, parentId });
      const newComment = res?.comment || res?.data?.comment;
      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        resolveAvatars([newComment]);
        if (parentId) setExpandedReplies(p => ({ ...p, [parentId]: true }));
        setPosts(prev => prev.map(p => p.id === selectedPostForComments.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
      }
    } catch {}
  };

  const submitReport = async (reasonObj: { label: string; type: string }) => {
    reportSheetRef.current?.dismiss();
    if (!selectedPostForReport) return;
    try {
      await apiClient.post(`/posts/${selectedPostForReport.id}/report`, { reason: reasonObj.label, mediaUrl: selectedPostForReport.mediaUrl });
      setGlassAlertConfig({ title: "Report Submitted", message: "Thank you. Post sent for review.", type: "success" });
      setGlassAlertVisible(true);
    } catch (e: any) {
      setGlassAlertConfig({ title: "Error", message: e.response?.data?.message || "Failed to report", type: "error" });
      setGlassAlertVisible(true);
    }
  };

  // Cache & Profile Helpers
  const saveCache = async (key: string, value: any) => {
    try { await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), value })); } catch {}
  };
  
  const loadCache = async (key: string) => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw)?.value ?? null;
    } catch { return null; }
  };

  const cacheUserAvatar = useCallback(async () => {
    if (!myUserId) return;
    try {
      const cacheKey = `dashboard:avatar:${myUserId}`;
      const cachedData = await loadCache(cacheKey);
      if (cachedData?.avatarUrl) {
        const localUri = await getAvatar(myUserId, cachedData.avatarUrl, cachedData.avatarVersion || 1);
        if (localUri) setFinalAvatarUri(`${localUri}?v=${cachedData.avatarVersion || 1}`);
      }
      if (cachedData) setUserBadges({ tick: cachedData.tick, isPremium: cachedData.isPremium });

      const response = await api_profile.getProfile(); 
      const userData = response.data?.user || response.data?.profile || response.data?.data || response.data;
      if (userData) {
        const freshUrl = userData.avatarUrl || userData.avatar;
        const freshVersion = userData.avatarVersion || 1;
        setUserBadges({ tick: userData.tick, isPremium: userData.isPremium });
        await saveCache(cacheKey, { avatarUrl: freshUrl, avatarVersion: freshVersion, tick: userData.tick, isPremium: userData.isPremium });

        if (freshUrl && freshUrl !== 'null' && freshUrl !== 'undefined') {
          const localUri = await getAvatar(myUserId, freshUrl, freshVersion);
          setFinalAvatarUri(localUri ? `${localUri}?v=${freshVersion}` : null);
        } else {
          setFinalAvatarUri(null);
        }
      }
    } catch {}
  }, [myUserId]);

  useEffect(() => { cacheUserAvatar(); }, [cacheUserAvatar]);

  useEffect(() => {
    (async () => {
      let anyLoaded = false;
      const cached = await loadCache(DASHBOARD_CACHE_KEY);
      if (cached) {
        setProfile(cached.profile);
        setSecondaryCards(cached.secondaryCards || null);
        setCurrentMood(cached.currentMood || null);
        if (cached.friendsMoods) setFriendsMoods(cached.friendsMoods); 
        anyLoaded = true;
      }
      
      // ⚡ DUMMY SET TESTING: Uncomment below to test notes with dummy data.
      // Remember to remove/comment this out when connecting real backend data!
      /*
      const dummyTestFriends = [
        { _id: 'd1', name: 'Alex', username: 'alex99', mood: 'happy', avatarUrl: 'https://via.placeholder.com/150' },
        { _id: 'd2', name: 'Sarah', username: 'sarah_dev', mood: 'ecstatic', avatarUrl: 'https://via.placeholder.com/150' },
        { _id: 'd3', name: 'Michael', username: 'mike_9', mood: 'calm', avatarUrl: 'https://via.placeholder.com/150' }
      ];
      setFriendsMoods(dummyTestFriends);
      */

      const cachedFriends = await loadCache("dashboard:friends:v1");
      if (cachedFriends) setFriendsMoods(p => p.length > 0 ? p : cachedFriends);
  
      const cachedHabits = await loadCache(TODAY_HABITS_CACHE_KEY);
      if (cachedHabits) { setHabits(cachedHabits); anyLoaded = true; }
      
      setHasLoadedOnce(anyLoaded);
      setLoading(!anyLoaded);
      setIsCheckingCache(false); 
      fetchDashboardInBackground();
      fetchTodayHabitsInBackground();
    })();
    refreshPendingCount();
    bootstrapKeys();
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => setOffline(!state.isConnected || state.isInternetReachable === false));
    return () => unsub();
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await socialApi.getPendingFriendRequests();
      const cleaned = (res?.data?.requests ?? []).map((r: any) => r?.user?._id ? r : { ...r, user: { _id: r._id, name: r.name, username: r.username } }).filter((r: any) => r?.user?._id);
      setFriendReqCount(cleaned.length);
    } catch { setFriendReqCount(0); }
  }, []);

  const bootstrapKeys = async () => {
    try {
      const deviceId = await getStableDeviceId(myUserId);
      await ensureDeviceKeys(myUserId, deviceId);
    } catch {}
  };

  const fetchDashboardInBackground = useCallback(async () => {
    try {
      setError(null);
      if (offline) return;
      const res = await DashboardService.GetDashboardSummary();
      const responseData = (res as any).data ?? res;
      if (!responseData.success) throw new Error();
      const { profile, secondaryCards, currentMood, friendsMoods: apiFriendsMoods } = responseData.data;
      setProfile(profile);
      setSecondaryCards(secondaryCards || null);
      setCurrentMood(currentMood || null);
      if (apiFriendsMoods) setFriendsMoods(apiFriendsMoods);
      await saveCache(DASHBOARD_CACHE_KEY, responseData.data);
      setHasLoadedOnce(true);
      setLoading(false);
    } catch {}
  }, [offline]);

  const fetchTodayHabitsInBackground = useCallback(async () => {
    try {
      if (offline) return;
      const res = await DashboardService.GetTodayHabits();
      if (res.data?.success) {
        setHabits(res?.data.habits);
        await saveCache(TODAY_HABITS_CACHE_KEY, res?.data.habits);
      }
    } catch {}
  }, [offline]);

  const fetchFriendsInBackground = useCallback(async () => {
    try {
      if (offline) return;
      const res = await socialApi.getFriends();
      if (res?.data?.friends) {
        setFriendsMoods(p => p.length > 0 && p[0].mood ? p : res.data.friends);
        await saveCache("dashboard:friends:v1", res.data.friends);
      }
    } catch {}
  }, [offline]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardInBackground();
      refreshPendingCount();
      fetchTodayHabitsInBackground();
      fetchFriendsInBackground(); 
    }, [fetchDashboardInBackground, refreshPendingCount, fetchTodayHabitsInBackground, fetchFriendsInBackground])
  );

  if (isCheckingCache) {
    return (
      <MainLayout>
        <AppScreen style={styles.root}>
          <View style={styles.baseBackground} />
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        </AppScreen>
      </MainLayout>
    );
  }

  if (loading && !hasLoadedOnce) {
    return <DashboardSkeleton />;
  }

  const level = profile?.xpProgress.level ?? 1;
  const xp = profile?.xpProgress.currentXp ?? 0;
  const xpRequired = profile?.xpProgress.nextLevelXp ?? 100;
  const fill = profile?.xpProgress.progressPercent ?? (xpRequired ? (xp / xpRequired) * 100 : 0);
  const streakCount = profile?.streak?.count ?? 0;
  const streakLabel = streakCount > 0 ? `${streakCount}-day streak` : "No streak yet";

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        <View style={styles.baseBackground} />
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.overlay}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[styles.iconGlass, { justifyContent: 'center', alignItems: 'center', padding: 0 }]} 
              onPress={() => navigation.navigate("Profile")}
            >
              <View style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                {finalAvatarUri ? (
                  <FastImage style={{ width: '100%', height: '100%' }} source={{ uri: finalAvatarUri, priority: FastImage.priority.normal }} resizeMode={FastImage.resizeMode.cover} />
                ) : (
                  <Icon name="account-circle-outline" size={26} color="#E5E7EB" />
                )}
              </View>
              {(userBadges.tick === 'verified' || userBadges.tick === 'golden' || userBadges.isPremium) && (
                <View style={styles.avatarBadge}>
                  {userBadges.tick === 'verified' ? (
                    <Icon name="check-decagram" size={14} color="#3b82f6" />
                  ) : userBadges.tick === 'golden' ? (
                    <Icon name="check-decagram" size={14} color="#fbbf24" />
                  ) : (
                    <Icon name="star-circle" size={14} color="#fbbf24" />
                  )}
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.topBarRight}>

              <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass} onPress={() => navigation.navigate("Friends")}>
                <Icon name="account-plus-outline" size={22} color="#E5E7EB" />
                {friendReqCount > 0 && (
                  <View style={styles.badgeBubble}><Text style={styles.badgeText}>{friendReqCount}</Text></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass} onPress={() => navigation.navigate("FriendsManage")}>
                <Icon1 name="people-outline" size={22} color="#E5E7EB" />
              </TouchableOpacity>
            </View>
          </View>
            <View style={styles.notesDivider} />

          {/* MAIN SCROLL CONTAINER */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {(offline || error) && (
              <View style={styles.errorCard}>
                <Icon name="cloud-alert" size={20} color="#F87171" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.errorTitle}>{offline ? "Offline mode" : "Something went wrong"}</Text>
                  <Text style={styles.errorText}>{offline ? "You’re not connected to internet." : error}</Text>
                </View>
                <TouchableOpacity style={styles.errorRetryBtn} onPress={() => { fetchDashboardInBackground(); fetchTodayHabitsInBackground(); }}>
                  <Text style={styles.errorRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MOOD NOTES BAR */}
            <View style={styles.notesWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notesContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.noteItem}
                  onPress={() => navigation.navigate("MoodScreen", { currentMoodId: currentMood?.mood || null })}
                >
                  <View style={styles.noteAvatarContainer}>
                    <View style={styles.noteSpeechBubble}>
                      {currentMood && MOOD_METADATA[currentMood.mood] ? (
                        <View style={styles.noteBubbleContent}>
                          <Icon name={MOOD_METADATA[currentMood.mood].icon} size={15} color={MOOD_METADATA[currentMood.mood].color || "#F9FAFB"} />
                          <Text style={styles.noteBubbleText}>{MOOD_METADATA[currentMood.mood].label}</Text>
                        </View>
                      ) : (
                        <View style={styles.noteBubbleContent}>
                          <Icon name="plus" size={15} color="#9CA3AF" />
                          <Text style={styles.noteBubbleText}>Share</Text>
                        </View>
                      )}
                      <View style={styles.noteSpeechTail} />
                    </View>
                    
                    <View style={[styles.noteAvatarWrap, currentMood && MOOD_METADATA[currentMood.mood] ? { borderColor: MOOD_METADATA[currentMood.mood].color } : null]}>
                      {finalAvatarUri ? (
                        <FastImage source={{ uri: finalAvatarUri }} style={styles.noteAvatarImage} />
                      ) : (
                        <Icon name="account-circle-outline" size={56} color="#E5E7EB" />
                      )}
                    </View>

                    {!currentMood && (
                      <View style={styles.noteAddBadge}><Icon name="plus" size={12} color="#fff" /></View>
                    )}
                  </View>
                  <Text style={styles.noteName} numberOfLines={1}>You</Text>
                </TouchableOpacity>

                {friendsMoods
                  .filter((friend: any) => friend.mood && MOOD_METADATA[friend.mood])
                  .map((friend: any) => {
                    const fMoodMeta = MOOD_METADATA[friend.mood];
                    const rawAvatar = friend.avatarUrl || friend.avatar?.url || friend.avatar;
                    const friendAvatarUri = rawAvatar ? (rawAvatar.startsWith('http') ? rawAvatar : `${newUrl}${rawAvatar}`) : null;

                    return (
                      <TouchableOpacity key={friend.id || friend._id} activeOpacity={0.8} style={styles.noteItem}>
                        <View style={styles.noteAvatarContainer}>
                          {fMoodMeta && (
                            <View style={styles.noteSpeechBubble}>
                              <View style={styles.noteBubbleContent}>
                                <Icon name={fMoodMeta.icon} size={15} color={fMoodMeta.color || "#F9FAFB"} />
                                <Text style={styles.noteBubbleText}>{fMoodMeta.label}</Text>
                              </View>
                              <View style={styles.noteSpeechTail} />
                            </View>
                          )}
                          <View style={[styles.noteAvatarWrap, fMoodMeta ? { borderColor: fMoodMeta.color } : null]}>
                            {friendAvatarUri ? (
                              <FastImage source={{ uri: friendAvatarUri }} style={styles.noteAvatarImage} />
                            ) : (
                              <Icon name="account-circle-outline" size={56} color="#E5E7EB" />
                            )}
                          </View>
                        </View>
                        <Text style={styles.noteName} numberOfLines={1}>{friend.name || friend.username}</Text>
                      </TouchableOpacity>
                    );
                })} 
              </ScrollView>
            </View>

            {/* ============================================================ */}
            {/* INTEGRATED ACTIVITY FEED & "YOUR POSTS" TAB */}
            {/* ============================================================ */}
           <View style={styles.feedHeaderRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedTabsContainer}>
                {[
                  { key: "foryou", label: "For You" },
                  { key: "friends", label: "Friends" },
                ].map((tab) => {
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.feedTabPill, isActive && styles.feedTabPillActive]}
                      onPress={() => setActiveTab(tab.key as any)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.feedTabText, isActive && styles.feedTabTextActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* ⚡ YOUR POSTS TAB BUTTON (Pushed to the right using marginLeft: 'auto') */}
                <TouchableOpacity
                  style={[styles.yourPostsTabPill, { marginLeft: 'auto' }]}
                  onPress={() => navigation.navigate("UserProfile")}
                  activeOpacity={0.8}
                >
                  <Icon name="folder-image" size={14} color="#A855F7" style={{ marginRight: 4 }} />
                  <Text style={styles.yourPostsTabText}>Your Posts</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>

            {isLoadingFeed ? (
              <View style={{ height: 400, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#8B5CF6" />
              </View>
            ) : posts.length === 0 ? (
              <View style={{ height: 250, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#9CA3AF" }}>No posts found for {activeTab}</Text>
              </View>
            ) : (
              posts.map((item) => {
                const userAvatarUri = cachedAvatars[item.user.id] || item.user.avatar || 'https://via.placeholder.com/150';

                return (
                  <View key={item.id} style={styles.inlinePostCard}>
                    {item.adminRemoved ? (
                      <View style={{ height: 450, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', borderRadius: 24 }}>
                        <Icon name="shield-alert-outline" size={40} color="#EF4444" />
                        <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700", marginTop: 10 }}>Post Removed</Text>
                      </View>
                    ) : (
                      <>
                        <TouchableWithoutFeedback onPress={() => handleImageDoubleTap(item.id)}>
                          <View style={StyleSheet.absoluteFill}>
                            <Image source={{ uri: item.mediaUrl }} style={styles.inlinePostImage} resizeMode="cover" />
                            <View style={styles.imageOverlayGradient} />

                            {activeHeartPostId === item.id && (
                              <View style={styles.doubleTapHeartContainer}>
                                <Animated.View style={animatedHeartStyle}>
                                  <Icon name="heart" size={95} color="#EF4444" style={styles.popHeartIcon} />
                                </Animated.View>
                              </View>
                            )}
                          </View>
                        </TouchableWithoutFeedback>

                        {/* Right Action Icons */}
                        <View style={styles.rightActionContainer}>
                          <TouchableOpacity style={styles.actionIconButtonClean} onPress={() => handleLike(item.id)} activeOpacity={0.8}>
                            <Icon name={item.isLiked ? "heart" : "heart-outline"} size={28} color={item.isLiked ? "#EF4444" : "#F9FAFB"} />
                            <Text style={styles.actionCountText}>{item.likesCount}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.actionIconButtonClean} onPress={() => openComments(item)} activeOpacity={0.8}>
                            <Icon name="comment-outline" size={26} color="#F9FAFB" />
                            <Text style={styles.actionCountText}>{item.commentsCount}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.actionIconButtonClean} 
                            onPress={() => navigation.navigate("ShareToChat", { 
                              postId: item.id, mediaUrl: item.mediaUrl, postUsername: item.user.username, postCaption: item.caption, postUserId: item.user.id || item.user._id 
                            })}
                          >
                            <Icon name="share-outline" size={26} color="#F9FAFB" />
                            <Text style={styles.actionCountText}>Share</Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.actionIconButtonClean} onPress={() => { setSelectedPostForReport(item); reportSheetRef.current?.present(); }} activeOpacity={0.8}>
                            <Icon name="dots-horizontal" size={26} color="#F9FAFB" />
                          </TouchableOpacity>
                        </View>

                        {/* Bottom Left Author Info & Caption */}
                        <View style={styles.bottomLeftContent}>
                          <View style={styles.userInfoRow}>
                            <View style={styles.avatarContainer}>
                              <Image source={{ uri: userAvatarUri }} style={styles.avatarImage} />
                            </View>
                            <View style={styles.usernameTextWrap}>
                              <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: item.user.id })} activeOpacity={0.8}>
                                <View style={styles.nameInlineRow}>
                                  <Text style={styles.usernameText}>@{item.user.username}</Text>
                                  {item.user.tick === "golden" ? (
                                    <Icon name="check-decagram" size={14} color="#FBBF24" style={{ marginLeft: 4 }} />
                                  ) : item.user.tick === "verified" || item.user.isVerified ? (
                                    <Icon name="check-decagram" size={14} color="#38BDF8" style={{ marginLeft: 4 }} />
                                  ) : null}
                                  {item.user.isPremium && (
                                    <Icon name="crown" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
                                  )}
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={styles.postCaption} numberOfLines={3}>{item.caption}</Text>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}

            <View style={{ height: 60 }} />
          </ScrollView>

          {/* FLOATING CAMERA BUTTON */}
          <TouchableOpacity activeOpacity={0.8} style={styles.floatingCameraButton} onPress={() => navigation.navigate('ProofCamera', { habitId: null })}>
            <Icon name="camera-outline" size={26} color="#F9FAFB" />
          </TouchableOpacity>
        </View>

        {/* REPORT SHEET */}
        <TrueSheet ref={reportSheetRef} detents={[0.4]} cornerRadius={28} backgroundColor="#0F172A" grabber={false}>
          <View style={styles.sheetContentContainer}>
            <Text style={styles.sheetTitle}>Report Post</Text>
            <Text style={styles.sheetSubText}>Why are you reporting this post?</Text>
            {[
              { label: "Inappropriate Content", type: "inappropriate" },
              { label: "Spam or Scam", type: "spam" },
              { label: "Harassment or Hate Speech", type: "harassment" },
            ].map((reason, idx) => (
              <TouchableOpacity key={idx} style={styles.sheetOptionRow} onPress={() => submitReport(reason)} activeOpacity={0.8}>
                <Icon name="alert-octagon-outline" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                <Text style={styles.sheetOptionText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancelButton} onPress={() => reportSheetRef.current?.dismiss()} activeOpacity={0.8}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TrueSheet>

        {/* COMMENTS SHEET */}
        <TrueSheet ref={commentsSheetRef} detents={[0.75]} cornerRadius={28} backgroundColor="#0F172A" grabber={false}>
          <View style={{ height: SCREEN_HEIGHT * 0.75 - 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0, flexDirection: "column" }}>
            <View style={styles.commentsHeader}>
              <View style={{ width: 40 }} />
              <View style={styles.commentsHeaderCenter}>
                <Text style={styles.commentsTitle}>Comments</Text>
                <Text style={styles.commentsSubtitle}>{selectedPostForComments?.commentsCount || 0} comments</Text>
              </View>
              <TouchableOpacity style={styles.commentsCloseButton} onPress={closeComments} activeOpacity={0.8}>
                <Icon name="close" size={22} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {isLoadingComments ? (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="small" color="#8B5CF6" /></View>
            ) : (
              <FlatList
                style={styles.commentsFlatList}
                data={getRootComments()}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const replies = getReplies(item.id);
                  const isExpanded = expandedReplies[item.id];
                  const commentAvatarUri = cachedAvatars[item.user.id] || item.user.avatar || 'https://via.placeholder.com/150';

                  return (
                    <View style={styles.commentRow}>
                      <Image source={{ uri: commentAvatarUri }} style={styles.commentAvatar} />
                      <View style={styles.commentContent}>
                        <View style={styles.commentTopRow}>
                          <Text style={styles.commentUsername}>@{item.user.username}</Text>
                          <Text style={styles.commentTime}>{getTimeAgo(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentText}>{item.text}</Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <View style={styles.commentFooterWrapper}>
              <View style={styles.commentInputContainer}>
                <View style={styles.commentInputWrapper}>
                  <TextInput
                    ref={commentInputRef}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Add a comment..."
                    placeholderTextColor="#64748B"
                    multiline
                    style={styles.commentInput}
                  />
                  <TouchableOpacity style={[styles.commentSendButton, !commentText.trim() && styles.commentSendButtonDisabled]} disabled={!commentText.trim()} onPress={handleAddComment} activeOpacity={0.8}>
                    <Icon name="send" size={19} color={commentText.trim() ? "#FFFFFF" : "#475569"} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TrueSheet>

        {/* CUSTOM GLASSY ALERT MODAL */}
        <Modal visible={glassAlertVisible} transparent animationType="fade" onRequestClose={() => setGlassAlertVisible(false)}>
          <View style={styles.glassModalOverlay}>
            <View style={styles.glassModalCard}>
              <Text style={styles.glassModalTitle}>{glassAlertConfig.title}</Text>
              <Text style={styles.glassModalSubText}>{glassAlertConfig.message}</Text>
              <TouchableOpacity style={styles.glassModalBtn} onPress={() => setGlassAlertVisible(false)} activeOpacity={0.8}>
                <Text style={styles.glassModalBtnText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </AppScreen>
    </MainLayout>
  );
};

const DashboardSkeleton = () => (
  <MainLayout>
    <AppScreen style={styles.root}>
      <View style={styles.baseBackground} />
      <ActivityIndicator size="large" color="#8B5CF6" style={{ flex: 1, justifyContent: "center", alignItems: "center" }} />
    </AppScreen>
  </MainLayout>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  baseBackground: { ...StyleSheet.absoluteFill, backgroundColor: "#020617" },
  overlay: { flex: 1, paddingTop: Platform.OS === "android" ? "3%" : "5%", paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 60 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "2%" },
  topBarRight: { flexDirection: "row", alignItems: "center" },
  iconGlass: { width: 40, height: 40, borderRadius: 16, backgroundColor: ICON_GLASS_BG, borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)", justifyContent: "center", alignItems: "center", marginLeft: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: "2%" },
  streakPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: "5%", paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(22, 101, 52, 0.2)", borderWidth: 1, borderColor: "rgba(74, 222, 128, 0.4)" },
  streakText: { color: "#BBF7D0", marginLeft: 6, fontSize: 13, fontWeight: "600" },
  profileTextBlock: { alignItems: "flex-end" },
  profileTextMain: { color: "#E5E7EB", fontSize: 14, fontWeight: "600" },
  profileTextSub: { color: "#9CA3AF", fontSize: 11 },
  card: { backgroundColor: GLASS_BG, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: GLASS_BORDER, marginBottom: 18 },
  levelSection: { flexDirection: "row", alignItems: "center" },
  levelCircle: { justifyContent: "center", alignItems: "center" },
  levelText: { fontSize: 14, fontWeight: "600", color: "#A855F7" },
  levelNumber: { fontSize: 28, fontWeight: "800", color: "#E5DEFF" },
  levelInfo: { flex: 1, marginLeft: 16 },
  levelLabel: { fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  levelHint: { fontSize: 11, color: "#9CA3AF", marginTop: 8 },
  notesDivider: { height: 1, backgroundColor: "rgba(148, 163, 184, 0.2)", marginBottom: 10, marginTop: 10 },
  notesWrapper: { marginHorizontal: -10, marginBottom: 20 },
  notesContainer: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'flex-start' },
  noteItem: { alignItems: 'center', marginRight: 20, width: 76 },
  noteAvatarContainer: { position: 'relative', alignItems: 'center', marginBottom: 6, marginTop: 26 },
  noteAvatarWrap: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: 'rgba(148, 163, 184, 0.4)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  noteAvatarImage: { width: '100%', height: '100%' },
  noteSpeechBubble: { position: 'absolute', top: -34, backgroundColor: 'rgba(30, 41, 59, 0.95)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)', zIndex: 10, minWidth: 60, alignItems: 'center', justifyContent: 'center' },
  noteSpeechTail: { position: 'absolute', bottom: -5, left: '50%', marginLeft: -5, width: 10, height: 10, backgroundColor: 'rgba(30, 41, 59, 0.95)', borderBottomWidth: 1, borderRightWidth: 1, borderColor: 'rgba(148, 163, 184, 0.3)', transform: [{ rotate: '45deg' }] },
  noteBubbleContent: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noteBubbleText: { color: '#F9FAFB', fontSize: 12, fontWeight: '600' },
  noteAddBadge: { position: 'absolute', bottom: -2, right: 0, backgroundColor: '#3B82F6', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
  noteName: { color: '#E5E7EB', fontSize: 12, fontWeight: '500', textAlign: 'center' },
  avatarBadge: { position: "absolute", bottom: -4, right: -4, backgroundColor: "#020617", borderRadius: 10, width: 18, height: 18, justifyContent: "center", alignItems: "center", borderwidth: 1, borderColor: "rgba(148, 163, 184, 0.4)" },

  // INLINE FEED STYLES
  feedHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#F9FAFB" },
  feedTabsContainer: { 
    flexDirection: "row", 
    alignItems: "center",
    width: "100%", // ⚡ Ensures it spans the screen width so the button can pin right
  },
  feedTabPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, marginLeft: 6, backgroundColor: "rgba(15, 23, 42, 0.6)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)" },
  feedTabPillActive: { backgroundColor: "rgba(139, 92, 246, 0.4)", borderWidth: 1, borderColor: "#A855F7" },
  feedTabText: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  feedTabTextActive: { color: "#F9FAFB", fontWeight: "700" },

  // YOUR POSTS TAB BUTTON STYLES
  yourPostsTabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginLeft: 8,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  yourPostsTabText: {
    fontSize: 12,
    color: "#E9D5FF",
    fontWeight: "700",
  },

  inlinePostCard: { width: "100%", height: 480, borderRadius: 24, overflow: "hidden", backgroundColor: "#000", position: "relative", marginBottom: 16 },
  inlinePostImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  imageOverlayGradient: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  doubleTapHeartContainer: { ...StyleSheet.absoluteFill, justifyContent: "center", alignItems: "center", zIndex: 30 },
  popHeartIcon: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 12 },
  rightActionContainer: { position: "absolute", right: 12, bottom: 20, alignItems: "center", zIndex: 10 },
  actionIconButtonClean: { alignItems: "center", backgroundColor: "transparent", padding: 6, marginBottom: 10 },
  actionCountText: { color: "#F9FAFB", fontSize: 11, fontWeight: "700", marginTop: 2 },
  bottomLeftContent: { position: "absolute", left: 14, bottom: 20, right: 75, zIndex: 10 },
  userInfoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatarContainer: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: "#bebebe", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  usernameTextWrap: { marginLeft: 8 },
  nameInlineRow: { flexDirection: "row", alignItems: "center" },
  usernameText: { color: "#F9FAFB", fontSize: 13, fontWeight: "700" },
  postCaption: { color: "#E2E8F0", fontSize: 12, lineHeight: 16 },

  // Comments Sheet styles
  commentsHeader: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(148, 163, 184, 0.15)", paddingHorizontal: 16 },
  commentsHeaderCenter: { alignItems: "center", justifyContent: "center" },
  commentsTitle: { color: "#F9FAFB", fontSize: 17, fontWeight: "700" },
  commentsSubtitle: { color: "#64748B", fontSize: 10, fontWeight: "500", marginTop: 2 },
  commentsCloseButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(148, 163, 184, 0.1)" },
  commentsFlatList: { flex: 1 },
  commentRow: { flexDirection: "row", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(148,163,184,0.1)" },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1E293B", marginRight: 11 },
  commentContent: { flex: 1, paddingRight: 5 },
  commentTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  commentUsername: { color: "#F9FAFB", fontSize: 13, fontWeight: "700" },
  commentTime: { color: "#64748B", fontSize: 10 },
  commentText: { color: "#E2E8F0", fontSize: 13, lineHeight: 18, marginTop: 3 },
  commentFooterWrapper: { width: "100%", backgroundColor: "#0F172A", borderTopWidth: 1, borderTopColor: "rgba(148, 163, 184, 0.15)" },
  commentInputContainer: { width: "100%", flexDirection: "row", alignItems: "flex-end", paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 18 : 10, backgroundColor: "#0F172A", paddingHorizontal: 16 },
  commentInputWrapper: { flex: 1, minHeight: 42, maxHeight: 100, flexDirection: "row", alignItems: "flex-end", borderRadius: 22, backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", paddingLeft: 14, paddingRight: 5 },
  commentInput: { flex: 1, minHeight: 40, maxHeight: 90, color: "#F8FAFC", fontSize: 14, paddingTop: Platform.OS === "ios" ? 9 : 7, paddingBottom: Platform.OS === "ios" ? 9 : 7 },
  commentSendButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  commentSendButtonDisabled: { backgroundColor: "#1E293B" },

  // Report & Glass Modal
  sheetContentContainer: { padding: 20, paddingBottom: 35 },
  sheetTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  sheetSubText: { color: "#94A3B8", fontSize: "12", textAlign: "center", marginBottom: 20 },
  sheetOptionRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30, 41, 59, 0.5)", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: GLASS_BORDER },
  sheetOptionText: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  sheetCancelButton: { backgroundColor: "rgba(148, 163, 184, 0.2)", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  sheetCancelText: { color: "#CBD5E1", fontSize: 14, fontWeight: "700" },

  glassModalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", zIndex: 99999, elevation: 99999, paddingHorizontal: 24 },
  glassModalCard: { width: "100%", maxWidth: 320, backgroundColor: "rgba(15, 23, 42, 0.95)", borderRadius: 24, borderWidth: 1, borderColor: GLASS_BORDER, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.6, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 20 },
  glassModalTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  glassModalSubText: { color: "#94A3B8", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 24 },
  glassModalBtn: { width: "100%", paddingVertical: 14, borderRadius: 14, backgroundColor: "rgba(148, 163, 184, 0.15)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", alignItems: "center" },
  glassModalBtnText: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },

  errorCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, backgroundColor: "rgba(127, 29, 29, 0.4)", borderWidth: 1, borderColor: "rgba(248, 113, 113, 0.45)", marginTop: 5, marginBottom: 10 },
  errorTitle: { color: "#FCA5A5", fontSize: 13, fontWeight: "700", marginBottom: 2 },
  errorText: { color: "#FEE2E2", fontSize: 11 },
  errorRetryBtn: { paddingHorizontal: 10, paddingVerification: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(248, 250, 252, 0.5)", marginLeft: 8 },
  errorRetryText: { color: "#FEF2F2", fontSize: 11, fontWeight: "600" },
  badgeBubble: { position: "absolute", top: -10, right: -5.5, backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "center" },
  floatingCameraButton: { position: "absolute", right: 20, bottom: Platform.OS === "android" ? 20 : 25, width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(30, 64, 175, 0.2)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(191, 219, 254, 0.4)", shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 18, elevation: 15, zIndex: 99 },
});

export default Dashboard;