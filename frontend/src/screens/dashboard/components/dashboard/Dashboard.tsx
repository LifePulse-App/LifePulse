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
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "@rneui/themed";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";

import MainLayout from "../../../../shared/components/MainLayout";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import DashboardService from "../../services/api_dashboard";

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
  discouraged: {
    label: "Discouraged",
    icon: "arrow-down-bold-circle-outline",
    color: "#F97316",
  },
  numb: { label: "Numb", icon: "emoticon-dead-outline", color: "#9CA3AF" },

  anxious: { label: "Anxious", icon: "alert-circle-outline", color: "#F97316" },
  stressed: { label: "Stressed", icon: "clock-alert-outline", color: "#FBBF24" },
  overwhelmed: { label: "Overwhelmed", icon: "water", color: "#38BDF8" },

  annoyed: { label: "Annoyed", icon: "emoticon-angry-outline", color: "#FB923C" },
  frustrated: { label: "Frustrated", icon: "emoticon-angry-outline", color: "#F97316" },
  angry: { label: "Angry", icon: "emoticon-angry-outline", color: "#EF4444" },
};

const Dashboard = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
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

  const [habits, setHabits] = useState([]);
  const [currentMood, setCurrentMood] = useState<{
    mood: string;
    createdAt: string;
  } | null>(null);

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

  useEffect(() => {
    const fetchTodayHabits = async () => {
      try {
        const res = await DashboardService.GetTodayHabits(); // adjust base url
        console.log(res?.data.habits);
        
        if (res.data?.success) {
          setHabits(res?.data.habits);
        }
      } catch (err: any) {
        console.log("Error loading today habits", err);
        const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load dashboard";
      setError(msg);
      }
    };
  
    fetchTodayHabits();
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Optional: early return if offline
      if (offline) {
        setLoading(false);
        return;
      }

      const res = await DashboardService.GetDashboardSummary();
      
      
      const responseData = (res as any).data ?? res;
      if (!responseData.success) {
        throw new Error(responseData.message || "Failed to load dashboard");
      }

      const { profile, secondaryCards, currentMood } = responseData.data;
      setProfile(profile);
      setSecondaryCards(secondaryCards || null);
      setCurrentMood(currentMood || null);

    } catch (err: any) {
      console.error("Dashboard fetch error:", err?.message || err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load dashboard";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const handleRetry = () => {
    fetchDashboard();
  };
  // Use skeleton instead of full-screen loader
  if (loading) {
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
              {/* <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass}>
                <Icon name="magnify" size={22} color="#E5E7EB" />
              </TouchableOpacity> */}
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
              Share your mood, grow your habits, and level up daily.
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
                      ? "You’re not connected to internet. Your will be synced with server when you’re back online."
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
    // use whatever navigation logic you already fixed (parent navigators etc.)
    navigation.navigate("MoodScreen", {
      currentMoodId: currentMood?.mood || null,
    });
  }}
>
  <View style={styles.glassButtonInner}>
    {currentMood && MOOD_METADATA[currentMood.mood] ? (
      <>
        <Icon
          name={MOOD_METADATA[currentMood.mood].icon}
          size={22}
          color={MOOD_METADATA[currentMood.mood].color || "#F9FAFB"}
        />
        <Text style={styles.glassButtonText}>
          {MOOD_METADATA[currentMood.mood].label}
        </Text>
      </>
    ) : (
      <>
        <Icon
          name="emoticon-happy-outline"
          size={22}
          color="#F9FAFB"
        />
        <Text style={styles.glassButtonText}>
          Share your current mood
        </Text>
      </>
    )}
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
    <Text style={styles.sectionTitle}>Today’s Activities</Text>
    <Text style={styles.sectionHint}>Verify and earn XP</Text>
  </View>

  {habits.length === 0 ? (
    <View style={{ paddingVertical: 10 }}>
      <Text
        style={{
          fontSize: 13,
          color: "#9CA3AF",
          textAlign: "center",
        }}
      >
        No activities updated for today yet.
      </Text>
    </View>
  ) : (
    <FlatList
      data={habits}
      keyExtractor={(item: any) => item.id}
      scrollEnabled={false}
      ItemSeparatorComponent={() => (
        <View style={styles.listSeparator} />
      )}
      renderItem={({ item }: any) => (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.habitRow}
        >
          <View style={styles.habitLeft}>
            <View style={styles.habitIconWrap}>
              <Icon name={item.icon || "check"} size={22} color="#C4B5FD" />
            </View>
            <View>
              <Text style={styles.habitLabel}>
                {item.label || item.habitName}
              </Text>
              <Text style={styles.habitTime}>{item.time || ""}</Text>
            </View>
          </View>

          <View style={styles.checkboxOuter}>
            <View
              style={[
                styles.checkboxInner,
                item.status === "verified" && { backgroundColor: "#22C55E" },
                item.status === "rejected" && { backgroundColor: "#EF4444" },
                item.status === "pending" && { backgroundColor: "#FFFFFF" },
              ]}
            >
              <Icon
                name="check"
                size={14}
                color={
                  item.status === "pending" ? "#111827" : "#FFFFFF"
                }
              />
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  )}
</View>

            <View style={{ height: 40 }} />
          </ScrollView>
                  {/* Floating Camera Button */}
                  <TouchableOpacity
      activeOpacity={0.8}
      style={styles.floatingCameraButton}
      onPress={() => navigation.navigate('ProofCamera', { habitId: null })}
    >
      <Icon name="camera-outline" size={26} color="#F9FAFB" />
    </TouchableOpacity>
        </View>
      </AppScreen>
    </MainLayout>
  );
};

// Skeleton component for glass cards
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
                    { backgroundColor: "rgba(15, 23, 42, 0.9)" },
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
    borderColor: "white",
    borderWidth: 0.2
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
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(148,163,184,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 22,
    height: 22,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF", // default white (pending)
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

  // Skeleton styles
  skeletonCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginBottom: 18,
    overflow: "hidden",
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(31, 41, 55, 0.7)",
  },
  skeletonRight: {
    flex: 1,
    marginLeft: 16,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: "40%",
  },
  skeletonLineMedium: {
    width: "65%",
  },
  skeletonLineLong: {
    width: "85%",
  },
  skeletonSmallCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  skeletonHabitLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonHabitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    marginRight: 10,
  },
  skeletonHabitTextBlock: {
    width: 150,
  },
  skeletonHabitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
  },
  floatingCameraButton: {
    position: "absolute",
    right: 20,
    bottom: Platform.OS === "android" ? 20 : 25, // slightly above navbar / home indicator
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(30, 64, 175, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 10,
  },
});

export default Dashboard;