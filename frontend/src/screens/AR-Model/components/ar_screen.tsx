import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
  PermissionsAndroid,
  Linking,
  Animated,  // Add this
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AppText from "../../../components/Layout/AppText/AppText";

import Geolocation from "react-native-geolocation-service";
import CompassHeading from "react-native-compass-heading";
import { KeyboardAvoidingView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";

import {
  listNearbyArSpots,
  getArSpotMessages,
  postArSpotMessage,
  createArSpot,
  reactToArMessage,
  deleteArSpot,
  deleteArMessage,
  type ArSpot,
} from "../services/api_ar_portal";
import AuthContext from "../../../auth/user/UserContext";

const { width: W, height: H } = Dimensions.get("window");

const GLASS_BG = "rgba(15, 23, 42, 0.35)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.4)";

const NEARBY_RADIUS_M = 25;
const MAX_VISIBLE_ANGLE_DEG = 30;
const AUTO_HIDE_ANGLE_DEG = 70;
const SPOT_POLL_MS = 2000;

function smallestAngleDiff(a: number, b: number) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

const normalizeDeg = (d: number) => ((d % 360) + 360) % 360;

type CamPerm = "granted" | "denied" | "not-determined" | "restricted";

type ConfirmState =
  | null
  | {
      title: string;
      message: string;
      confirmText?: string;
      destructive?: boolean;
      onConfirm: () => Promise<void> | void;
    };

async function requestAndroidLocationPermission() {
  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Location Permission",
      message: "We need location to find nearby AR chat spots.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    }
  );
  return fine === PermissionsAndroid.RESULTS.GRANTED;
}

