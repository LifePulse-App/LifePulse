import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import LinearGradient from "react-native-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import socialApi from "../../friends/services/api_friends";
import apiClient from "../../../auth/api-client/api_client";

const { width: SW } = Dimensions.get("window");

type Props = {
  navigation: any;
  route: { params?: { userId: string; name?: string; username?: string } };
};

type PreviewUser = {
  _id: string;
  name: string;
  username?: string;
  level?: number;
  title?: string;
  mood?: string;
  country?: string;
  city?: string;
  avatarUrl?: string;
  isPublic?: boolean;
  canSeeLocation?: boolean;
  points?: number;
  leaderboardRank?: number;
  streak?: number;
  tick?: string;
  partner?: { 
    _id: string; 
    name: string; 
    isSuspended?: boolean; 
    gracePeriodEnd?: string;
    days?: number; 
  }; 
};

type Friendship = {
  isFriend: boolean;
  requestSent: boolean;
  requestIncoming: boolean;
};

type RelationshipStatus = {
  isPartner: boolean;
  requestSent: boolean;
  requestIncoming: boolean;
  isSuspended: boolean;
};

type PreviewResponse = {
  user: PreviewUser;
  friendship: Friendship;
  relationship?: RelationshipStatus;
};

const cacheKey = (userId: string) => `profilePreview:v3:${userId}`;

const saveCache = async (key: string, value: PreviewResponse) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {}
};

const loadCache = async (key: string): Promise<PreviewResponse | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.value ?? null;
  } catch {
    return null;
  }
};

const getLevelColor = (level?: number): [string, string] => {
  if (!level) return ["#475569", "#334155"];
  if (level >= 50) return ["#f59e0b", "#d97706"];
  if (level >= 30) return ["#8b5cf6", "#7c3aed"];
  if (level >= 15) return ["#3b82f6", "#2563eb"];
  return ["#10b981", "#059669"];
};

const getLevelTitle = (level?: number) => {
  if (!level) return "Newcomer";
  if (level >= 50) return "Legendary";
  if (level >= 30) return "Elite";
  if (level >= 15) return "Veteran";
  if (level >= 5) return "Rising";
  return "Newcomer";
};

// ⚡ SKELETON LOADER COMPONENT
const ProfileSkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const Skel = ({ style }: { style: any }) => (
    <Animated.View style={[style, { backgroundColor: "#334155", opacity: pulseAnim }]} />
  );

  return (
    <View style={{ alignItems: "center", width: "100%", paddingVertical: 10 }}>
      <Skel style={{ width: 104, height: 104, borderRadius: 52, marginBottom: 16 }} />
      <Skel style={{ width: 160, height: 24, borderRadius: 12, marginBottom: 12 }} />
      <Skel style={{ width: 100, height: 16, borderRadius: 8, marginBottom: 24 }} />

      <View style={{ flexDirection: "row", gap: 10, width: "100%", marginBottom: 24 }}>
        <Skel style={{ flex: 1, height: 80, borderRadius: 16 }} />
        <Skel style={{ flex: 1, height: 80, borderRadius: 16 }} />
        <Skel style={{ flex: 1, height: 80, borderRadius: 16 }} />
      </View>

      <Skel style={{ width: "100%", height: 56, borderRadius: 16, marginBottom: 12 }} />

      <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
        <Skel style={{ flex: 1, height: 100, borderRadius: 20 }} />
        <Skel style={{ flex: 1, height: 100, borderRadius: 20 }} />
      </View>
    </View>
  );
};

