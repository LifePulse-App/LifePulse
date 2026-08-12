import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  TouchableWithoutFeedback,
  useWindowDimensions,
  TextInput,
  Alert,
  Keyboard,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import RNFS from "react-native-fs";
import AsyncStorage from "@react-native-async-storage/async-storage";

import FeedAPI from "../services/api_feed"; 
import apiClient from "../../../auth/api-client/api_client";
import AuthContext from "../../../auth/user/UserContext";

const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

const BASE_DIR = RNFS.DocumentDirectoryPath + "/streaksphere/avatar";
const BASE_URL = apiClient.getBaseURL();
const newUrl = BASE_URL.replace(/\/api\/?$/, "");

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

const UserFeedScreen = ({ route, navigation }: any) => {
  const { userId, initialPostId } = route.params || {};
  const authContext = useContext(AuthContext);
  const CURRENT_USER_ID = authContext?.User?.user?.id || authContext?.User?.user?._id;

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);

  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [cachedAvatars, setCachedAvatars] = useState<{ [key: string]: string }>({});
  
  const [initialIndex, setInitialIndex] = useState(0);

  const [glassAlertVisible, setGlassAlertVisible] = useState(false);
  const [glassAlertConfig, setGlassAlertConfig] = useState({ title: "", message: "", type: "success" });

  const getTimeAgo = (dateInput: string) => {
    if (!dateInput) return "Recently";
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

  const resolveAvatars = async (items: any[]) => {
    const newAvatarMap: { [key: string]: string } = {};
    for (const item of items) {
      const u = item.user;
      if (u && u.id && u.avatar) {
        if (!cachedAvatars[u.id]) {
          const localUri = await getCachedAvatar(u.id, u.avatar, u.avatarVersion || 1);
          if (localUri) newAvatarMap[u.id] = localUri;
        }
      }
    }
    if (Object.keys(newAvatarMap).length > 0) {
      setCachedAvatars(prev => ({ ...prev, ...newAvatarMap }));
    }
  };

  useEffect(() => {
    const loadUserPosts = async () => {
      setLoadingPosts(true);
      try {
        let rawPosts = [];
        try {
          const userPostsRes: any = await FeedAPI.GetUserPosts(userId);
          rawPosts = userPostsRes?.posts || userPostsRes?.data?.posts || [];
        } catch (e) {
          const feedRes: any = await FeedAPI.GetFeed("world");
          const allPosts = feedRes?.posts || feedRes?.data?.posts || [];
          rawPosts = allPosts.filter((p: any) => String(p.user?.id || p.user) === String(userId));
        }

        const formattedPosts = rawPosts.map((post: any) => {
          const cleanPath = post.mediaUrl ? post.mediaUrl.replace(/\\/g, '/') : '';
          const fullImageUrl = cleanPath.startsWith("http") 
            ? cleanPath 
            : `${BASE_URL}/${cleanPath}`;

          return {
            ...post,
            mediaUrl: fullImageUrl,
          };
        });

        setPosts(formattedPosts);
        resolveAvatars(formattedPosts);

        if (initialPostId && formattedPosts.length > 0) {
          const targetIndex = formattedPosts.findIndex((p: any) => String(p.id) === String(initialPostId));
          if (targetIndex !== -1) {
            setInitialIndex(targetIndex);
          }
        }
      } catch (err) {
        console.error("Failed to load user posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    if (userId) {
      loadUserPosts();
    }
  }, [userId, initialPostId]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height - 175);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const reportSheetRef = useRef<TrueSheet>(null);
  const [selectedPostForReport, setSelectedPostForReport] = useState<any>(null);

  const commentsSheetRef = useRef<TrueSheet>(null);
  const commentInputRef = useRef<TextInput>(null);

  const [selectedPostForComments, setSelectedPostForComments] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const currentUserIsAdmin = false;

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
      const fetchedComments = res?.comments || res?.data?.comments || [];
      setComments(fetchedComments);
      resolveAvatars(fetchedComments);
    } catch (error) {
      console.error("Failed to load comments", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const closeComments = () => {
    commentsSheetRef.current?.dismiss();
    setSelectedPostForComments(null);
    setCommentText("");
    setReplyingTo(null);
    Keyboard.dismiss();
  };

  const getRootComments = () => comments.filter((c) => c.postId === selectedPostForComments?.id && !c.parentId);
  const getReplies = (commentId: string) => comments.filter((c) => c.parentId === commentId).reverse();

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text || !selectedPostForComments) return;

    const parentId = replyingTo ? (replyingTo.parentId || replyingTo.id) : undefined;
    
    setCommentText("");
    setReplyingTo(null);
    Keyboard.dismiss();

    try {
      const res: any = await FeedAPI.AddComment(selectedPostForComments.id, { text, parentId });
      const newComment = res?.comment || res?.data?.comment;

      if (newComment) {
        setComments((previous) => [newComment, ...previous]);
        resolveAvatars([newComment]);

        if (parentId) {
          setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
        }

        setPosts((previous) =>
          previous.map((post) =>
            post.id === selectedPostForComments.id
              ? { ...post, commentsCount: post.commentsCount + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    setComments((previous) =>
      previous.map((comment) => {
        if (comment.id !== commentId) return comment;
        const newLikedState = !comment.isLiked;
        return {
          ...comment,
          isLiked: newLikedState,
          likesCount: newLikedState ? comment.likesCount + 1 : Math.max(0, comment.likesCount - 1),
        };
      })
    );

    try {
      await FeedAPI.ToggleLikeComment(commentId);
    } catch (error) {
      console.error("Failed to like comment:", error);
    }
  };

  const canDeleteComment = (comment: Comment) => {
    const isCommentOwner = comment.user.id === CURRENT_USER_ID;
    const isPostOwner = selectedPostForComments?.user?.id === CURRENT_USER_ID;
    return isCommentOwner || isPostOwner || currentUserIsAdmin;
  };

  const handleDeleteComment = async (comment: Comment) => {
    if (!canDeleteComment(comment)) return;
    const targetId = comment.id;

    setComments((previous) => previous.filter((item) => item.id !== targetId && item.parentId !== targetId));

    if (selectedPostForComments) {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === selectedPostForComments.id
            ? { ...post, commentsCount: Math.max(0, post.commentsCount - 1) }
            : post
        )
      );
    }

    try {
      await FeedAPI.DeleteComment(targetId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setCommentText("");
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const newIsLiked = !post.isLiked;
          return {
            ...post,
            isLiked: newIsLiked,
            likesCount: newIsLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
          };
        }
        return post;
      })
    );

    try {
      await FeedAPI.ToggleLikePost(postId);
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const lastTapRef = useRef<{ [key: string]: number }>({});
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const [activeHeartPostId, setActiveHeartPostId] = useState<string | null>(null);

  const triggerHeartAnimation = (postId: string) => {
    setActiveHeartPostId(postId);
    heartScale.value = 0.4;
    heartOpacity.value = 1;
    heartScale.value = withSequence(withSpring(1.25, { damping: 6, stiffness: 250 }), withTiming(1, { duration: 100 }));
    heartOpacity.value = withTiming(0, { duration: 450 }, (finished) => { if (finished) runOnJS(setActiveHeartPostId)(null); });
  };

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const handleImageDoubleTap = (postId: string) => {
    const now = Date.now();
    if (now - (lastTapRef.current[postId] || 0) < 300) {
      const targetPost = posts.find((p) => p.id === postId);
      if (targetPost && !targetPost.isLiked) handleLike(postId);
      triggerHeartAnimation(postId);
    } else {
      lastTapRef.current[postId] = now;
    }
  };

  const submitReport = async (reasonObj: { label: string; type: string }) => {
    if (!selectedPostForReport) return;
    const postId = selectedPostForReport.id;

    // FIX: await the native dismiss animation so it doesn't block the Modal
    try {
      await reportSheetRef.current?.dismiss();
    } catch (_) {
      // sheet might already be closed, ignore
    }

    try {
      const res = await apiClient.post(`/feed/posts/${postId}/report`, {
        reason: reasonObj.label,
        mediaUrl: selectedPostForReport.mediaUrl
      });

      if (res.data.success) {
        setGlassAlertConfig({
          title: "Report Submitted",
          message:
            "Thank you. This post has been submitted for review by our moderation team.",
          type: "success",
        });
        setGlassAlertVisible(true);
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        "Failed to submit report. Please try again.";

      setGlassAlertConfig({
        title: "Report Status",
        message: errorMsg,
        type: "error",
      });
      setGlassAlertVisible(true);
    }
  };

  const renderCommentItem = (item: Comment, isReply = false) => {
    const canDelete = canDeleteComment(item);
    const commentAvatarUri = cachedAvatars[item.user.id] || item.user.avatar || 'https://via.placeholder.com/150';

    return (
      <View style={[styles.commentRow, isReply && styles.replyRow]}>
        <TouchableOpacity onPress={() => { commentsSheetRef.current?.dismiss(); navigation.navigate("UserProfile", { userId: item.user.id }); }} activeOpacity={0.85}>
          <Image source={{ uri: commentAvatarUri }} style={[styles.commentAvatar, isReply && styles.replyAvatar]} />
        </TouchableOpacity>
        <View style={styles.commentContent}>
          <View style={styles.commentTopRow}>
            <TouchableOpacity onPress={() => { commentsSheetRef.current?.dismiss(); navigation.navigate("UserProfile", { userId: item.user.id }); }} activeOpacity={0.8}>
              <Text style={styles.commentUsername}>@{item.user.username}</Text>
            </TouchableOpacity>

            {item.user.tick === "golden" ? (
              <Icon name="check-decagram" size={14} color="#FBBF24" style={{ marginLeft: 4 }} />
            ) : item.user.tick === "verified" || item.user.isVerified ? (
              <Icon name="check-decagram" size={14} color="#38BDF8" style={{ marginLeft: 4 }} />
            ) : null}

            {item.user.isPremium && (
              <Icon name="crown" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
            )}

            <Text style={styles.commentTime}>{getTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentLikeButton} onPress={() => handleLikeComment(item.id)} activeOpacity={0.8}>
              <Icon name={item.isLiked ? "heart" : "heart-outline"} size={17} color={item.isLiked ? "#EF4444" : "#94A3B8"} />
              {item.likesCount > 0 && <Text style={styles.commentLikeCount}>{item.likesCount}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleReply(item)} activeOpacity={0.8}>
              <Text style={styles.commentReplyText}>Reply</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity onPress={() => handleDeleteComment(item)} activeOpacity={0.8}>
                <Text style={styles.commentDeleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loadingPosts) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        getItemLayout={(_, index) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 100);
        }}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: "#000" }}>
            
            {item.adminRemoved && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', zIndex: 999 }]}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                  <Icon name="shield-alert-outline" size={40} color="#EF4444" />
                </View>
                <Text style={{ color: "#F8FAFC", fontSize: 22, fontWeight: "700" }}>Post Removed</Text>
                <Text style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 40, lineHeight: 22 }}>
                  This post was removed because it violated our community guidelines.
                </Text>
              </View>
            )}

            <TouchableWithoutFeedback onPress={() => { if (!item.adminRemoved) handleImageDoubleTap(item.id); }}>
              <View style={StyleSheet.absoluteFill}>
                <Image source={{ uri: item.mediaUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.3)" }]} />
                {activeHeartPostId === item.id && !item.adminRemoved && (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
                    <Animated.View style={animatedHeartStyle}>
                      <Icon name="heart" size={100} color="#EF4444" />
                    </Animated.View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>

            {!item.adminRemoved && (
              <>
                <View style={styles.sidebar}>
                  <TouchableOpacity style={styles.sidebarIcon} onPress={() => handleLike(item.id)}>
                    <Icon name={item.isLiked ? "heart" : "heart-outline"} size={35} color={item.isLiked ? "#EF4444" : "#FFF"} />
                    <Text style={styles.sidebarText}>{item.likesCount}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sidebarIcon} onPress={() => openComments(item)}>
                    <Icon name="comment-outline" size={32} color="#FFF" />
                    <Text style={styles.sidebarText}>{item.commentsCount}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.sidebarIcon} 
                    onPress={() => navigation.navigate("ShareToChat", { 
                      postId: item.id, 
                      mediaUrl: item.mediaUrl,
                      postUsername: item.user?.username || "user",
                      postCaption: item.caption || "",
                      postUserId: typeof item.user === 'object' ? (item.user.id || item.user._id) : userId
                    })}
                  >
                    <Icon name="share-outline" size={32} color="#FFF" />
                    <Text style={styles.sidebarText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sidebarIcon} onPress={() => { setSelectedPostForReport(item); reportSheetRef.current?.present(); }}>
                    <Icon name="dots-horizontal" size={32} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.bottomInfo}>
                  <View style={styles.nameInlineRow}>
                    <Text style={styles.username}>@{item.user.username}</Text>
                    
                    {item.user.tick === "golden" ? (
                      <Icon name="check-decagram" size={16} color="#FBBF24" style={{ marginLeft: 4, marginBottom: 6 }} />
                    ) : item.user.tick === "verified" || item.user.isVerified ? (
                      <Icon name="check-decagram" size={16} color="#38BDF8" style={{ marginLeft: 4, marginBottom: 6 }} />
                    ) : null}

                    {item.user.isPremium && (
                      <Icon name="crown" size={16} color="#F59E0B" style={{ marginLeft: 4, marginBottom: 6 }} />
                    )}
                  </View>

                  <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
                </View>
              </>
            )}
          </View>
        )}
      />

      <TrueSheet ref={reportSheetRef} detents={[0.4]} cornerRadius={28} backgroundColor="#0F172A" grabber={false}>
        <View style={styles.sheetContentContainer}>
          <Text style={styles.sheetTitle}>Report Post</Text>
          <Text style={styles.sheetSubText}>Why are you reporting this post?</Text>
          {[
            { label: "Inappropriate Content", type: "inappropriate" },
            { label: "Spam or Scam", type: "spam" },
            { label: "Harassment or Hate Speech", type: "harassment" },
          ].map((reason, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sheetOptionRow}
              onPress={() => submitReport(reason)}
              activeOpacity={0.8}
            >
              <Icon name="alert-octagon-outline" size={20} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={styles.sheetOptionText}>{reason.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sheetCancelButton} onPress={() => reportSheetRef.current?.dismiss()} activeOpacity={0.8}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TrueSheet>

      <TrueSheet ref={commentsSheetRef} detents={[0.75]} cornerRadius={28} backgroundColor="#0F172A" grabber={false}>
        <View style={{ height: SCREEN_HEIGHT * 0.75 - 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0, flexDirection: "column" }}>
          
          <View style={styles.commentsHeader}>
            <View style={{ width: 40 }} />
            <View style={styles.commentsHeaderCenter}>
              <Text style={styles.commentsTitle}>Comments</Text>
              <Text style={styles.commentsSubtitle}>{selectedPostForComments?.commentsCount || 0} {(selectedPostForComments?.commentsCount || 0) === 1 ? "comment" : "comments"}</Text>
            </View>
            <TouchableOpacity style={styles.commentsCloseButton} onPress={closeComments} activeOpacity={0.8}>
              <Icon name="close" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {isLoadingComments ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="small" color="#8B5CF6" />
            </View>
          ) : (
            <FlatList
              style={styles.commentsFlatList}
              data={getRootComments()}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              extraData={{ comments, expandedReplies }}
              contentContainerStyle={[getRootComments().length === 0 ? styles.emptyCommentsContainer : styles.commentsList, { paddingBottom: 20 }]}
              renderItem={({ item }) => {
                const replies = getReplies(item.id);
                const isExpanded = expandedReplies[item.id];
                return (
                  <View>
                    {renderCommentItem(item, false)}
                    {replies.length > 0 && (
                      <View style={styles.repliesWrapper}>
                        <TouchableOpacity style={styles.viewRepliesButton} onPress={() => toggleReplies(item.id)} activeOpacity={0.8}>
                          <View style={styles.replyLineIndicator} />
                          <Text style={styles.viewRepliesText}>{isExpanded ? "Hide replies" : `View ${replies.length} replies`}</Text>
                        </TouchableOpacity>
                        {isExpanded && replies.map((reply) => <React.Fragment key={reply.id}>{renderCommentItem(reply, true)}</React.Fragment>)}
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.noCommentsView}>
                  <View style={styles.noCommentsIcon}>
                    <Icon name="comment-outline" size={40} color="#64748B" />
                  </View>
                  <Text style={styles.noCommentsTitle}>No comments yet</Text>
                  <Text style={styles.noCommentsSubtitle}>Be the first to share your thoughts.</Text>
                </View>
              }
            />
          )}

          <View style={styles.commentFooterWrapper}>
            {replyingTo && (
              <View style={styles.replyingIndicatorBar}>
                <Text style={styles.replyingIndicatorText}>Replying to <Text style={{ fontWeight: "700", color: "#94A3B8" }}>@{replyingTo.user.username}</Text></Text>
                <TouchableOpacity onPress={() => { setReplyingTo(null); setCommentText(""); }}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.commentInputContainer}>
              <View style={styles.commentInputWrapper}>
                <TextInput
                  ref={commentInputRef}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder={replyingTo ? `Reply to ${replyingTo.user.username}...` : "Add a comment..."}
                  placeholderTextColor="#64748B"
                  multiline
                  maxLength={500}
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
              style={styles.glassModalBtn} 
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
  headerOverlay: { position: "absolute", marginTop: 10, top: Platform.OS === "ios" ? 50 : 30, left: 16, right: 16, flexDirection: "row", alignItems: "center", zIndex: 100 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", marginLeft: 15, textShadowColor: "#000", textShadowRadius: 10 },
  sidebar: { position: "absolute", right: 16, bottom: 100, alignItems: "center" },
  sidebarIcon: { alignItems: "center", marginBottom: 20 },
  sidebarText: { color: "#FFF", fontSize: 13, fontWeight: "700", marginTop: 4 },
  bottomInfo: { position: "absolute", left: 16, bottom: 100, width: "75%" },
  nameInlineRow: { flexDirection: "row", alignItems: "center" },
  username: { color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  caption: { color: "#FFF", fontSize: 14, lineHeight: 20 },

  commentsHeader: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "rgba(148, 163, 184, 0.15)", paddingHorizontal: 16 },
  commentsHeaderCenter: { alignItems: "center", justifyContent: "center" },
  commentsTitle: { color: "#F9FAFB", fontSize: 17, fontWeight: "700" },
  commentsSubtitle: { color: "#64748B", fontSize: 10, fontWeight: "500", marginTop: 2 },
  commentsCloseButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(148, 163, 184, 0.1)" },
  commentsFlatList: { flex: 1 },
  commentsList: { paddingTop: 8, paddingHorizontal: 16 },
  emptyCommentsContainer: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  commentRow: { flexDirection: "row", paddingVertical: 11 },
  replyRow: { paddingLeft: 45, paddingVertical: 8 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1E293B", marginRight: 11 },
  replyAvatar: { width: 30, height: 30, borderRadius: 15 },
  commentContent: { flex: 1, paddingRight: 5 },
  commentTopRow: { flexDirection: "row", alignItems: "center" },
  commentUsername: { color: "#F9FAFB", fontSize: 13, fontWeight: "700" },
  commentTime: { color: "#64748B", fontSize: 10, marginLeft: 8 },
  commentText: { color: "#E2E8F0", fontSize: 14, lineHeight: 20, marginTop: 3 },
  commentActions: { flexDirection: "row", alignItems: "center", marginTop: 7 },
  commentLikeButton: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  commentLikeCount: { color: "#94A3B8", fontSize: 10, fontWeight: "600", marginLeft: 4 },
  commentReplyText: { color: "#94A3B8", fontSize: 11, fontWeight: "600", marginRight: 20 },
  commentDeleteText: { color: "#EF4444", fontSize: 11, fontWeight: "600" },
  repliesWrapper: { marginTop: -5, marginBottom: 5 },
  viewRepliesButton: { flexDirection: "row", alignItems: "center", marginLeft: 51, paddingVertical: 10 },
  replyLineIndicator: { width: 30, height: 1, backgroundColor: "#475569", marginRight: 10 },
  viewRepliesText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  noCommentsView: { alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  noCommentsIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30, 41, 59, 0.6)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", marginBottom: 15 },
  noCommentsTitle: { color: "#F9FAFB", fontSize: 16, fontWeight: "700" },
  noCommentsSubtitle: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 5 },
  commentFooterWrapper: { width: "100%", backgroundColor: "#0F172A", borderTopWidth: 1, borderTopColor: "rgba(148, 163, 184, 0.15)" },
  replyingIndicatorBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "rgba(30, 41, 59, 0.5)", borderTopWidth: 1, borderTopColor: "rgba(148, 163, 184, 0.15)" },
  replyingIndicatorText: { color: "#94A3B8", fontSize: 12 },
  commentInputContainer: { width: "100%", flexDirection: "row", alignItems: "flex-end", paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 18 : 10, backgroundColor: "#0F172A", paddingHorizontal: 16 },
  commentInputWrapper: { flex: 1, minHeight: 42, maxHeight: 100, flexDirection: "row", alignItems: "flex-end", borderRadius: 22, backgroundColor: "#111827", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", paddingLeft: 14, paddingRight: 5 },
  commentInput: { flex: 1, minHeight: 40, maxHeight: 90, color: "#F8FAFC", fontSize: 14, paddingTop: Platform.OS === "ios" ? 9 : 7, paddingBottom: Platform.OS === "ios" ? 9 : 7 },
  commentSendButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  commentSendButtonDisabled: { backgroundColor: "#1E293B" },

  sheetContentContainer: { padding: 20, paddingBottom: 35 },
  sheetTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  sheetSubText: { color: "#94A3B8", fontSize: 12, textAlign: "center", marginBottom: 20 },
  sheetOptionRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(30, 41, 59, 0.5)", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: GLASS_BORDER },
  sheetOptionText: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },
  sheetCancelButton: { backgroundColor: "rgba(148, 163, 184, 0.2)", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  sheetCancelText: { color: "#CBD5E1", fontSize: 14, fontWeight: "700" },

  glassModalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", zIndex: 99999, elevation: 99999, paddingHorizontal: 24 },
  glassModalCard: { width: "100%", maxWidth: 320, backgroundColor: "rgba(15, 23, 42, 0.95)", borderRadius: 24, borderWidth: 1, borderColor: GLASS_BORDER, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.6, shadowOffset: { width: 0, height: 12 }, shadowRadius: 24, elevation: 20 },
  glassModalIconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16, borderWidth: 1 },
  glassModalTitle: { color: "#F9FAFC", fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  glassModalSubText: { color: "#94A3B8", fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 24 },
  glassModalBtn: { width: "100%", paddingVertical: 14, borderRadius: 14, backgroundColor: "rgba(148, 163, 184, 0.15)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)", alignItems: "center" },
  glassModalBtnText: { color: "#F8FAFC", fontSize: 14, fontWeight: "700" },
});

export default UserFeedScreen;