import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Platform, StatusBar } from "react-native";
import AppText from '../../../../components/Layout/AppText/AppText';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import MainLayout from '../../../../shared/components/MainLayout';
import * as MapLibreGL from "@maplibre/maplibre-react-native";
import Geolocation from "react-native-geolocation-service";
import { io } from "socket.io-client";
import { PermissionsAndroid } from "react-native";

const SOCKET_URL = "http://YOUR_SERVER_IP:5000";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

const StudentList = () => {
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [moods, setMoods] = useState<any[]>([]);

  const socket = useMemo(() => io(SOCKET_URL), []);

  useEffect(() => {
    MapLibreGL.setAccessToken("ZBjwNpgm8C3bFamrtGme");
    MapLibreGL.setConnected(true);
  }, []);


  useEffect(() => {
    socket.on("mood:bulk", (data) => setMoods(data));
    socket.on("mood:update", (data) => setMoods((prev) => [...prev, data]));
    return () => socket.disconnect();
  }, [socket]);

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
  const loadLocation = async () => {
    setLoading(true);
    const ok = await requestLocationPermission();
    if (!ok) {
      setLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation([pos.coords.longitude, pos.coords.latitude]);
        setLoading(false);
      },
      (err) => {
        console.log(err);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  loadLocation();
}, []);

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
          <AppActivityIndicator visible={loading} />

          <View style={styles.topBar}>
            <AppText style={styles.headerText}>Mood Map</AppText>
          </View>

          <View style={styles.mapCard}>
          <MapLibreGL.MapView
  style={styles.map}
  styleURL="https://api.maptiler.com/maps/hybrid/style.json?key=ZBjwNpgm8C3bFamrtGme"
  onDidFailLoadingMap={(e) => console.log("Map fail", e.nativeEvent)}
  onDidFinishLoadingMap={() => console.log("Map loaded")}
>

  {myLocation && (
    <MapLibreGL.PointAnnotation id="me" coordinate={myLocation}>
      <View style={styles.userDot} />
    </MapLibreGL.PointAnnotation>
  )}

  <MapLibreGL.ShapeSource id="moods" shape={geojson}>
    <MapLibreGL.HeatmapLayer
      id="moodHeat"
      style={{
        heatmapRadius: 45,
        heatmapIntensity: 1.1,
        heatmapOpacity: 0.75,
        heatmapColor: [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "#60a5fa",
          0.4, "#22c55e",
          0.6, "#fbbf24",
          0.8, "#f97316",
          1, "#ef4444",
        ],
      }}
    />
  </MapLibreGL.ShapeSource>
</MapLibreGL.MapView>
          </View>
        </View>
      </AppScreen>
    </MainLayout>
  );
};

export default StudentList;

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
    alignItems: "flex-start",
  },
  headerText: {
    color: "#E5E7EB",
    fontWeight: "700",
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
  },
  map: { flex: 1 },
});