export default function ProfilePreviewScreen({ navigation, route }: Props) {
  const userId = route.params?.userId;
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [user, setUser] = useState<PreviewUser | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  console.log(relationship);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [unfriendModalVisible, setUnfriendModalVisible] = useState(false);
  
  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected || state.isInternetReachable === false);
    });
    return () => unsub();
  }, []);

  const seedFromRoute = useCallback(() => {
    if (!userId) return;
    setUser((prev) => ({
      _id: userId,
      name: prev?.name || route.params?.name || "User",
      username: prev?.username || route.params?.username || "",
      level: prev?.level,
      title: prev?.title,
      mood: prev?.mood,
      country: prev?.country,
      city: prev?.city,
      avatarUrl: prev?.avatarUrl,
      isPublic: prev?.isPublic,
      canSeeLocation: prev?.canSeeLocation,
      partner: prev?.partner
    }));
  }, [userId, route.params?.name, route.params?.username]);

  const load = useCallback(async () => {
    if (!userId) return;
    setErrorMsg(null);
    seedFromRoute();

    const cached = await loadCache(cacheKey(userId));
    if (cached) {
      setUser(cached.user); 
      setFriendship(cached.friendship);
      setRelationship(cached.relationship || null);
      setLoading(false); 
    }

    if (offline) return;
    try {
      const res = await (socialApi as any).previewProfile(userId);
      const payload: PreviewResponse = res?.data;
      
      const mergedUser: PreviewUser = {
        ...payload.user,
        _id: userId,
        name: payload.user?.name || route.params?.name || "User",
        username: payload.user?.username || route.params?.username || "",
      };
      
      setUser(mergedUser);
      setFriendship(payload.friendship);
      setRelationship(payload.relationship || { isPartner: false, requestSent: false, requestIncoming: false });
      
      await saveCache(cacheKey(userId), {
        user: mergedUser,
        friendship: payload.friendship,
        relationship: payload.relationship,
      });
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message || e?.message || "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  }, [userId, offline, seedFromRoute, route.params?.name, route.params?.username]);

  useEffect(() => {
    load();
  }, [offline, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const locationText = useMemo(() => {
    const country = user?.country?.trim();
    const city = user?.city?.trim();
    if (country && city) return `${city}, ${country}`;
    if (country) return country;
    if (city) return city;
    return null;
  }, [user?.country, user?.city]);

  const levelColors = getLevelColor(user?.level);
  const levelTitle = getLevelTitle(user?.level);

  const avatarUri = localAvatar
    ? localAvatar
    : user?.avatarUrl
      ? user.avatarUrl.startsWith("http")
        ? user.avatarUrl
        : newUrl + user.avatarUrl
      : null;

  // --- Friendship Handlers ---
  const actionLabel = friendship?.isFriend
    ? "Unfriend"
    : friendship?.requestIncoming
    ? "Accept Request"
    : friendship?.requestSent
    ? "Requested"
    : "Add Friend";

  const actionDisabled = busyAction || offline || actionLabel === "Requested";

  const onPressAction = async () => {
    if (!userId || !friendship) return;
    if (offline) return;
    
    if (friendship.isFriend) {
      setUnfriendModalVisible(true);
      return; 
    }

    try {
      setBusyAction(true);
      setErrorMsg(null);
      if (friendship.requestIncoming) {
        await (socialApi as any).acceptFriendRequest(userId);
      } else if (!friendship.requestSent) {
        await (socialApi as any).sendFriendRequest(userId);
      }
      await load();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || "Failed to process request.");
    } finally {
      setBusyAction(false);
    }
  };

  const confirmUnfriend = async () => {
    if (!userId) return;
    try {
      setBusyAction(true);
      setErrorMsg(null);
      await (socialApi as any).unfriend(userId);
      setUnfriendModalVisible(false);
      await load();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || "Failed to unfriend.");
    } finally {
      setBusyAction(false);
    }
  };

  const onPressCancelRequest = async () => {
    if (!userId || offline) return;
    try {
      setBusyAction(true);
      setErrorMsg(null);
      setFriendship((prev) => prev ? { ...prev, requestSent: false } : null);
      await (socialApi as any).removeFriendRequest(userId);
      await load();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || "Cancel failed.");
      setFriendship((prev) => prev ? { ...prev, requestSent: true } : null);
    } finally {
      setBusyAction(false);
    }
  };

  // --- ⚡ Relationship Handlers (WITH PROPER ERROR CATCHING) ---
  const onSendRel = async () => {
    try { 
      setBusyAction(true); 
      setErrorMsg(null);
      setRelationship((prev) => prev ? { ...prev, requestSent: true } : { isPartner: false, requestIncoming: false, requestSent: true });
      await apiClient.post(`/relationship/request/${userId}`); 
      await load(); 
    } catch(e: any) {
      setRelationship((prev) => prev ? { ...prev, requestSent: false } : null);
      setErrorMsg(e?.response?.data?.message || "Could not send relationship request.");
    } finally { setBusyAction(false); }
  };
  
  const onAcceptRel = async () => {
    try { 
      setBusyAction(true); 
      setErrorMsg(null);
      await apiClient.post(`/relationship/accept/${userId}`); 
      await load(); 
    } catch(e: any) {
      setErrorMsg(e?.response?.data?.message || "Could not accept request.");
    } finally { setBusyAction(false); }
  };
  
  const onCancelRel = async () => {
    try { 
      setBusyAction(true); 
      setErrorMsg(null);
      setRelationship((prev) => prev ? { ...prev, requestSent: false, requestIncoming: false } : null);
      await apiClient.post(`/relationship/cancel/${userId}`); 
      await load(); 
    } catch(e: any) {
      setErrorMsg(e?.response?.data?.message || "Could not cancel request.");
    } finally { setBusyAction(false); }
  };
  
  const onSuspendRel = async () => {
    try { 
      setBusyAction(true); 
      setErrorMsg(null);
      await apiClient.post(`/relationship/remove`); 
      await load(); 
    } catch(e: any) {
      setErrorMsg(e?.response?.data?.message || "Could not suspend relationship.");
    } finally { setBusyAction(false); }
  };
  
  const onRestoreRel = async () => {
    try { 
      setBusyAction(true); 
      setErrorMsg(null);
      await apiClient.post(`/relationship/restore`); 
      await load(); 
    } catch(e: any) {
      setErrorMsg(e?.response?.data?.message || "Could not restore relationship.");
    } finally { setBusyAction(false); }
  };

  const handlePartnerClick = () => {
    if (user?.partner?._id) {
      navigation.push("ProfilePreview", {
        userId: user.partner._id,
        name: user.partner.name,
      });
    }
  };

  const hasMood = !!user?.mood;
  const locationHidden = user?.canSeeLocation === false;
  const hasLocation = !!locationText && !locationHidden;
  
  const isSuspended = relationship?.isSuspended;

  

  useEffect(() => {
    const loadLocalAvatar = async () => {
      if (!userId) return;
      const saved = await AsyncStorage.getItem(`avatar:${userId}`);
      if (saved) {
        setLocalAvatar(saved);
      }
    };
    loadLocalAvatar();
  }, [userId]);

  const safeTopPadding = Math.max(insets.top, 20);

  return (
    <View style={styles.root}>
      <View style={styles.bg} />
      <View style={styles.glowTL} />
      <View style={styles.glowBR} />
      
      <View style={[styles.header, { paddingTop: safeTopPadding + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={22} color="#f1f5f9" />
        </TouchableOpacity>
        {loading && friendship && (
          <ActivityIndicator size="small" color="#818cf8" style={{ position: 'absolute', right: 20, top: safeTopPadding + 16 }} />
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && !friendship ? (
           <ProfileSkeleton />
        ) : (
          <View style={{ gap: 12 }}>
            {/* ── Center Social Hero ── */}
            <View style={styles.heroSection}>
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={() => avatarUri && setAvatarPreviewVisible(true)}
                activeOpacity={0.9}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={["#6366f1", "#8b5cf6"]} style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(user?.name || "?")[0].toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {user?.name || "—"}
                </Text>
                {user?.tick === "verified" && (
                  <Icon name="check-decagram" size={22} color="#3b82f6" style={styles.tickIcon} />
                )}
                {user?.tick === "golden" && (
                  <Icon name="check-decagram" size={22} color="#fbbf24" style={styles.tickIcon} />
                )}
              </View>

              {user?.username ? (
                <Text style={styles.handle}>@{user.username}</Text>
              ) : null}

              {/* Social Tags & Relationship Row */}
              <View style={styles.tagsRow}>
                
                {/* ⚡ RELATIONSHIP PILL */}
                <TouchableOpacity 
                  activeOpacity={user?.partner?._id ? 0.8 : 1} 
                  style={[
                    styles.relationshipPill, 
                    !user?.partner?._id && styles.relationshipPillEmpty,
                    isSuspended && styles.relationshipPillSuspended
                  ]}
                  onPress={handlePartnerClick}
                  disabled={!user?.partner?._id}
                >
                  {!isSuspended ? (
                    <Icon 
                      name={user?.partner?._id ? "cards-heart" : "heart-outline"} 
                      size={14} 
                      color={user?.partner?._id ? "#f43f5e" : "#94a3b8"} 
                    />
                  ) : (
                    <Text style={{ fontSize: 13, marginRight: 2, includeFontPadding: false }}>❤️‍🩹</Text>
                  )}
                  
                  <Text 
                    style={[
                      styles.relationshipText, 
                      !user?.partner?._id && { color: "#94a3b8" },
                      isSuspended && styles.relationshipTextSuspended
                    ]} 
                    numberOfLines={1}
                  >
                    {user?.partner?.name 
                      ? `With ${user.partner.name}${user.partner.days !== undefined ? ` • ${user.partner.days}d` : ""}` 
                      : "No one"}
                  </Text>
                </TouchableOpacity>

                {user?.title ? (
                  <View style={styles.titleChip}>
                    <Icon name="crown" size={14} color="#fbbf24" />
                    <Text style={styles.titleChipText}>{user.title}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Modern Inline Stats ── */}
            <View style={styles.statsContainer}>
              <View style={styles.statBlock}>
                <Text style={styles.statNumber}>{user?.points?.toLocaleString() ?? "—"}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statNumber}>{user?.leaderboardRank ? `#${user.leaderboardRank}` : "—"}</Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={styles.statNumber}>{user?.streak ?? "—"}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
            </View>

            {/* ── Details Grid ── */}
            <View style={styles.detailsGrid}>
              
              {/* Level Card */}
              <View style={[styles.detailCard, { flex: 1 }]}>
                <View style={[styles.detailIconWrap, { backgroundColor: "rgba(167,139,250,0.15)" }]}>
                  <Icon name="star-four-points" size={18} color="#a78bfa" />
                </View>
                <Text style={styles.detailTitle}>Level {user?.level ?? "—"}</Text>
                <Text style={styles.detailSub}>{levelTitle}</Text>
              </View>

              {/* Mood Card */}
              <View style={[styles.detailCard, { flex: 1, marginLeft: 12 }]}>
                <View style={[styles.detailIconWrap, { backgroundColor: hasMood ? "rgba(52,211,153,0.15)" : "rgba(71,85,105,0.15)" }]}>
                  <Text style={{ fontSize: 16 }}>{hasMood ? "✨" : "😶"}</Text>
                </View>
                <Text style={styles.detailTitle} numberOfLines={1}>{hasMood ? user?.mood : "No Mood"}</Text>
                <Text style={styles.detailSub}>Current Vibe</Text>
              </View>
            </View>

            {/* Location Card Row */}
            <View style={[styles.detailCard, styles.locationCard]}>
              <View style={[styles.detailIconWrap, { backgroundColor: hasLocation ? "rgba(96,165,250,0.15)" : "rgba(71,85,105,0.15)" }]}>
                <Icon
                  name={locationHidden ? "map-marker-off" : hasLocation ? "map-marker" : "map-marker-question"}
                  size={18}
                  color={hasLocation ? "#60a5fa" : "#94a3b8"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle} numberOfLines={1}>
                  {locationHidden ? "Hidden by user" : locationText || "No location set"}
                </Text>
                <Text style={styles.detailSub}>Location</Text>
              </View>
            </View>

            {/* ── Friendship Banners ── */}
                             {/* ── Relationship Actions ── */}
            <View style={[styles.actionContainer, { marginTop: -20 }]}>
              {relationship?.isPartner ? (
                isSuspended ? (
                  <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnAccept]} onPress={onRestoreRel} disabled={busyAction}>
                    <Icon name="heart-pulse" size={20} color="#34d399" />
                    <Text style={[styles.primaryBtnText, { color: "#34d399" }]}>Restore Relationship</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnDanger]} onPress={onSuspendRel} disabled={busyAction}>
                    <Icon name="heart-broken" size={20} color="#f87171" />
                    <Text style={[styles.primaryBtnText, { color: "#f87171" }]}>Suspend Relationship</Text>
                  </TouchableOpacity>
                )
              ) : relationship?.requestSent ? (
                <View style={styles.requestedRow}>
                  <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnRequested, { flex: 1 }]} disabled>
                    <Icon name="clock-outline" size={20} color="#94a3b8" />
                    <Text style={[styles.primaryBtnText, { color: "#94a3b8" }]}>Partner Req Sent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onCancelRel} disabled={busyAction}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : relationship?.requestIncoming ? (
                <View style={styles.requestedRow}>
                  <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnAccept, { flex: 1 }]} onPress={onAcceptRel} disabled={busyAction}>
                    <Icon name="heart-plus" size={20} color="#34d399" />
                    <Text style={[styles.primaryBtnText, { color: "#34d399" }]}>Accept Partner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onCancelRel} disabled={busyAction}>
                    <Text style={styles.cancelBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              ) : (!user?.partner?._id && friendship?.isFriend) ? (
                <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnPink]} onPress={onSendRel} disabled={busyAction}>
                  <Icon name="cards-heart" size={20} color="#f43f5e" />
                  <Text style={[styles.primaryBtnText, { color: "#f43f5e" }]}>Ask to be Partner</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ── Primary Actions (Friendship) ── */}
            <View style={[styles.actionContainer, { marginTop: -20 }]} >
              {!friendship?.requestSent ? (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    friendship?.isFriend && styles.primaryBtnDanger,
                    friendship?.requestIncoming && styles.primaryBtnAccept,
                    actionDisabled && styles.btnDisabled,
                  ]}
                  onPress={onPressAction}
                  disabled={actionDisabled}
                  activeOpacity={0.85}
                >
                  {busyAction ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon
                        name={
                          friendship?.isFriend
                            ? "account-remove"
                            : friendship?.requestIncoming
                            ? "account-check"
                            : "account-plus"
                        }
                        size={20}
                        color={
                          friendship?.isFriend
                            ? "#f87171"
                            : friendship?.requestIncoming
                            ? "#34d399"
                            : "#fff"
                        }
                      />
                      <Text
                        style={[
                          styles.primaryBtnText,
                          friendship?.isFriend && { color: "#f87171" },
                          friendship?.requestIncoming && { color: "#34d399" },
                        ]}
                      >
                        {actionLabel}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.requestedRow}>
                  <View style={[styles.primaryBtn, styles.primaryBtnRequested, { flex: 1 }]}>
                    <Icon name="clock-outline" size={18} color="#94a3b8" />
                    <Text style={[styles.primaryBtnText, { color: "#94a3b8" }]}>
                      Request Sent
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onPressCancelRequest}
                    disabled={busyAction || offline}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}


            </View>

            {/* ⚡ Error Message Row */}
            {errorMsg && (
              <View style={styles.errorRow}>
                <Icon name="alert-circle-outline" size={16} color="#fca5a5" />
                <Text style={styles.errorText}>{errorMsg}</Text>
                <TouchableOpacity onPress={() => setErrorMsg(null)} style={styles.retryBtn}>
                  <Icon name="close" size={16} color="#fca5a5" />
                </TouchableOpacity>
              </View>
            )}

            {/* Offline */}
            {offline && (
              <View style={styles.offlineBanner}>
                <Icon name="wifi-off" size={13} color="#475569" />
                <Text style={styles.offlineText}>Offline — showing cached data</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Custom Unfriend Confirmation Modal */}
      <Modal
        visible={unfriendModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnfriendModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIconWrap}>
              <Icon name="account-remove-outline" size={36} color="#f87171" />
            </View>
            <Text style={styles.confirmTitle}>Remove Friend</Text>
            <Text style={styles.confirmDesc}>
              Are you sure you want to remove {user?.name || "this user"} from your friends list? They will no longer see your updates.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setUnfriendModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmDangerBtn} 
                onPress={confirmUnfriend}
                disabled={busyAction}
              >
                {busyAction ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDangerText}>Remove</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar fullscreen modal */}
      <Modal
        visible={avatarPreviewVisible && !!avatarUri}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <TouchableOpacity
          style={styles.avatarModal}
          activeOpacity={1}
          onPress={() => setAvatarPreviewVisible(false)}
        >
          <Image
            source={{ uri: avatarUri! }}
            style={styles.avatarModalImg}
            resizeMode="contain"
          />
          <Text style={styles.avatarModalHint}>Tap to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTL: {
    position: "absolute", top: -80, left: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: "rgba(99,102,241,0.12)", 
  },
  glowBR: {
    position: "absolute", bottom: -100, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(139,92,246,0.10)", 
  },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 10,
  },

  // Centered Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: { 
    position: "relative", 
    marginBottom: 16,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  avatar: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 3, borderColor: "#1e293b",
  },
  avatarFallback: {
    width: 104, height: 104, borderRadius: 52,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#1e293b",
  },
  avatarInitial: { color: "#fff", fontSize: 40, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  displayName: {
    color: "#f8fafc", fontSize: 24,
    fontWeight: "800", letterSpacing: -0.4,
  },
  tickIcon: { marginLeft: 6, marginTop: 2 },
  handle: { color: "#94a3b8", fontSize: 15, fontWeight: "500", marginBottom: 16 },
  
  tagsRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    flexWrap: "wrap", justifyContent: "center"
  },
  
  // Relationship Style
  relationshipPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(244,63,94,0.12)",
    borderWidth: 1, borderColor: "rgba(244,63,94,0.3)",
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  relationshipPillEmpty: {
    backgroundColor: "rgba(148,163,184,0.08)",
    borderColor: "rgba(148,163,184,0.2)",
  },
  relationshipPillSuspended: {
    backgroundColor: "rgba(249, 115, 22, 0.15)", // Orange glow
    borderColor: "rgba(249, 115, 22, 0.4)", // Orange border
  },
  relationshipText: { color: "#fda4af", fontSize: 13, fontWeight: "700" },
  relationshipTextSuspended: { color: "#fdba74" }, // Orange text

  titleChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1, borderColor: "rgba(251,191,36,0.3)",
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  titleChipText: { color: "#fde68a", fontSize: 13, fontWeight: "700" },

  statsContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.6)",
    borderRadius: 20, paddingVertical: 20,
    marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.08)",
  },
  statBlock: { flex: 1, alignItems: "center", gap: 4 },
  statNumber: { color: "#f1f5f9", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(148,163,184,0.15)" },

  actionContainer: {
    flexDirection: "row", gap: 12, marginBottom: 24,
  },
  primaryBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#4f46e5",
    borderRadius: 16, paddingVertical: 16,
  },
  primaryBtnDanger: { backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" },
  primaryBtnAccept: { backgroundColor: "rgba(52,211,153,0.1)", borderWidth: 1, borderColor: "rgba(52,211,153,0.3)" },
  primaryBtnRequested: { backgroundColor: "rgba(30,41,59,0.8)", borderWidth: 1, borderColor: "rgba(148,163,184,0.15)" },
  primaryBtnPink: { backgroundColor: "rgba(244,63,94,0.1)", borderWidth: 1, borderColor: "rgba(244,63,94,0.3)" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  
  requestedRow: { flex: 1, flexDirection: "row", gap: 10 },
  
  cancelBtn: {
    paddingHorizontal: 20, borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(248,113,113,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: {
    color: "#f87171", fontSize: 15, fontWeight: "700",
  },

  messageBtn: {
    width: 56, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },

  detailsGrid: { flexDirection: "row", marginBottom: 12 },
  detailCard: {
    backgroundColor: "rgba(15,23,42,0.6)",
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.08)",
    alignItems: "flex-start"
  },
  locationCard: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  detailIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  detailTitle: { color: "#f1f5f9", fontSize: 16, fontWeight: "700", marginBottom: 4, marginLeft: 4 },
  detailSub: { color: "#64748b", fontSize: 13, fontWeight: "500" },

  friendBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(52,211,153,0.08)",
    borderWidth: 1, borderColor: "rgba(52,211,153,0.2)",
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 16
  },
  friendBannerText: { color: "#34d399", fontSize: 14, fontWeight: "600", flex: 1 },
  friendBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34d399" },

  // ⚡ Updated Error Row
  errorRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(127,29,29,0.3)",
    borderWidth: 1, borderColor: "rgba(248,113,113,0.2)",
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  errorText: { color: "#fca5a5", fontSize: 14, fontWeight: "500", flex: 1 },
  retryBtn: {
    padding: 6,
    borderRadius: 8, backgroundColor: "rgba(248,113,113,0.15)",
  },

  offlineBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16, justifyContent: "center" },
  offlineText: { color: "#64748b", fontSize: 13 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confirmModal: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
  },
  confirmIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(239,68,68,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  confirmTitle: { color: "#f8fafc", fontSize: 22, fontWeight: "800", marginBottom: 10 },
  confirmDesc: { color: "#94a3b8", fontSize: 15, textAlign: "center", marginBottom: 28, lineHeight: 22 },
  confirmActions: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
  },
  confirmCancelText: { color: "#cbd5e1", fontSize: 16, fontWeight: "600" },
  confirmDangerBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16,
    backgroundColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  confirmDangerText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  avatarModal: {
    flex: 1, backgroundColor: "rgba(2,6,23,0.96)",
    alignItems: "center", justifyContent: "center",
  },
  avatarModalImg: { width: SW - 40, height: SW - 40, borderRadius: 20 },
  avatarModalHint: { color: "#64748b", fontSize: 14, marginTop: 24, fontWeight: "500" },
});