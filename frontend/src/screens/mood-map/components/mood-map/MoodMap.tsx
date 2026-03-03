import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  TouchableOpacity,
  Pressable,
  PermissionsAndroid,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppText from "../../../../components/Layout/AppText/AppText";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import MainLayout from "../../../../shared/components/MainLayout";
import * as MapLibreGL from "@maplibre/maplibre-react-native";
import Geolocation from "react-native-geolocation-service";
import { io } from "socket.io-client";
import locationApi, { ShareMode } from "../../services/api_location";
import AuthContext from "../../../../auth/user/UserContext";
import socialApi from "../../../friends/services/api_friends";
import MoodService from "../../../moodscreen/services/api_mood";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SOCKET_URL = "http://YOUR_SERVER_IP:5000";
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

  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [moods, setMoods] = useState<any[]>([]);
  const cameraRef = useRef<typeof MapLibreGL.Camera>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>("all");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendLocations, setFriendLocations] = useState<any[]>([]);
  const [legendOpen, setLegendOpen] = useState(false);
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [worldMoods, setWorldMoods] = useState<any[]>([]);

  const isTrackingRef = useRef(true);
  const socket = useMemo(() => io(SOCKET_URL), []);

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

  const MOOD_LEGEND = [
    { mood: "ecstatic", color: "#22c55e" }, { mood: "happy", color: "#4ade80" }, { mood: "grateful", color: "#86efac" },
    { mood: "calm", color: "#38bdf8" }, { mood: "relaxed", color: "#60a5fa" }, { mood: "lovely", color: "#f472b6" },
    { mood: "neutral", color: "#f59e0b" }, { mood: "meh", color: "#fbbf24" }, { mood: "tired", color: "#94a3b8" },
    { mood: "confused", color: "#a855f7" }, { mood: "sad", color: "#3b82f6" }, { mood: "lonely", color: "#1d4ed8" },
    { mood: "discouraged", color: "#1e40af" }, { mood: "numb", color: "#475569" }, { mood: "anxious", color: "#f97316" },
    { mood: "stressed", color: "#ef4444" }, { mood: "overwhelmed", color: "#dc2626" }, { mood: "annoyed", color: "#f43f5e" },
    { mood: "frustrated", color: "#e11d48" }, { mood: "angry", color: "#b91c1c" },
  ];

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
    MapLibreGL.setConnected(true);
  }, []);

  useEffect(() => {
    socket.on("mood:bulk", (data) => setMoods(data));
    socket.on("mood:update", (data) => setMoods((prev) => [...prev, data]));
    return () => socket.disconnect();
  }, [socket]);

  useEffect(() => {
    if (currentUserId) socket.emit("join", currentUserId);
  }, [socket, currentUserId]);

  useEffect(() => {
    const loadAllFriends = async () => {
      const res = await socialApi.getFriends();
      const friends = res?.data?.friends || [];
      setAllFriends(friends);
      await saveCache(CACHE_KEYS.allFriends, friends);
    };
    loadAllFriends();
  }, []);

  useEffect(() => {
    const loadWorldMoods = async () => {
      const res = await MoodService.getWorldMoods();
      const wm = res?.data?.data || [];
      setWorldMoods(wm);
      await saveCache(CACHE_KEYS.worldMoods, wm);
    };
    loadWorldMoods();
    const id = setInterval(loadWorldMoods, 5000);
    return () => clearInterval(id);
  }, []);

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
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location permission",
        message: "We need your location to show your position on the map.",
        buttonPositive: "OK",
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  useEffect(() => {
    let watchId: number | null = null;

    const startWatching = async () => {
      const ok = await requestLocationPermission();
      if (!ok) return;

      watchId = Geolocation.watchPosition(
        async (pos) => {
          const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setMyLocation(coords);
          await saveCache(CACHE_KEYS.myLocation, coords);

          await locationApi.updateMyLocation(coords[0], coords[1]);
        },
        (err) => console.log("watchPosition error", err),
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
  }, []);

  useEffect(() => {
    const loadFriends = async () => {
      const data = await locationApi.getFriendsLocations();
      const locations = data?.data?.locations || [];
      setFriendLocations(locations);
      await saveCache(CACHE_KEYS.friendLocations, locations);
    };
    loadFriends();
    const id = setInterval(loadFriends, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const applyShare = async () => {
      if (!shareEnabled) {
        await locationApi.setLocationShare("none", []);
      } else if (shareMode === "custom") {
        await locationApi.setLocationShare("custom", selectedFriends);
      } else {
        await locationApi.setLocationShare(shareMode, []);
      }

      await saveCache(CACHE_KEYS.share, {
        shareEnabled,
        shareMode,
        selectedFriends,
      });
    };

    applyShare();
  }, [shareEnabled, shareMode, selectedFriends]);

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
    setSelectedFriends((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleLocate = () => {
    if (myLocation) {
      cameraRef.current?.moveTo(myLocation, 10);
      cameraRef.current?.zoomTo(15, 10);
    }
  };

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <View style={styles.topBar}>
          <AppText style={styles.headerText}>Mood Map</AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.infoBtn} onPress={() => setLegendOpen(true)}>
              <Icon name="information-outline" size={18} color="#E5E7EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoBtn} onPress={() => setSettingsOpen(true)}>
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
                circleColor: [
                  "match",
                  ["get", "mood"],
                  "ecstatic", "#22c55e",
                  "happy", "#4ade80",
                  "grateful", "#86efac",
                  "calm", "#38bdf8",
                  "relaxed", "#60a5fa",
                  "lovely", "#f472b6",
                  "neutral", "#f59e0b",
                  "meh", "#fbbf24",
                  "tired", "#94a3b8",
                  "confused", "#a855f7",
                  "sad", "#3b82f6",
                  "lonely", "#1d4ed8",
                  "discouraged", "#1e40af",
                  "numb", "#475569",
                  "anxious", "#f97316",
                  "stressed", "#ef4444",
                  "overwhelmed", "#dc2626",
                  "annoyed", "#f43f5e",
                  "frustrated", "#e11d48",
                  "angry", "#b91c1c",
                  "#94a3b8",
                ],
              }}
            />
          </MapLibreGL.ShapeSource>
        </MapLibreGL.MapView>

        <TouchableOpacity
          style={[
            styles.locateBtn,
            { bottom: insets.bottom },
          ]}
          onPress={handleLocate}
        >
          <AppText style={styles.locateIcon}>➤</AppText>
        </TouchableOpacity>

        <Modal transparent visible={legendOpen} animationType="fade">
          <Pressable style={styles.sheetBackdrop} onPress={() => setLegendOpen(false)} />
          <View style={styles.legendSheet}>
            <AppText style={styles.sheetTitle}>Mood Colors</AppText>
            {MOOD_LEGEND.map((m) => (
              <View key={m.mood} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: m.color }]} />
                <AppText style={styles.sheetText}>{m.mood}</AppText>
              </View>
            ))}
          </View>
        </Modal>

        <Modal transparent visible={settingsOpen} animationType="slide">
          <Pressable style={styles.sheetBackdrop} onPress={() => setSettingsOpen(false)} />
          <View style={styles.sheet}>
            <AppText style={styles.sheetTitle}>Share My Location</AppText>

            <TouchableOpacity style={styles.toggleRow} onPress={() => setShareEnabled((v) => !v)}>
              <View style={[styles.checkbox, shareEnabled && styles.checkboxOn]} />
              <AppText style={styles.sheetText}>{shareEnabled ? "Enabled" : "Disabled"}</AppText>
            </TouchableOpacity>

            <View style={styles.section}>
              <AppText style={styles.sectionTitle}>Share With</AppText>
              {(["all", "none", "custom"] as ShareMode[]).map((mode) => (
                <TouchableOpacity key={mode} style={styles.toggleRow} onPress={() => setShareMode(mode)}>
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
                  <TouchableOpacity key={f._id} style={styles.toggleRow} onPress={() => toggleFriend(f._id)}>
                    <View style={[styles.checkbox, selectedFriends.includes(f._id) && styles.checkboxOn]} />
                    <AppText style={styles.sheetText}>{f.name || f.username || "Friend"}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Modal>
      </AppScreen>
    </MainLayout>
  );
};

export default MoodMap;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },

  topBar: {
    position: "absolute",
    top: Platform.OS === "android" ? 20 : 56,
    left: 14,
    right: 14,
    zIndex: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: { color: "#E5E7EB", fontWeight: "700", fontSize: 20 },

  mapFull: {
    ...StyleSheet.absoluteFillObject,
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
    transform: [{ rotate: "270deg" }]
  },
  locateIcon: { color: "#E5E7EB", fontSize: 18, marginBottom: 5 },

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

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#0F172A",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  legendSheet: {
    backgroundColor: "#0F172A",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

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