export default function ARCameraView({ navigation }: any) {
  const user = useContext(AuthContext);
  const myUserId = user?.User?.user?.id ? String(user.User.user.id) : null;

  const device = useCameraDevice("back");
  const insets = useSafeAreaInsets();

  const [camPerm, setCamPerm] = useState<CamPerm>("not-determined");
  const [camReady, setCamReady] = useState(false);
  const [locPermOk, setLocPermOk] = useState<boolean>(false);

  const [myLoc, setMyLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState<number>(0);

  const [spots, setSpots] = useState<ArSpot[]>([]);
  const [loadingSpots, setLoadingSpots] = useState(false);

  const [selectedSpot, setSelectedSpot] = useState<ArSpot | null>(null);
  const [spotMsgs, setSpotMsgs] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [draft, setDraft] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [creating, setCreating] = useState(false);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  // REMOVED: const [composeOpen, setComposeOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false); // Keep but use as overlay instead

  const [lockToSpot, setLockToSpot] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [toast, setToast] = useState<{ text: string; kind?: "ok" | "err" } | null>(null);

  const toastTimerRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  // Animation for compose overlay
  const composeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (text: string, kind: "ok" | "err" = "ok") => {
    setToast({ text, kind });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 500);
  };

  const closeAllOverlays = () => {
    setConfirm(null);
    setToast(null);
  };

  const closeSpot = () => {
    setViewModalOpen(false);
    setComposeOpen(false);
    setConfirm(null);
    setSelectedSpot(null);
    setSpotMsgs([]);
    setDraft("");
    setLockToSpot(false);
  };

  const closeSpotModalsOnly = () => {
    setViewModalOpen(false);
    setConfirm(null);
    // Don't close compose here - handled separately
  };

  const reactionCount = (reactions: any[] | undefined, emoji: string) =>
    (reactions || []).filter((r: any) => r.emoji === emoji).length;

  // Animate compose overlay
  useEffect(() => {
    Animated.spring(composeAnim, {
      toValue: composeOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [composeOpen]);

  useEffect(() => {
  (async () => {
    if (Platform.OS === "android") {
      const ok = await requestAndroidLocationPermission();
      setLocPermOk(ok);
    } else {
      setLocPermOk(true); // iOS handled differently (if plist exists)
    }
  })();
}, []);

const { hasPermission, requestPermission } = useCameraPermission();

const askPermissions = async () => {
  const ok = await requestPermission();
  setCamPerm(ok ? "granted" : "denied");
  setCamReady(true)
};

  useEffect(() => {
    askPermissions();
  }, []);

  useEffect(() => {
    if (!locPermOk) return;

    const watchId = Geolocation.watchPosition(
      (pos) => setMyLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        console.log("[AR] location error", err);
        setMyLoc(null);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 5,
        interval: 3000,
        fastestInterval: 2000,
      }
    );

    return () => Geolocation.clearWatch(watchId);
  }, [locPermOk]);

  const [rawHeading, setRawHeading] = useState(0);
  const [stableHeading, setStableHeading] = useState(0);

  useEffect(() => {
    CompassHeading.start(5, ({ heading: h }) => {
      if (typeof h === "number") setRawHeading(normalizeDeg(h));
    });
    return () => CompassHeading.stop();
  }, []);

  useEffect(() => {
    setStableHeading((prev) => {
      const diff = angleDiff(prev, rawHeading);
      if (diff > 120) return prev;
      const alpha = 0.2;
      const delta = ((rawHeading - prev + 540) % 360) - 180;
      return normalizeDeg(prev + alpha * delta);
    });
  }, [rawHeading]);

  const angleDiff = (a: number, b: number) => {
    const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
    return d > 180 ? 360 - d : d;
  };

  const loadNearbySpots = async () => {
    if (!myLoc) return;

    setLoadingSpots(true);
    try {
      const res = await listNearbyArSpots({
        lat: myLoc.lat,
        lon: myLoc.lon,
        radius: NEARBY_RADIUS_M,
        heading: rawHeading,
        headingTolerance: MAX_VISIBLE_ANGLE_DEG,
      });

      setSpots(res?.data?.spots || []);
    } catch (e) {
    } finally {
      setLoadingSpots(false);
    }
  };

  useEffect(() => {
    if (!myLoc) return;

    loadNearbySpots();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(loadNearbySpots, SPOT_POLL_MS);

    return () => pollRef.current && clearInterval(pollRef.current);
  }, [myLoc?.lat, myLoc?.lon, stableHeading]);

  const visibleSpots = useMemo(() => {
    return spots || [];
  }, [spots]);

  const isSpotStillVisible = (spot: ArSpot | null) => {
    if (!spot) return false;
    return visibleSpots.some((s) => String(s._id) === String(spot._id));
  };

  useEffect(() => {
    if (!selectedSpot) return;
    if (lockToSpot) return;
    if (composeOpen) return;
    if (viewModalOpen) return;

    const bearing = (selectedSpot as any).bearingToSpot;
    const hasBearing = typeof bearing === "number";
    const diff = hasBearing ? smallestAngleDiff(rawHeading, bearing) : 0;

    const stillVisible = isSpotStillVisible(selectedSpot);

    if ((hasBearing && diff > AUTO_HIDE_ANGLE_DEG) || !stillVisible) {
      closeSpotModalsOnly();
    }
  }, [heading, rawHeading, selectedSpot?._id, visibleSpots, lockToSpot, composeOpen, viewModalOpen]);

  const loadSpotMessages = async (spot: ArSpot) => {
    setLoadingMsgs(true);
    try {
      const res = await getArSpotMessages(String(spot._id));
      setSpotMsgs(res?.data?.messages || []);
    } catch (e) {
      setSpotMsgs([]);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const selectSpotForPreview = async (spot: ArSpot) => {
    closeAllOverlays();
    setViewModalOpen(false);
    setComposeOpen(false);
    setLockToSpot(false);
    setSelectedSpot(spot);
    await loadSpotMessages(spot);
  };

  const sendSpotMessage = async () => {
    if (!selectedSpot?._id) return;
    const text = draft.trim();
    if (!text) return;

    try {
      await postArSpotMessage(String(selectedSpot._id), { text, messageType: "text" });
      setDraft("");
      setComposeOpen(false);
      await loadSpotMessages(selectedSpot);
      showToast("Message sent", "ok");
    } catch (e: any) {
      showToast("Failed to send", "err");
    }
  };

  const react = async (messageId: string, emoji: string) => {
    try {
      await reactToArMessage({ messageId, emoji });
      if (selectedSpot) await loadSpotMessages(selectedSpot);
    } catch {}
  };

  const createSpotNow = async () => {
    const name = spotName.trim();
    if (!name) return showToast("Spot name required", "err");
    if (!myLoc) return showToast("Location not available", "err");

    setCreating(true);
    try {
      await createArSpot({
        name,
        geo: { lat: myLoc.lat, lon: myLoc.lon },
        radiusMeters: NEARBY_RADIUS_M,
        heading: rawHeading
      });

      setCreateOpen(false);
      setSpotName("");
      await loadNearbySpots();
      showToast("Spot created", "ok");
    } catch (e: any) {
      showToast("Could not create spot", "err");
    } finally {
      setCreating(false);
    }
  };

  const requestDeleteSpot = () => {
    if (!selectedSpot?._id) return;

    setViewModalOpen(false);
    setComposeOpen(false);

    setConfirm({
      title: "Delete spot?",
      message: "This will remove the spot for everyone.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteArSpot(String(selectedSpot._id));
          closeSpot();
          await loadNearbySpots();
          showToast("Spot deleted", "ok");
        } catch (e: any) {
          showToast("Could not delete spot", "err");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const requestDeleteMsg = (messageId: string) => {
    setViewModalOpen(false);
    setComposeOpen(false);

    setConfirm({
      title: "Delete message?",
      message: "This will delete your message for everyone.",
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteArMessage(messageId);
          if (selectedSpot) await loadSpotMessages(selectedSpot);
          showToast("Message deleted", "ok");
        } catch (e: any) {
          showToast("Could not delete message", "err");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const roundTo5 = (n: number) => Math.round(n / 5) * 5;

  // Compose overlay animation styles
  const composeSlideStyle = {
    transform: [{
      translateY: composeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [H, 0], // Slide up from bottom
      })
    }]
  };

  if (!device) {
    return (
      <View style={[styles.root, styles.center]}>
        <AppText style={{ color: "#fff", fontWeight: "800" }}>No camera device found</AppText>
        <AppText style={{ color: "#94A3B8", marginTop: 8, textAlign: "center" }}>
          If you are on an emulator, try a real device.
        </AppText>
      </View>
    );
  }

  if (!camReady) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color="#A855F7" />
      </View>
    );
  }

  if (camPerm !== "granted") {
    return (
      <View style={[styles.root, styles.center]}>
        <AppText style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
          Camera permission is required
        </AppText>
        <AppText style={{ color: "#94A3B8", marginTop: 8, textAlign: "center", paddingHorizontal: 18 }}>
          Enable camera permission in Settings, then come back.
        </AppText>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 14, paddingHorizontal: 16 }]}
          onPress={() => Linking.openSettings()}
        >
          <AppText style={styles.primaryBtnText}>Open Settings</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 10 }} onPress={askPermissions}>
          <AppText style={{ color: "#A5B4FC", fontWeight: "800" }}>Try again</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const canDeleteSpot =
    !!myUserId &&
    !!(selectedSpot as any)?.createdBy &&
    String((selectedSpot as any).createdBy) === String(myUserId);

  const showPreviewCard =
    !!selectedSpot &&
    !viewModalOpen &&
    !composeOpen &&
    !confirm &&
    (lockToSpot || isSpotStillVisible(selectedSpot));

  return (
    <View style={styles.root}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={!composeOpen} />

      {!!toast && (
        <View
          style={[
            styles.toast,
            toast.kind === "err"
              ? { borderColor: "rgba(248,113,113,0.45)" }
              : { borderColor: "rgba(34,197,94,0.35)" },
          ]}
          pointerEvents="none"
        >
          <AppText style={{ color: "#E5E7EB", fontWeight: "900" }}>{toast.text}</AppText>
        </View>
      )}

      {showPreviewCard && (
        <TouchableOpacity activeOpacity={0.9} style={styles.previewPanel} onPress={() => setViewModalOpen(true)}>
          <View style={styles.previewHeader}>
            <Icon name="comment-quote-outline" size={18} color="#E5E7EB" />
            <AppText style={styles.previewTitle} numberOfLines={1}>
              {selectedSpot.name}
              {/* {typeof (selectedSpot as any).distanceMeters === "number"
                ? ` • ${roundTo5((selectedSpot as any).distanceMeters)}m`
                : ""} */}
            </AppText>

            <TouchableOpacity onPress={closeSpot} style={styles.previewClose}>
              <Icon name="close" size={16} color="#E5E7EB" />
            </TouchableOpacity>
          </View>

          {loadingMsgs ? (
            <AppText style={styles.previewLine}>Loading…</AppText>
          ) : spotMsgs?.length ? (
            spotMsgs.slice(-4).map((m: any) => (
              <AppText key={m._id} style={styles.previewLine} numberOfLines={1}>
                {(m.senderId?.name || m.senderId?.username || "User") + ": " + (m.text || "[media]")}
              </AppText>
            ))
          ) : (
            <AppText style={styles.previewLine}>No messages yet.</AppText>
          )}

          <AppText style={styles.previewHint} numberOfLines={1}>
            Tap to open
          </AppText>
        </TouchableOpacity>
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="auto">
          <TouchableOpacity
            onPress={() => {
              closeSpot();
              navigation.goBack();
            }}
            style={styles.iconGlass}
          >
            <Icon name="arrow-left" size={22} color="#E5E7EB" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <AppText style={styles.title}>Public AR</AppText>
            <AppText style={styles.subTitle}>
              {myLoc ? `Within ${NEARBY_RADIUS_M}m • Face a spot to preview` : locPermOk ? "Waiting for GPS…" : "Location permission needed"}
            </AppText>
          </View>

          <TouchableOpacity onPress={() => setCreateOpen(true)} style={styles.iconGlass} activeOpacity={0.85}>
            <Icon name="plus" size={22} color="#E5E7EB" />
          </TouchableOpacity>
        </View>
      </View>

       <View style={styles.spotStack} pointerEvents="box-none">
          {visibleSpots.map((s: any) => (
            <TouchableOpacity key={s._id} activeOpacity={0.92} style={styles.spotPill} onPress={() => selectSpotForPreview(s)}>
              <Icon name="comment-quote-outline" size={18} color="#fff" />
              <AppText style={styles.spotText} numberOfLines={1}>
                {s.name}
                {/* {typeof s.distanceMeters === "number" ? ` • ${roundTo5(s.distanceMeters)}m` : ""} */}
              </AppText>
              <Icon name="chevron-up" size={18} color="#E5E7EB" />
            </TouchableOpacity>
          ))}
        </View>

      {/* VIEW MODAL - Keep as Modal since it's first level */}
      <Modal transparent visible={viewModalOpen} animationType="fade" onRequestClose={() => setViewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.modalTitle} numberOfLines={1}>
                  {selectedSpot?.name || "Chat Spot"}
                </AppText>
              </View>

              {!!selectedSpot && (
                <TouchableOpacity
                  onPress={() => setLockToSpot((v) => !v)}
                  style={[
                    styles.lockPill,
                    lockToSpot
                      ? { backgroundColor: "rgba(99, 102, 241, 0.25)", borderColor: "rgba(199, 210, 254, 0.35)" }
                      : null,
                  ]}
                  activeOpacity={0.9}
                >
                  <Icon name={lockToSpot ? "lock" : "lock-open-variant"} size={16} color="#E5E7EB" />
                  <AppText style={styles.lockPillText}>{lockToSpot ? "Locked" : "Lock"}</AppText>
                </TouchableOpacity>
              )}

              {/* PENCIL BUTTON - Opens compose overlay instead of modal */}
              <TouchableOpacity 
                style={styles.modalClose} 
                onPress={() => {
                  setViewModalOpen(false);  // Close view modal first
                  setTimeout(() => setComposeOpen(true), 100); // Small delay then open compose
                }}
              >
                <Icon name="pencil-outline" size={20} color="#fff" />
              </TouchableOpacity>

              {canDeleteSpot && (
                <TouchableOpacity onPress={requestDeleteSpot} style={styles.modalClose}>
                  <Icon name="trash-can-outline" size={20} color="#fff" />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setViewModalOpen(false)} style={styles.modalClose}>
                <Icon name="close" size={20} color="#E5E7EB" />
              </TouchableOpacity>
            </View>

            {loadingMsgs ? (
              <ActivityIndicator color="#A855F7" style={{ marginTop: 18 }} />
            ) : (
              <FlatList
                data={spotMsgs}
                keyExtractor={(m) => m._id}
                contentContainerStyle={{ paddingBottom: 10, paddingTop: 10 }}
                renderItem={({ item }) => {
                  const senderId = item.senderId?._id || item.senderId?.id;
                  const canDeleteMsg = !!myUserId && !!senderId && String(senderId) === String(myUserId);

                  return (
                    <View style={styles.msgCard}>
                      <AppText style={styles.msgText}>{item.text || "[media]"}</AppText>
                      <AppText style={styles.msgMeta}>— {item.senderId?.name || item.senderId?.username || "User"}</AppText>

                      <View style={styles.reactionsRow}>
                        {["👍", "😂", "❤️", "😮"].map((emoji) => (
                          <TouchableOpacity key={emoji} onPress={() => react(item._id, emoji)} style={styles.reactionBtn} activeOpacity={0.85}>
                            <AppText style={styles.reactionText}>
                              {emoji} {reactionCount(item.reactions, emoji) || ""}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                        {canDeleteMsg && (
                          <TouchableOpacity onPress={() => requestDeleteMsg(item._id)} style={{ marginTop: 0, alignSelf: "flex-end" }}>
                            <AppText style={{ color: "#FCA5A5", fontWeight: "900" }}>Delete</AppText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={<AppText style={{ color: "#94A3B8", marginTop: 12 }}>No messages yet.</AppText>}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* COMPOSE OVERLAY - UPDATED TO USE KEYBOARD CONTROLLER */}
      {composeOpen && (
        <View style={styles.composeOverlay} pointerEvents="box-none">
          {/* Note: pointerEvents="box-none" ensures you can click outside if needed */}
          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <Animated.View style={[styles.composeCard, composeSlideStyle]}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle} numberOfLines={1}>
                  Post to: {selectedSpot?.name || "Chat Spot"}
                </AppText>
                <TouchableOpacity onPress={() => setComposeOpen(false)} style={styles.modalClose}>
                  <Icon name="close" size={20} color="#E5E7EB" />
                </TouchableOpacity>
              </View>

              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message…"
                placeholderTextColor="#94A3B8"
                style={styles.inputTall}
                multiline
                autoFocus={composeOpen}
              />

              <TouchableOpacity onPress={sendSpotMessage} style={styles.primaryBtn} activeOpacity={0.9}>
                <Icon name="send" size={18} color="#fff" />
                <AppText style={[styles.primaryBtnText, { marginLeft: 10 }]}>Send</AppText>
              </TouchableOpacity>

              <AppText style={styles.hint}>This message is public for this pinned spot.</AppText>
            </Animated.View>
          </KeyboardStickyView>
        </View>
      )}

      {/* CREATE MODAL - UPDATED TO USE KEYBOARD CONTROLLER */}
      <Modal transparent visible={createOpen} animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <AppText style={styles.modalTitle}>Create Chat Spot</AppText>
                <TouchableOpacity onPress={() => setCreateOpen(false)} style={styles.modalClose}>
                  <Icon name="close" size={20} color="#E5E7EB" />
                </TouchableOpacity>
              </View>

              <AppText style={styles.createDesc}>
                Enter a name, then tap "Pin Here".
              </AppText>

              <TextInput 
                value={spotName} 
                onChangeText={setSpotName} 
                placeholder="Spot name" 
                placeholderTextColor="#94A3B8" 
                style={styles.inputTall} 
              />

              <TouchableOpacity style={[styles.primaryBtn, creating && { opacity: 0.7 }]} onPress={createSpotNow} disabled={creating}>
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="pin-outline" size={20} color="#fff" />
                    <AppText style={[styles.primaryBtnText, { marginLeft: 10 }]}>Pin Here</AppText>
                  </>
                )}
              </TouchableOpacity>

              <AppText style={styles.hint}>Range is {NEARBY_RADIUS_M}m.</AppText>
            </View>
          </KeyboardStickyView>
        </View>
      </Modal>

      {/* CONFIRM MODAL - Keep as modal */}
      {!!confirm && (
        <View style={styles.confirmOverlay} pointerEvents="auto">
          <View style={styles.confirmCard}>
            <AppText style={styles.confirmTitle}>{confirm.title}</AppText>
            <AppText style={styles.confirmMsg}>{confirm.message}</AppText>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setConfirm(null)} style={styles.secondaryWideBtn} activeOpacity={0.9}>
                <AppText style={{ color: "#E5E7EB", fontWeight: "900" }}>Cancel</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => confirm.onConfirm()}
                style={[styles.primaryWideBtn, confirm.destructive && styles.dangerWideBtn]}
                activeOpacity={0.9}
              >
                <AppText style={{ color: "#fff", fontWeight: "900" }}>{confirm.confirmText || "Confirm"}</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  center: { alignItems: "center", justifyContent: "center" },

  overlay: { ...StyleSheet.absoluteFillObject, paddingTop: Platform.OS === "android" ? 40 : 60, paddingHorizontal: 16 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconGlass: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    justifyContent: "center",
    alignItems: "center",
  },

  title: { color: "#F9FAFB", fontSize: 16, fontWeight: "800" },
  subTitle: { color: "#94A3B8", fontSize: 11.5, marginTop: 2 },

  loadingPill: {
    position: "absolute",
    top: Platform.OS === "android" ? 52 : 64,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.65)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  loadingPillText: { color: "#E5E7EB", marginLeft: 8, fontWeight: "700", fontSize: 12 },

spotStack: { 
    position: "absolute", 
    left: 0, 
    right: 0, 
    bottom: Platform.OS === "android" ? 40 : 60, // Pins exactly to the bottom
    alignItems: "center", 
    gap: 10, 
    flexDirection: "column-reverse", // Forces items to stack upwards, not downwards
    zIndex: 10 
  },
  spotPill: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "88%",
    backgroundColor: "rgba(99, 102, 241, 0.92)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.35)",
  },
  spotText: { color: "#fff", fontWeight: "900", marginLeft: 8, marginRight: 10, fontSize: 14 },

  previewPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    top: Platform.OS === "android" ? 96 : 118,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  previewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  previewTitle: { color: "#fff", fontWeight: "900", marginLeft: 8, flex: 1 },
  previewLine: { color: "#E5E7EB", fontSize: 12, marginBottom: 4 },
  previewHint: { color: "#94A3B8", fontSize: 11, marginTop: 6 },
  previewClose: {
    width: 28,
    height: 28,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    top: Platform.OS === "android" ? 100 : 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(17, 24, 39, 0.82)",
    borderWidth: 1,
    width: W - 32,
    alignSelf: "center",
  },

  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    elevation: 9999,
    zIndex: 9999,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  confirmTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  confirmMsg: { color: "#CBD5E1", marginTop: 6, fontSize: 12.5 },

  secondaryWideBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryWideBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(99, 102, 241, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  dangerWideBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.88)",
    borderColor: "rgba(252, 165, 165, 0.35)",
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    padding: 14,
    maxHeight: "100%",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { color: "#fff", fontSize: 15.5, fontWeight: "900", flex: 1, marginRight: 10, marginTop: 6, marginLeft: 5 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  // NEW: Compose overlay styles
  composeOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  composeCard: {
    backgroundColor: "rgba(17, 24, 39, 0.95)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    padding: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 14, // Extra padding for iOS home indicator
  },

  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    marginRight: 8,
  },
  lockPillText: { color: "#E5E7EB", fontWeight: "900", fontSize: 12 },

  secondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  msgCard: {
    backgroundColor: "rgba(31, 41, 55, 0.75)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    padding: 12,
    marginBottom: 10,
  },
  msgText: { color: "#fff", fontWeight: "700", fontSize: 13.5 },
  msgMeta: { color: "#94A3B8", fontSize: 11, marginTop: 4 },

  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  reactionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
  },
  reactionText: { color: "#E5E7EB", fontWeight: "900", FontSize: 12 },

  inputTall: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    backgroundColor: "rgba(2,6,23,0.45)",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99, 102, 241, 0.92)",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.35)",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.88)",
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(252, 165, 165, 0.35)",
  },
  dangerBtnText: { color: "#fff", fontWeight: "900" },

  createDesc: { color: "#CBD5E1", fontSize: 12.5, marginBottom: 10 },
  hint: { color: "#94A3B8", fontSize: 11, marginTop: 10 },
});