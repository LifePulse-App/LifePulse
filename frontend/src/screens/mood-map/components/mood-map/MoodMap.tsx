import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  PermissionsAndroid,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppText from "../../../../components/Layout/AppText/AppText";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import MainLayout from "../../../../shared/components/MainLayout";
import * as MapLibreGL from "@maplibre/maplibre-react-native";
import Geolocation from "react-native-geolocation-service";
import locationApi, { ShareMode } from "../../services/api_location";
import AuthContext from "../../../../auth/user/UserContext";
import socialApi from "../../../friends/services/api_friends";
import MoodService from "../../../moodscreen/services/api_mood";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { getSocket } from "../../../../auth/api-client/socket";

// --- Single source of truth for mood colors ---
const MOOD_COLORS = {
  ecstatic: "#22c55e",
  happy: "#4ade80",
  grateful: "#86efac",
  calm: "#38bdf8",
  relaxed: "#60a5fa",
  lovely: "#f472b6",
  neutral: "#f59e0b",
  meh: "#fbbf24",
  tired: "#94a3b8",
  confused: "#a855f7",
  sad: "#3b82f6",
  lonely: "#1d4ed8",
  discouraged: "#1e40af",
  numb: "#475569",
  anxious: "#f97316",
  stressed: "#ef4444",
  overwhelmed: "#dc2626",
  annoyed: "#f43f5e",
  frustrated: "#e11d48",
  angry: "#b91c1c",
};

const MOOD_LEGEND = Object.entries(MOOD_COLORS).map(([mood, color]) => ({ mood, color }));
const moodMatchArray = [
  "match",
  ["get", "mood"],
  ...Object.entries(MOOD_COLORS).flat(),
  "#94a3b8",
];

const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const CACHE_KEYS = {
  myLocation: "moodmap:myLocation:v1",
  friendLocations: "moodmap:friendLocations:v1",
  worldMoods: "moodmap:worldMoods:v1",
  allFriends: "moodmap:allFriends:v1",
  share: "moodmap:shareSettings:v1",
};

const MoodMap = () => {
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.User?.user?.id;
  const insets = useSafeAreaInsets();

  // --- TrueSheet refs (replaces @gorhom/bottom-sheet refs) ---
  const legendSheetRef = useRef<TrueSheet>(null);
  const settingsSheetRef = useRef<TrueSheet>(null);

  // detents are fractions of screen height (0-1), equivalent to old "25%" / "30%" snapPoints
  const legendDetents = useMemo(() => [0.88], []);
  const settingsDetents = useMemo(() => [0.87], []);

  const closeAllSheets = async () => {
    await Promise.all([
      legendSheetRef.current?.dismiss(),
      settingsSheetRef.current?.dismiss(),
    ]);
  };

  const openLegend = async () => {
    await closeAllSheets();
    await legendSheetRef.current?.present();
  };

  const closeLegend = () => legendSheetRef.current?.dismiss();

  const openSettings = async () => {
    await closeAllSheets();
    await settingsSheetRef.current?.present();
  };
  const closeSettings = () => settingsSheetRef.current?.dismiss();

  const [offline, setOffline] = useState(false);

  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [moods, setMoods] = useState<any[]>([]);
  const cameraRef = useRef<typeof MapLibreGL.Camera>(null);

  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>("all");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendLocations, setFriendLocations] = useState<any[]>([]);
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [worldMoods, setWorldMoods] = useState<any[]>([]);

