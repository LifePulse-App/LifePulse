import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import AppText from "../../../../components/Layout/AppText/AppText";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import AppActivityIndicator from "../../../../components/Layout/AppActivityIndicator/AppActivityIndicator";
import MainLayout from "../../../../shared/components/MainLayout";
import * as MapLibreGL from "@maplibre/maplibre-react-native";
import Geolocation from "react-native-geolocation-service";
import { io } from "socket.io-client";
import { PermissionsAndroid } from "react-native";
import locationApi, { ShareMode } from "../../services/api_location";
import AuthContext from "../../../../auth/user/UserContext";
import socialApi from "../../../friends/services/api_friends";
import MoodService from "../../../moodscreen/services/api_mood";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { withDelay } from "react-native-reanimated";

const SOCKET_URL = "http://YOUR_SERVER_IP:5000";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

const MoodMap = () => {
  const authContext = useContext(AuthContext);
  const currentUserId = authContext?.User?.user?.id;

  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [moods, setMoods] = useState<any[]>([]);
  const cameraRef = useRef<typeof MapLibreGL.Camera>(null);
  const hasCenteredOnce = useRef(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>("all");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendLocations, setFriendLocations] = useState<any[]>([]);

const [legendOpen, setLegendOpen] = useState(false);

const MOOD_LEGEND = [
  { mood: "ecstatic", color: "#22c55e" },
  { mood: "happy", color: "#4ade80" },
  { mood: "grateful", color: "#86efac" },
  { mood: "calm", color: "#38bdf8" },
  { mood: "relaxed", color: "#60a5fa" },
  { mood: "lovely", color: "#f472b6" },
  { mood: "neutral", color: "#f59e0b" },
  { mood: "meh", color: "#fbbf24" },
  { mood: "tired", color: "#94a3b8" },
  { mood: "confused", color: "#a855f7" },
  { mood: "sad", color: "#3b82f6" },
  { mood: "lonely", color: "#1d4ed8" },
  { mood: "discouraged", color: "#1e40af" },
  { mood: "numb", color: "#475569" },
  { mood: "anxious", color: "#f97316" },
  { mood: "stressed", color: "#ef4444" },
  { mood: "overwhelmed", color: "#dc2626" },
  { mood: "annoyed", color: "#f43f5e" },
  { mood: "frustrated", color: "#e11d48" },
  { mood: "angry", color: "#b91c1c" },
];

  const LOCATION_OFFSET = { lng: 0.0007, lat: 0.0002 }; // adjust as needed

const applyOffset = (coords: [number, number]): [number, number] => {
  return [coords[0] + LOCATION_OFFSET.lng, coords[1] + LOCATION_OFFSET.lat];
};
const isTrackingRef = useRef(true);


const handleMoveCamera = (coords: [number, number]) => {
  cameraRef.current?.moveTo(coords, 10);
  cameraRef.current?.zoomTo(15, 10);
};

const moveCamera = (coords: [number, number]) => {
  cameraRef.current?.moveTo(coords, 1000);
};

const isUserInteracting = useRef(false);

  const socket = useMemo(() => io(SOCKET_URL), []);


const [allFriends, setAllFriends] = useState<any[]>([]);


const [worldMoods, setWorldMoods] = useState<any[]>([]);

useEffect(() => {
  const loadWorldMoods = async () => {
    const res = await MoodService.getWorldMoods();
    setWorldMoods(res?.data?.data || []);
  };

  loadWorldMoods();
  const id = setInterval(loadWorldMoods, 5000);
  return () => clearInterval(id);
}, []);

const worldMoodGeojson = useMemo(() => {
  return {
    type: "FeatureCollection",
    features: worldMoods.map((m: any) => ({
      type: "Feature",
      properties: { mood: m.mood },
      geometry: {
        type: "Point",
        coordinates: [m.coords.lng, m.coords.lat],
      },
    })),
  };
}, [worldMoods]);

useEffect(() => {
  const loadAllFriends = async () => {
    const res = await socialApi.getFriends();
    setAllFriends(res?.data?.friends || []);
  };
  
  loadAllFriends();
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
    if (currentUserId) {
      socket.emit("join", currentUserId);
    }
  }, [socket, currentUserId]);

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
      setLoading(true);
      const ok = await requestLocationPermission();
      if (!ok) {
        setLoading(false);
        return;
      }

      watchId = Geolocation.watchPosition(
        async (pos) => {
          const coords: [number, number] = [
            pos.coords.longitude,
            pos.coords.latitude,
          ];
          setMyLocation(coords);
          setLoading(false);

          // inside watchPosition success:
// inside watchPosition success:
if (isTrackingRef.current) {
  moveCamera(coords);
  isTrackingRef.current = false; // stop auto-center forever
}


          await locationApi.updateMyLocation(coords[0], coords[1]);

        },
        (err) => {
          console.log("watchPosition error", err);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          interval: 3000,
          fastestInterval: 2000,
          distanceFilter: 0
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
      setFriendLocations(data?.data?.locations || []);
    };

    loadFriends();
    const id = setInterval(loadFriends, 5000); // refresh every 5s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!shareEnabled) {   
      locationApi.setLocationShare("none", []);
      return;
    }
  
    if (shareMode === "custom") {

      locationApi.setLocationShare("custom", selectedFriends);
    } else {

      locationApi.setLocationShare(shareMode, []);
    }
  }, [shareEnabled, shareMode, selectedFriends]);

  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: moods.map((m) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      })),
    };
  }, [moods]);

  const friendMarkers = useMemo(() => {
    return friendLocations.map((f: any) => ({
      id: f.user?._id || f._id,
      name: f.user?.name,
      mood: f.mood || "",
      coordinate: [f.coords.lng, f.coords.lat],
    }));
  }, [friendLocations]);

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleLocate = () => {
    if (myLocation) {
      isTrackingRef.current = true; // keep tracking off
    }
  };

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <View style={styles.overlay}>
          
        <View style={styles.topBar}>
  <AppText style={styles.headerText}>Mood Map</AppText>

  <View style={{ flexDirection: "row", gap: 8 }}>
    <TouchableOpacity style={styles.infoBtn} onPress={() => setLegendOpen(true)}>
      <Icon name="information-outline" size={18} color="#E5E7EB" />
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.infoBtn}
      onPress={() => setSettingsOpen(true)}
    >
      <AppText style={styles.settingsIcon}>⚙</AppText>
    </TouchableOpacity>
  </View>
