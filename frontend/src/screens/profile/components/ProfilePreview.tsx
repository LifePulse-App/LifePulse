import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
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
};

type Friendship = {
  isFriend: boolean;
  requestSent: boolean;
  requestIncoming: boolean;
};

type PreviewResponse = {
  user: PreviewUser;
  friendship: Friendship;
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

export default function ProfilePreviewScreen({ navigation, route }: Props) {
  const userId = route.params?.userId;
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [user, setUser] = useState<PreviewUser | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected || state.isInternetReachable === false);
    });
    return () => unsub();
  }, []);

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 75, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 75, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

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
      animateIn();
    }

    if (offline) return;
    setLoading(true);
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
      await saveCache(cacheKey(userId), {
        user: mergedUser,
        friendship: payload.friendship,
      });
      if (!cached) animateIn();
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message || e?.message || "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  }, [userId, offline, seedFromRoute, animateIn, route.params?.name, route.params?.username]);

  useEffect(() => {
    load();
  }, [offline, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Separate location text from canSeeLocation logic
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

  const avatarUri = user?.avatarUrl
    ? user.avatarUrl.startsWith("http")
      ? user.avatarUrl
      : newUrl + user.avatarUrl
    : null;

  const actionLabel = friendship?.isFriend
    ? "Unfriend"
    : friendship?.requestIncoming
    ? "Accept Request"
    : friendship?.requestSent
    ? "Requested"
    : "Add Friend";

  const actionDisabled =
    busyAction || loading || offline || actionLabel === "Requested";

  const onPressAction = async () => {
    if (!userId || !friendship) return;
    if (offline) {
      return;
    }
    try {
      setBusyAction(true);
      if (friendship.isFriend) {
        await (socialApi as any).unfriend(userId);
      } else if (friendship.requestIncoming) {
        await (socialApi as any).acceptFriendRequest(userId);
      } else if (!friendship.requestSent) {
        await (socialApi as any).sendFriendRequest(userId);
      }
      await load();
    } catch (e: any) {
    
    } finally {
      setBusyAction(false);
    }
  };

  const onPressCancelRequest = async () => {
    if (!userId || offline) return;
    try {
      setBusyAction(true);
      await (socialApi as any).removeFriendRequest(userId);
      await load();
    } catch (e: any) {
     
    } finally {
      setBusyAction(false);
    }
  };

  const hasMood = !!user?.mood;
  const locationHidden = user?.canSeeLocation === false;
  const hasLocation = !!locationText && !locationHidden;

  return (
    <View style={styles.root}>
      <View style={styles.bg} />
      <View style={styles.glowTL} />
      <View style={styles.glowBR} />
      <View style={styles.glowMid} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={20} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>
          {user?.name || "Profile"}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#818cf8" style={{ width: 36 }} />
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            gap: 12,
          }}
        >
          {/* ── Hero Card ── */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={levelColors}
              style={styles.levelAccentBar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.heroInner}>
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
                <View style={styles.onlineDot} />
              </TouchableOpacity>

           <View style={styles.identityCol}>
  <View style={styles.nameRow}>
    <Text style={styles.displayName} numberOfLines={1}>
      {user?.name || "—"}
    </Text>
    {/* Verification ticks */}
    {user?.tick === "verified" && (
      <Icon
        name="check-decagram" // verified badge, blue
        size={21}
        color="#3b82f6" // blue
        style={styles.tickIcon}
      />
    )}
    {user?.tick === "golden" && (
      <Icon
        name="check-decagram" // verified badge, gold
        size={21}
        color="#fbbf24" // gold
        style={styles.tickIcon}
      />
    )}
    {/* If tick is none or not sent, render nothing */}
  </View>
  {user?.username ? (
    <View style={styles.usernameRow}>
      <Text style={styles.handle}>@{user.username}</Text>
    </View>
  ) : null}
</View>
            </View>

            <View style={styles.levelRow}>
              <LinearGradient
                colors={levelColors}
                style={styles.levelBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.levelNum}>{user?.level ?? "—"}</Text>
              </LinearGradient>
              <View>
                <Text style={styles.levelLabel}>LEVEL</Text>
                <Text style={styles.levelTitleText}>{levelTitle}</Text>
              </View>
              {user?.title ? (
                <View style={styles.titleChip}>
                  <Icon name="crown" size={12} color="#fbbf24" />
                  <Text style={styles.titleChipText} numberOfLines={1}>
                    {user.title}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["rgba(251,191,36,0.15)", "rgba(245,158,11,0.04)"]}
                style={styles.statGradient}
              >
                <Icon name="trophy-outline" size={22} color="#fbbf24" />
                <Text style={styles.statValue}>
                  {user?.points?.toLocaleString() ?? "—"}
                </Text>
                <Text style={styles.statLabel}>POINTS</Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["rgba(129,140,248,0.15)", "rgba(99,102,241,0.04)"]}
                style={styles.statGradient}
              >
                <Icon name="podium" size={22} color="#818cf8" />
                <Text style={styles.statValue}>
                  {user?.leaderboardRank ? `#${user.leaderboardRank}` : "—"}
                </Text>
                <Text style={styles.statLabel}>RANK</Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["rgba(249,115,22,0.15)", "rgba(234,88,12,0.04)"]}
                style={styles.statGradient}
              >
                <Icon name="fire" size={22} color="#f97316" />
                <Text style={styles.statValue}>{user?.streak ?? "—"}</Text>
                <Text style={styles.statLabel}>STREAK</Text>
              </LinearGradient>
            </View>
          </View>

          {/* ── Mood Card — always visible ── */}
          <View style={[
            styles.moodCard,
            !hasMood && { borderColor: "rgba(71,85,105,0.2)" },
          ]}>
            <LinearGradient
              colors={
                hasMood
                  ? ["rgba(52,211,153,0.14)", "rgba(16,185,129,0.04)"]
                  : ["rgba(30,41,59,0.5)", "rgba(15,23,42,0.3)"]
              }
              style={styles.moodCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[
                styles.moodIconWrap,
                !hasMood && { backgroundColor: "rgba(71,85,105,0.15)" },
              ]}>
                <Text style={styles.moodEmoji}>{hasMood ? "✨" : "😶"}</Text>
              </View>
              <View style={styles.moodContent}>
                <Text style={[
                  styles.moodCardLabel,
                  !hasMood && { color: "#475569" },
                ]}>
                  CURRENT MOOD
                </Text>
                <Text style={[
                  styles.moodCardValue,
                  !hasMood && { color: "#475569", fontSize: 14, fontWeight: "500" },
                ]}>
                  {user?.mood || "No mood set"}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* ── Location Card — always visible ── */}
          <View style={[
            styles.locationCard,
            (!hasLocation) && { borderColor: "rgba(71,85,105,0.2)" },
          ]}>
            <LinearGradient
              colors={
                hasLocation
                  ? ["rgba(96,165,250,0.14)", "rgba(59,130,246,0.04)"]
                  : ["rgba(30,41,59,0.5)", "rgba(15,23,42,0.3)"]
              }
              style={styles.locationCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[
                styles.locationIconWrap,
                !hasLocation && { backgroundColor: "rgba(71,85,105,0.15)" },
              ]}>
                <Icon
                  name={
                    locationHidden
                      ? "map-marker-off"
                      : hasLocation
                      ? "map-marker"
                      : "map-marker-question"
                  }
                  size={20}
                  color={hasLocation ? "#60a5fa" : "#475569"}
                />
              </View>
              <View style={styles.locationContent}>
                <Text style={[
                  styles.locationCardLabel,
                  !hasLocation && { color: "#475569" },
                ]}>
                  LOCATION
                </Text>
                <Text style={[
                  styles.locationCardValue,
                  !hasLocation && { color: "#475569", fontSize: 14, fontWeight: "500" },
                ]}>
                  {locationHidden
                    ? "Hidden by user"
                    : locationText || "No location set"}
                </Text>
              </View>
              {locationHidden && (
                <Icon name="lock-outline" size={16} color="#334155" />
              )}
              {hasLocation && (
                <Icon name="chevron-right" size={18} color="#334155" />
              )}
            </LinearGradient>
          </View>

          {/* ── Profile Info Card ── */}
          {(user?.level !== undefined || user?.title) ? (
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>PROFILE INFO</Text>
              <View style={styles.infoGrid}>
                {user?.level !== undefined && (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: "rgba(167,139,250,0.12)" }]}>
                      <Icon name="star-four-points" size={15} color="#a78bfa" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoRowLabel}>Level Progress</Text>
                      <Text style={styles.infoRowValue}>
                        Level {user.level} · {levelTitle}
                      </Text>
                    </View>
                    <LinearGradient
                      colors={levelColors}
                      style={styles.infoLevelPill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.infoLevelPillText}>{user.level}</Text>
                    </LinearGradient>
                  </View>
                )}
                {user?.title ? (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconWrap, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
                      <Icon name="crown" size={15} color="#fbbf24" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoRowLabel}>Current Title</Text>
                      <Text style={styles.infoRowValue}>{user.title}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ── Friendship Banners ── */}
          {friendship?.isFriend && (
            <View style={styles.friendBanner}>
              <Icon name="account-check" size={16} color="#34d399" />
              <Text style={styles.friendBannerText}>You're friends</Text>
              <View style={styles.friendBannerDot} />
            </View>
          )}
          {friendship?.requestIncoming && (
            <View style={[styles.friendBanner, styles.friendBannerPending]}>
              <Icon name="account-clock" size={16} color="#fbbf24" />
              <Text style={[styles.friendBannerText, { color: "#fbbf24" }]}>
                Sent you a friend request
              </Text>
            </View>
          )}

          {/* ── Action Buttons ── */}
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
                    size={18}
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
                <Icon name="clock-outline" size={16} color="#64748b" />
                <Text style={[styles.primaryBtnText, { color: "#64748b" }]}>
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

          {/* Error */}
          {errorMsg ? (
            <View style={styles.errorRow}>
              <Icon name="alert-circle-outline" size={14} color="#f87171" />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Offline */}
          {offline ? (
            <View style={styles.offlineBanner}>
              <Icon name="wifi-off" size={13} color="#475569" />
              <Text style={styles.offlineText}>Offline — showing cached data</Text>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

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
    backgroundColor: "rgba(99,102,241,0.18)",
  },
  nameRow: { flexDirection: "row", alignItems: "center" },
usernameRow: { flexDirection: "row", alignItems: "center" },
tickIcon: {
  marginLeft: 7,
  marginTop: 2,
  // Optionally: add shadow or circle background for Instagram style
},
tickIconSmall: {
  marginLeft: 5, marginTop: 2,
},
  glowBR: {
    position: "absolute", bottom: -100, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: "rgba(139,92,246,0.15)",
  },
  glowMid: {
    position: "absolute", top: 220, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(59,130,246,0.10)",
  },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 54 : 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  headerName: {
    flex: 1, marginHorizontal: 12,
       marginTop: 20,
    color: "#f1f5f9", fontSize: 17, fontWeight: "700",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    paddingTop: 4,
  },

  // Hero
  heroCard: {
    backgroundColor: "rgba(15,23,42,0.75)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    overflow: "hidden",
  },
  levelAccentBar: { height: 3 },
  heroInner: {
    flexDirection: "row", alignItems: "center",
    padding: 16, paddingBottom: 10,
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 2, borderColor: "rgba(99,102,241,0.5)",
  },
  avatarFallback: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(99,102,241,0.5)",
  },
  avatarInitial: { color: "#fff", fontSize: 30, fontWeight: "800" },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#34d399",
    borderWidth: 2.5, borderColor: "#020617",
  },
  identityCol: { flex: 1 },
  displayName: {
    color: "#f1f5f9", fontSize: 22,
    fontWeight: "800", letterSpacing: -0.4,
  },
  handle: { color: "#475569", fontSize: 13, marginTop: 3 },
  levelRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  levelBadge: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  levelNum: { color: "#fff", fontSize: 16, fontWeight: "900" },
  levelLabel: {
    color: "#475569", fontSize: 9,
    fontWeight: "700", letterSpacing: 1, marginBottom: 2,
  },
  levelTitleText: { color: "#cbd5e1", fontSize: 14, fontWeight: "700" },
  titleChip: {
    marginLeft: "auto",
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1, borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  titleChipText: { color: "#fde68a", fontSize: 12, fontWeight: "700" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.1)",
    overflow: "hidden",
  },
  statGradient: { alignItems: "center", paddingVertical: 20, gap: 5 },
  statValue: { color: "#f1f5f9", fontSize: 18, fontWeight: "800" },
  statLabel: {
    color: "#475569", fontSize: 9,
    fontWeight: "700", letterSpacing: 0.8,
  },

  // Mood
  moodCard: {
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(52,211,153,0.22)",
  },
  moodCardGradient: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 20, paddingHorizontal: 16, gap: 14,
  },
  moodIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "rgba(52,211,153,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  moodEmoji: { fontSize: 22 },
  moodContent: { flex: 1 },
  moodCardLabel: {
    color: "#34d399", fontSize: 9,
    fontWeight: "700", letterSpacing: 1.2, marginBottom: 4,
  },
  moodCardValue: { color: "#ecfdf5", fontSize: 16, fontWeight: "700" },

  // Location
  locationCard: {
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(96,165,250,0.22)",
  },
  locationCardGradient: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 20, gap: 14,
  },
  locationIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "rgba(96,165,250,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  locationContent: { flex: 1 },
  locationCardLabel: {
    color: "#60a5fa", fontSize: 9,
    fontWeight: "700", letterSpacing: 1.2, marginBottom: 4,
  },
  locationCardValue: { color: "#eff6ff", fontSize: 16, fontWeight: "700" },

  // Info card
  infoCard: {
    backgroundColor: "rgba(15,23,42,0.7)",
    borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    padding: 14,
  },
  sectionLabel: {
    color: "#334155", fontSize: 9,
    fontWeight: "700", letterSpacing: 1.4, marginBottom: 12,
  },
  infoGrid: { gap: 10 },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12, padding: 10,
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  infoRowLabel: { color: "#475569", fontSize: 10, fontWeight: "600", marginBottom: 2 },
  infoRowValue: { color: "#cbd5e1", fontSize: 14, fontWeight: "600" },
  infoLevelPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  infoLevelPillText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Friend banners
  friendBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(52,211,153,0.07)",
    borderWidth: 1, borderColor: "rgba(52,211,153,0.2)",
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14,
  },
  friendBannerPending: {
    backgroundColor: "rgba(251,191,36,0.07)",
    borderColor: "rgba(251,191,36,0.2)",
  },
  friendBannerText: { color: "#34d399", fontSize: 13, fontWeight: "600", flex: 1 },
  friendBannerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#34d399",
  },

  // Actions
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(99,102,241,0.9)",
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1, borderColor: "rgba(129,140,248,0.35)",
  },
  primaryBtnDanger: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(248,113,113,0.3)",
  },
  primaryBtnAccept: {
    backgroundColor: "rgba(52,211,153,0.1)",
    borderColor: "rgba(52,211,153,0.3)",
  },
  primaryBtnRequested: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(148,163,184,0.12)",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.45 },
  requestedRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { color: "#64748b", fontSize: 14, fontWeight: "600" },

  errorRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(127,29,29,0.3)",
    borderWidth: 1, borderColor: "rgba(248,113,113,0.2)",
    borderRadius: 10, padding: 10,
  },
  errorText: { color: "#fca5a5", fontSize: 12, flex: 1 },
  retryBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
  },
  retryText: { color: "#f87171", fontSize: 11, fontWeight: "600" },

  offlineBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  offlineText: { color: "#334155", fontSize: 12 },

  avatarModal: {
    flex: 1, backgroundColor: "rgba(2,6,23,0.96)",
    alignItems: "center", justifyContent: "center",
  },
  avatarModalImg: { width: SW - 40, height: SW - 40, borderRadius: 20 },
  avatarModalHint: { color: "#334155", fontSize: 13, marginTop: 18 },
});