const socket = getSocket();

  const saveCache = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  const loadCache = async <T,>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Check offline status
    const unsub = NetInfo.addEventListener((state) => {
      const offlineNow = !state.isConnected || state.isInternetReachable === false;
      setOffline(offlineNow);
    });
    return () => unsub();
  }, []);

  // --- OFFLINE-FIRST: Load cache before anything else ---
  useEffect(() => {
    (async () => {
      const [cachedMyLoc, cachedFriendsLoc, cachedWorldMoods, cachedFriends, cachedShare] =
        await Promise.all([
          loadCache<[number, number]>(CACHE_KEYS.myLocation),
          loadCache<any[]>(CACHE_KEYS.friendLocations),
          loadCache<any[]>(CACHE_KEYS.worldMoods),
          loadCache<any[]>(CACHE_KEYS.allFriends),
          loadCache<{ shareEnabled: boolean; shareMode: ShareMode; selectedFriends: string[] }>(CACHE_KEYS.share),
        ]);
      if (cachedMyLoc) setMyLocation(cachedMyLoc);
      if (cachedFriendsLoc) setFriendLocations(cachedFriendsLoc);
      if (cachedWorldMoods) setWorldMoods(cachedWorldMoods);
      if (cachedFriends) setAllFriends(cachedFriends);
      if (cachedShare) {
        setShareEnabled(!!cachedShare.shareEnabled);
        setShareMode(cachedShare.shareMode || "all");
        setSelectedFriends(cachedShare.selectedFriends || []);
      }
    })();
  }, []);

  useEffect(() => {
    MapLibreGL.setAccessToken("");
  }, []);

useEffect(() => {
  const onBulk = (data: any) => {
    setMoods(data);
  };

  const onUpdate = (data: any) => {
    setMoods(prev => [...prev, data]);
  };

  socket?.on("mood:bulk", onBulk);
  socket?.on("mood:update", onUpdate);

  return () => {
    socket?.off("mood:bulk", onBulk);
    socket?.off("mood:update", onUpdate);
  };
}, []);