</View>

          <View style={styles.mapCard}>
          <MapLibreGL.MapView
  style={styles.map}
  mapStyle="https://tiles.openfreemap.org/styles/liberty"
  zoomEnabled
  pitchEnabled
  scrollEnabled
  onRegionIsChanging={(region) => {
    if(isTrackingRef.current) {
    handleMoveCamera(myLocation) // user touched -> stop auto center
    } else {
      moveCamera(region?.geometry?.coordinates)
    }
  }}
>  


  <MapLibreGL.Camera ref={cameraRef} />


{myLocation && (
  <MapLibreGL.PointAnnotation id="me" coordinate={myLocation}>
    <View style={styles.userDot} />
  </MapLibreGL.PointAnnotation>
)}

{friendMarkers.map((f) => (
  <MapLibreGL.PointAnnotation
    key={f.id}
    id={f.id}
    coordinate={f.coordinate}
  >
    <View style={styles.friendMarker}>
      <View style={styles.friendDot} />
      <AppText style={styles.friendLabel}>{f.name}</AppText>
    </View>

    <MapLibreGL.Callout title={`${f.name} • ${f.mood || ""}`} />
  </MapLibreGL.PointAnnotation>
))}

<MapLibreGL.ShapeSource id="worldMoods" shape={worldMoodGeojson}>
  <MapLibreGL.CircleLayer
    id="worldMoodClouds"
    style={{
      circleRadius: 40,
      circleBlur: 0.9,
      circleOpacity: 0.35,
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

            <TouchableOpacity style={styles.locateBtn} onPress={handleLocate}>
              <AppText style={styles.locateIcon}>➤</AppText>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Bottom sheet */}
        <Modal transparent visible={settingsOpen} animationType="slide">
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSettingsOpen(false)}
          />
          <View style={styles.sheet}>
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
                  <View
                    style={[
                      styles.radio,
                      shareMode === mode && styles.radioOn,
                    ]}
                  />
                  <AppText style={styles.sheetText}>
                    {mode === "all"
                      ? "All Friends"
                      : mode === "none"
                      ? "None"
                      : "Custom"}
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
        </Modal>
      </AppScreen>
    </MainLayout>
  );
};

export default MoodMap;

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  topBar: {
    marginBottom: "2%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: {
    color: "#E5E7EB",
    fontWeight: "700",
    fontSize: 18,
  },
  settingsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  settingsIcon: {
    color: "#E5E7EB",
    fontSize: 18,
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
  mapCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 8,
    maxHeight: "92%"
  },
  map: { flex: 1 },

  locateBtn: {
    position: "absolute",
    right: 14,
    bottom: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  locateIcon: { color: "#E5E7EB", fontSize: 18 },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  friendMarker: {
    alignItems: "center",
  },
  friendLabel: {
    marginTop: 4,
    color: "#E5E7EB",
    fontSize: 11,
    backgroundColor: "rgba(15,23,42,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sheet: {
    backgroundColor: "#0F172A",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetTitle: {
    color: "#E5E7EB",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 12,
  },
  sheetText: {
    color: "#E5E7EB",
    fontSize: 15,
  },
  section: {
    marginTop: 14,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  checkboxOn: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  radioOn: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 3,
    borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  
  legendSheet: {
    backgroundColor: "#0F172A",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});