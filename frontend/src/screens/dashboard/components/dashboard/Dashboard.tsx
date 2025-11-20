import React, { useEffect, useState, useCallback } from "react";
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
} from "react-native";
import { Text } from "@rneui/themed";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";

import MainLayout from "../../../../shared/components/MainLayout";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import DashboardService from "../../services/api_dashboard";
import { loadDashboardCache, saveDashboardCache, CachedDashboard } from "./DashboardStorage";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";
const ICON_GLASS_BG = "rgba(15, 23, 42, 0)";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);      // "no UI yet" loading
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<{
    name: string;
    xpProgress: {
      level: number;
      title: string;
      currentXp: number;
      nextLevelXp: number | null;
      progressPercent: number;
    };
    streak: {
      count: number;
      lastUpdated: string;
    };
    streakTitle: string;
  } | null>(null);

  const [secondaryCards, setSecondaryCards] = useState<{
    motivation: string;
    reflectionCount: number;
    habitCompletionRate: number;
  } | null>(null);

  const [habits] = useState<
    { id: string; label: string; time: string; icon: string }[]
  >([
    { id: "1", label: "Drink Water", time: "Morning", icon: "cup-water" },
    { id: "2", label: "Meditate", time: "Morning", icon: "meditation" },
    { id: "3", label: "Read", time: "Evening", icon: "book-open-variant" },
    { id: "4", label: "Walk 5k steps", time: "Anytime", icon: "walk" },
  ]);

  // NetInfo: connectivity listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline =
        !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchDashboard = useCallback(
    async (options?: { fromUserAction?: boolean }) => {
      try {
        if (options?.fromUserAction) {
          setLoading(true); // show loader if user explicitly taps retry
        }
        setError(null);

        if (offline) {
          if (options?.fromUserAction) setLoading(false);
          return;
        }

        const res = await DashboardService.GetDashboardSummary();
        const responseData = (res as any).data ?? res;

        if (!responseData.success) {
          throw new Error(responseData.message || "Failed to load dashboard");
        }

        const { profile, secondaryCards } = responseData.data;
        setProfile(profile);
        setSecondaryCards(secondaryCards || null);

        // ✅ Save snapshot to cache
        const cache: CachedDashboard = {
          profile: profile || null,
          secondaryCards: secondaryCards || null,
        };
        await saveDashboardCache(cache);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err?.message || err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard";
        setError(msg);
      } finally {
        if (options?.fromUserAction) {
          setLoading(false);
        }
      }
    },
    [offline]
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      // 1) Try to load cached snapshot first
      const cached = await loadDashboardCache();
      if (mounted && cached) {
        setProfile(cached.profile);
        setSecondaryCards(cached.secondaryCards);
        setLoading(false); // UI can show immediately
      }

      // 2) Fetch fresh data in background (no blocking if we had cache)
      await fetchDashboard();
      if (mounted) {
        // If we had no cache at all, stop the spinner now
        setLoading(false);
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [fetchDashboard]);

  const handleRetry = () => {
    fetchDashboard({ fromUserAction: true });
  };

  const handleHabitPress = (habitId: string) => {
    Alert.alert("Habit tapped", `Habit id: ${habitId}`);
  };

  if (loading && !profile && !secondaryCards) {
    return <DashboardSkeleton />;
  }

  const level = profile?.xpProgress.level ?? 1;
  const xp = profile?.xpProgress.currentXp ?? 0;
  const xpRequired = profile?.xpProgress.nextLevelXp ?? 100;
  const fill =
    profile?.xpProgress.progressPercent ??
    (xpRequired ? (xp / xpRequired) * 100 : 0);
  const streakCount = profile?.streak?.count ?? 0;
  const streakLabel =
    streakCount > 0 ? `${streakCount}-day streak` : "No streak yet";

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        {/* Background */}
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass}>
              <Icon name="account-circle-outline" size={26} color="#E5E7EB" />
            </TouchableOpacity>

            <View style={styles.topBarRight}>
              <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass}>
                <Icon name="magnify" size={22} color="#E5E7EB" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass}>
                <Icon name="account-plus-outline" size={22} color="#E5E7EB" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.streakPill}>
                <Icon name="fire" size={20} color="#FDBA74" />
                <Text style={styles.streakText}>{streakLabel}</Text>
              </View>

              <View style={styles.profileTextBlock}>
                <Text style={styles.profileTextMain}>
                  {profile?.name ? `Hi, ${profile.name}` : "Hi, there"}
                </Text>
                <Text style={styles.profileTextSub}>
                  {profile?.streakTitle || "Let’s check in today"}
                </Text>
              </View>
            </View>

            <Text style={styles.mainTitle}>Your Mood Journey</Text>
            <Text style={styles.subtitle}>
              Track your feelings, grow your habits, and level up daily.
            </Text>

            {/* Offline / error banner */}
            {(offline || error) && (
              <View style={styles.errorCard}>
                <Icon name="cloud-alert" size={20} color="#F87171" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.errorTitle}>
                    {offline ? "Offline mode" : "Something went wrong"}
                  </Text>
                  <Text style={styles.errorText}>
                    {offline
                      ? "You’re not connected. Your mood logs will sync when you’re back online."
                      : error}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.errorRetryBtn}
                  onPress={handleRetry}
                >
                  <Text style={styles.errorRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Level card */}
            <View style={styles.card}>
              <View style={styles.levelSection}>
                <AnimatedCircularProgress
                  size={150}
                  width={12}
                  fill={fill}
                  fillLineCap="round"
                  rotation={0}
                  tintColor="#A855F7"
                  backgroundColor="rgba(148, 163, 184, 0.25)"
                >
                  {() => (
                    <View style={styles.levelCircle}>
                      <Text style={styles.levelText}>Level</Text>
                      <Text style={styles.levelNumber}>{level}</Text>
                    </View>
                  )}
                </AnimatedCircularProgress>

                <View style={styles.levelInfo}>
                  <Text style={styles.levelLabel}>
                    {profile?.xpProgress.title || "Mood Master"}
                  </Text>
                  <Text style={styles.xpText}>
                    {xp} / {xpRequired} XP
                  </Text>
                  <View style={styles.xpBarBackground}>
                    <View
                      style={[styles.xpBarFill, { width: `${fill || 0}%` }]}
                    />
                  </View>
                  <Text style={styles.levelHint}>
                    {secondaryCards?.motivation ||
                      "Complete today’s habits to reach the next level."}
                  </Text>
                </View>
              </View>
            </View>

            {/* Main glass button */}
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.glassButton}
              onPress={() => {
                // navigate to mood log screen
              }}
            >
              <View style={styles.glassButtonInner}>
                <Icon
                  name="emoticon-happy-outline"
                  size={22}
                  color="#F9FAFB"
                />
                <Text style={styles.glassButtonText}>Log today’s mood</Text>
              </View>
            </TouchableOpacity>

            {/* Today overview cards */}
            <View style={styles.smallCardRow}>
              <View style={styles.smallCard}>
                <Icon name="white-balance-sunny" size={22} color="#FBBF24" />
                <Text style={styles.smallCardTitle}>Reflections</Text>
                <Text style={styles.smallCardValue}>
                  {secondaryCards?.reflectionCount ?? 0}
                </Text>
              </View>

              <View style={[styles.smallCard, { marginRight: 0 }]}>
                <Icon name="clock-outline" size={22} color="#60A5FA" />
                <Text style={styles.smallCardTitle}>Habits Completed</Text>
                <Text style={styles.smallCardValue}>
                  {secondaryCards?.habitCompletionRate ?? 0}
                </Text>
              </View>
            </View>

            {/* Habits list */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>Today’s Habits</Text>
                <Text style={styles.sectionHint}>
                  Tap to complete and earn XP
                </Text>
              </View>

              <FlatList
                data={habits}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View style={styles.listSeparator} />
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.habitRow}
                    onPress={() => handleHabitPress(item.id)}
                  >
                    <View style={styles.habitLeft}>
                      <View style={styles.habitIconWrap}>
                        <Icon name={item.icon} size={22} color="#C4B5FD" />
                      </View>
                      <View>
                        <Text style={styles.habitLabel}>{item.label}</Text>
                        <Text style={styles.habitTime}>{item.time}</Text>
                      </View>
                    </View>
                    <View style={styles.checkboxOuter}>
                      <View style={styles.checkboxInner} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </AppScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(168, 85, 247, 0.35)",
  },
  overlay: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? "3%" : "5%",
    paddingHorizontal: 20,
  },
  scrollContent: {},
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2%",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: ICON_GLASS_BG,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2%",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "5%",
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(22, 101, 52, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.4)",
  },
  streakText: {
    color: "#BBF7D0",
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
  },
  profileTextBlock: {
    alignItems: "flex-end",
  },
  profileTextMain: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  profileTextSub: {
    color: "#9CA3AF",
    fontSize: 11,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 18,
  },
  card: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 8,
  },
  levelSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelCircle: {
    justifyContent: "center",
    alignItems: "center",
  },
  levelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A855F7",
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#E5DEFF",
  },
  levelInfo: {
    flex: 1,
    marginLeft: 16,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  xpText: {
    fontSize: 13,
    color: "#C4B5FD",
    fontWeight: "600",
    marginTop: 4,
  },
  xpBarBackground: {
    width: "100%",
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    marginTop: 8,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#8B5CF6",
  },
  levelHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
  },
  glassButton: {
    marginTop: 4,
    marginBottom: 18,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(30, 64, 175, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.7)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  glassButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  glassButtonText: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },
  smallCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  smallCard: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginRight: 10,
  },
  smallCardTitle: {
    marginTop: 8,
    fontSize: 12,
    color: "#9CA3AF",
  },
  smallCardValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  sectionHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  listSeparator: {
    height: 1,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    marginVertical: 8,
  },
  habitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(55, 65, 81, 0.8)",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  habitLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  habitTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  checkboxOuter: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#A855F7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 5,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(127, 29, 29, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.45)",
    marginTop: 5,
    marginBottom: 10,
  },
  errorTitle: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  errorText: {
    color: "#FEE2E2",
    fontSize: 11,
  },
  errorRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248, 250, 252, 0.5)",
    marginLeft: 8,
  },
  errorRetryText: {
    color: "#FEF2F2",
    fontSize: 11,
    fontWeight: "600",
  },
  skeletonCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginBottom: 18,
    overflow: 'hidden',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
  },
  skeletonRight: {
    flex: 1,
    marginLeft: 16,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '40%',
  },
  skeletonLineMedium: {
    width: '65%',
  },
  skeletonLineLong: {
    width: '85%',
  },
  skeletonSmallCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  skeletonSmallCard: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginRight: 10,
  },
  skeletonHabitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  skeletonHabitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonHabitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    marginRight: 10,
  },
  skeletonHabitTextBlock: {
    width: 150,
  },
  skeletonHabitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
  },
});