useEffect(() => {
  if (!currentUserId) return;

  socket?.emit("join", currentUserId);
}, [currentUserId]);

  // --- Only call API for fresh map if online
  useEffect(() => {
    if (offline) return;
    const loadAllFriends = async () => {
      try {
        const res = await socialApi.getFriends();
        const friends = res?.data?.friends || [];
        if (friends.length > 0) {
          setAllFriends(friends);
          await saveCache(CACHE_KEYS.allFriends, friends);
        }
      } catch {}
    };
    loadAllFriends();
  }, [offline]);

  useEffect(() => {
    if (offline) return;
    const loadWorldMoods = async () => {
      try {
        const res = await MoodService.getWorldMoods();
        const wm = res?.data?.data || [];
        if (wm.length > 0) {
          setWorldMoods(wm);
          await saveCache(CACHE_KEYS.worldMoods, wm);
        }
      } catch {}
    };
    loadWorldMoods();
    const id = setInterval(() => {
      if (!offline) loadWorldMoods();
    }, 5000);
    return () => clearInterval(id);
  }, [offline]);

  const worldMoodGeojson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: worldMoods.map((m: any) => ({
        type: "Feature",
        properties: { mood: m.mood },
        geometry: { type: "Point", coordinates: [m.coords.lng, m.coords.lat] },
      })),
    }),
    [worldMoods]
  );

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location permission",
          message: "We need your location to show your position on the map.",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // iOS
      const status = await Geolocation.requestAuthorization("whenInUse");
      return status === "granted";
    }
  };

  // --- User location tracking and caching, but only send API if online ---
  useEffect(() => {
    let watchId: number | null = null;
    const startWatching = async () => {
      const ok = await requestLocationPermission();
      if (!ok) return;
      watchId = Geolocation.watchPosition(
        async (pos) => {
          if (pos.mocked) {
            console.warn("User is using a Fake GPS app. Ignoring location update.");
            // Optional: You could show a toast message here telling them 
            // that MoodMap requires real locations to work.
            return; // Exit early, do not update state or backend
          }
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setMyLocation(coords);
          await saveCache(CACHE_KEYS.myLocation, coords);
          if (!offline) {
            await locationApi.updateMyLocation(coords[0], coords[1]);
          }
        },
        (err) => {},
        {
          enableHighAccuracy: true,
          interval: 3000,
          fastestInterval: 2000,
          distanceFilter: 0,
        }
      );
    };
    startWatching();
    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, [offline]);

  // --- Friends locations from API, cache, only if online ---
  useEffect(() => {
    if (offline) return;
    const loadFriends = async () => {
      try {
        const data = await locationApi.getFriendsLocations();
        const locations = data?.data?.locations || [];
        if (locations.length > 0) {
          setFriendLocations(locations);
          await saveCache(CACHE_KEYS.friendLocations, locations);
        }
      } catch {}
    };
    loadFriends();
    const id = setInterval(() => {
      if (!offline) loadFriends();
    }, 5000);
    return () => clearInterval(id);
  }, [offline]);

  // --- Share settings logic, always stores cache, API only if online ---
  useEffect(() => {
    const applyShare = async () => {
      try {
        if (!offline) {
          if (!shareEnabled) {
            await locationApi.setLocationShare("none", []);
          } else if (shareMode === "custom") {
            await locationApi.setLocationShare("custom", selectedFriends);
          } else {
            await locationApi.setLocationShare(shareMode, []);
          }
        }
        await saveCache(CACHE_KEYS.share, {
          shareEnabled,
          shareMode,
          selectedFriends,
        });
      } catch {}
    };
    applyShare();
  }, [offline, shareEnabled, shareMode, selectedFriends]);

  const friendMarkers = useMemo(
    () =>
      friendLocations.map((f: any) => ({
        id: f.user?._id || f._id,
        name: f.user?.name,
        mood: f.mood || "",
        coordinate: [f.coords.lng, f.coords.lat] as [number, number],
      })),
    [friendLocations]
  );

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleLocate = () => {
    if (!myLocation || !cameraRef.current) return;

    cameraRef.current.setCamera({
      centerCoordinate: myLocation,
      zoomLevel: 15,
      animationMode: "easeTo",
      animationDuration: 700,
    });

    setTimeout(() => {
      cameraRef.current?.setCamera({
        animationMode: "none",
      });
    }, 750);
  };

  return (
    <MainLayout>
       <StatusBar
  barStyle="light-content"
  translucent={true} // ⚡ ADD THIS
  backgroundColor="transparent"
/>
      <AppScreen style={styles.root}>
        <View style={styles.topBar}>
          <AppText style={styles.headerText}>Mood Map</AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.infoBtn} onPress={openLegend}>
              <Icon name="information-outline" size={18} color="#E5E7EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoBtn} onPress={openSettings}>
              <AppText style={styles.settingsIcon}>⚙</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <MapLibreGL.MapView
          style={styles.mapFull}
          mapStyle={DARK_MAP_STYLE}
          zoomEnabled
          pitchEnabled
          scrollEnabled
          attributionEnabled={false}
          logoEnabled={false}
        >
          <MapLibreGL.Camera ref={cameraRef} />
          {myLocation && (
            <MapLibreGL.PointAnnotation id="me" coordinate={myLocation}>
              <View style={styles.userDot} />
            </MapLibreGL.PointAnnotation>
          )}

          {friendMarkers.map((f) => (
            <MapLibreGL.PointAnnotation key={f.id} id={f.id} coordinate={f.coordinate}>
              <View style={styles.friendMarker}>
                <View style={styles.friendDot} />
                <AppText style={styles.friendLabel}>{f.name}</AppText>
              </View>
              <MapLibreGL.Callout title={`${f.name} • ${f.mood || ""}`} />
            </MapLibreGL.PointAnnotation>
          ))}

          <MapLibreGL.ShapeSource id="worldMoods" shape={worldMoodGeojson as any}>
            <MapLibreGL.CircleLayer
              id="worldMoodClouds"
              style={{
                circleRadius: 40,
                circleBlur: 0.9,
                circleOpacity: 0.4,
                circleColor: moodMatchArray,
              }}
            />
          </MapLibreGL.ShapeSource>
        </MapLibreGL.MapView>

<TouchableOpacity
  style={[styles.locateBtn, { bottom: Math.max(insets.bottom + 12, 24) }]}
  onPress={handleLocate}
  activeOpacity={0.8}
>
  <Icon
    name="crosshairs-gps"
    size={24}
    color="#E5E7EB"
  />
</TouchableOpacity>

        {/* --- Legend sheet (TrueSheet) --- */}
        <TrueSheet
          ref={legendSheetRef}
          detents={legendDetents}
          cornerRadius={20}
          backgroundColor="#0F172A"
          grabber={false}
        >
          <View style={{ padding: 20 }}>
            <AppText style={styles.sheetTitle}>Mood Colors</AppText>

            {MOOD_LEGEND.map((m) => (
              <View key={m.mood} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                <AppText style={styles.sheetText}>{m.mood}</AppText>
              </View>
            ))}
          </View>
        </TrueSheet>

        {/* --- Settings sheet (TrueSheet) --- */}
        <TrueSheet
          ref={settingsSheetRef}
          detents={settingsDetents}
          cornerRadius={20}
          backgroundColor="#0F172A"
          grabber={false}
        >
          <View style={{ padding: 20 }}>
            <AppText style={styles.sheetTitle}>Share My Location</AppText>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setShareEnabled((v) => !v)}
            >
              <View style={[styles.checkbox, shareEnabled && styles.checkboxOn]} />
              <AppText style={styles.sheetText}>
                {shareEnabled ? "Enabled" : "Disabled"}
              </AppText>
            </TouchableOpacity>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Share With</AppText>

              {(["all", "none", "custom"] as ShareMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={styles.toggleRow}
                  onPress={() => setShareMode(mode)}
                >
                  <View style={[styles.radio, shareMode === mode && styles.radioOn]} />
                  <AppText style={styles.sheetText}>
                    {mode === "all" ? "All Friends" : mode === "none" ? "None" : "Custom"}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {shareMode === "custom" && (
              <View style={styles.section}>
                <AppText style={styles.sectionTitle}>Select Friends</AppText>

                {allFriends.map((f: any) => (
                  <TouchableOpacity
                    key={f._id}
                    style={styles.toggleRow}
                    onPress={() => toggleFriend(f._id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        selectedFriends.includes(f._id) && styles.checkboxOn,
                      ]}
                    />
                    <AppText style={styles.sheetText}>
                      {f.name || f.username || "Friend"}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TrueSheet>
      </AppScreen>
    </MainLayout>
  );
};

export default MoodMap;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  topBar: {
    position: "absolute",
    top: Platform.OS === "android" ? 20 : 10,
    left: 14,
    right: 14,
    zIndex: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: { color: "#E5E7EB", fontWeight: "700", fontSize: 20 },
  mapFull: {
    ...StyleSheet.absoluteFill,
  },
  userDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#38BDF8",
    borderWidth: 2,
    borderColor: "#fff",
  },
  friendDot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#F43F5E",
    borderWidth: 2,
    borderColor: "#fff",
  },
  friendMarker: { alignItems: "center" },
  friendLabel: {
    marginTop: 4,
    color: "#E5E7EB",
    fontSize: 11,
    backgroundColor: "rgba(15,23,42,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  locateBtn: {
    position: "absolute",
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    transform: [{ rotate: "270deg" }],
  },
  locateIcon: { color: "#E5E7EB", fontSize: 18, marginBottom: Platform.OS === "android" ? 5 : 0 },
  infoBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 3,
    borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  settingsIcon: { color: "#E5E7EB", fontSize: 18 },
  sheetTitle: { color: "#E5E7EB", fontWeight: "700", fontSize: 18, marginBottom: 12 },
  sheetText: { color: "#E5E7EB", fontSize: 15 },
  section: { marginTop: 14 },
  sectionTitle: { color: "#94A3B8", fontSize: 13, marginBottom: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  checkboxOn: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  radioOn: { backgroundColor: "#38BDF8", borderColor: "#38BDF8" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
});