const DashboardSkeleton = () => {
  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        {/* Background */}
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <View style={styles.overlay}>
          {/* Top bar skeleton */}
          <View style={styles.topBar}>
            <View style={styles.iconGlass} />
            <View style={styles.topBarRight}>
              <View style={styles.iconGlass} />
              <View style={styles.iconGlass} />
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header skeleton */}
            <View style={styles.headerRow}>
              <View style={styles.streakPill}>
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    { backgroundColor: 'rgba(15, 23, 42, 0.9)' },
                  ]}
                />
              </View>

              <View style={styles.profileTextBlock}>
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineMedium,
                    { marginBottom: 4 },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    { marginBottom: 0 },
                  ]}
                />
              </View>
            </View>

            <View
              style={[
                styles.skeletonLine,
                styles.skeletonLineLong,
                { marginBottom: 6 },
              ]}
            />
            <View
              style={[
                styles.skeletonLine,
                styles.skeletonLineMedium,
                { marginBottom: 18 },
              ]}
            />

            {/* Level card skeleton */}
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonRight}>
                  <View
                    style={[
                      styles.skeletonLine,
                      styles.skeletonLineMedium,
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      styles.skeletonLineLong,
                    ]}
                  />
                  <View
                    style={[
                      styles.skeletonLine,
                      styles.skeletonLineShort,
                      { marginBottom: 0 },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Small cards skeleton */}
            <View style={styles.skeletonSmallCardRow}>
              <View style={styles.skeletonSmallCard}>
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    { marginBottom: 12 },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineMedium,
                    { marginBottom: 4 },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    { marginBottom: 0 },
                  ]}
                />
              </View>
              <View style={[styles.skeletonSmallCard, { marginRight: 0 }]}>
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    { marginBottom: 12 },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineMedium,
                    { marginBottom: 4 },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    styles.skeletonLineShort,
                    { marginBottom: 0 },
                  ]}
                />
              </View>
            </View>

            {/* Habits skeleton card */}
            <View style={styles.skeletonCard}>
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonLineMedium,
                  { marginBottom: 8 },
                ]}
              />
              <View
                style={[
                  styles.skeletonLine,
                  styles.skeletonLineShort,
                  { marginBottom: 16 },
                ]}
              />

              {Array.from({ length: 4 }).map((_, index) => (
                <View key={index}>
                  <View style={styles.skeletonHabitRow}>
                    <View style={styles.skeletonHabitLeft}>
                      <View style={styles.skeletonHabitIcon} />
                      <View style={styles.skeletonHabitTextBlock}>
                        <View
                          style={[
                            styles.skeletonLine,
                            styles.skeletonLineLong,
                          ]}
                        />
                        <View
                          style={[
                            styles.skeletonLine,
                            styles.skeletonLineShort,
                            { marginBottom: 0 },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.skeletonHabitCheckbox} />
                  </View>
                  {index < 3 && <View style={styles.listSeparator} />}
                </View>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </AppScreen>
    </MainLayout>
  );
};

export default Dashboard;