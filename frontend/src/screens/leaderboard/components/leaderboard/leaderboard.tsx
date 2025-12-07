import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { Text } from "@rneui/themed";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Country, City } from "country-state-city";

import {
  getMonthlyLeaderboard,
  getPermanentLeaderboard,
  updateLocation,
  getLocationLockStatus,
} from "../../services/api_leaderboard";
import MainLayout from "../../../../shared/components/MainLayout";

const scopes: Array<{ key: "world" | "country" | "city" | "friends"; label: string }> = [
  { key: "world", label: "World Rank" },
  { key: "country", label: "Country Rank" },
  { key: "city", label: "City" },
  { key: "friends", label: "Friends" },
];

const tabs = [
  { key: "monthly", label: "Monthly" },
  { key: "permanent", label: "All-time" },
];

const LeaderboardScreen = () => {
  const [tab, setTab] = useState<"monthly" | "permanent">("monthly");
  const [scope, setScope] = useState<"world" | "country" | "city" | "friends">("world");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Location edit state
  const [editLocation, setEditLocation] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<string | undefined>(undefined);
  const [countryOptions, setCountryOptions] = useState<{ label: string; value: string }[]>([]);
  const [cityOptions, setCityOptions] = useState<{ label: string; value: string }[]>([]);

  // Lock status from backend
  const [lockStatus, setLockStatus] = useState<{
    locked: boolean;
    daysLeft: number;
    locationLockUntil: string | null;
  }>({ locked: false, daysLeft: 0, locationLockUntil: null });

  // Confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);

  // Rules modal
  const [showRules, setShowRules] = useState(false);

  // Monthly reset countdown
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  const [daysLeftUntilReset, setDaysLeftUntilReset] = useState<number>(0);

  // Derived lock state
  const isLocationLocked = !!lockStatus.locked;
  const lockMessage = isLocationLocked
    ? `You can change your location again in ${lockStatus.daysLeft} day(s).`
    : null;

  // Load country list once
  useEffect(() => {
    const list = Country.getAllCountries().map((c) => ({
      label: c.name,
      value: c.isoCode,
    }));
    setCountryOptions(list);
  }, []);

  const loadCitiesForCountry = (isoCode: string, cityToSelect?: string) => {
    const list =
      City.getCitiesOfCountry(isoCode)?.map((ci) => ({
        label: ci.name,
        value: ci.name,
      })) || [];
    setCityOptions(list);
    setSelectedCity(cityToSelect ?? undefined);
  };

  // Prefill country/city from currentUser when data loads
  const prefillFromCurrentUser = useCallback(() => {
    if (!data?.currentUser || countryOptions.length === 0) return;
    const cu = data.currentUser;
    if (cu.country) {
      const match = countryOptions.find(
        (c) => c.label.toLowerCase() === cu.country.toLowerCase()
      );
      if (match) {
        setSelectedCountryCode(match.value);
        loadCitiesForCountry(match.value, cu.city || undefined);
      }
    }
    if (cu.city) {
      setSelectedCity(cu.city);
    }
  }, [data?.currentUser, countryOptions]);

  useEffect(() => {
    prefillFromCurrentUser();
  }, [prefillFromCurrentUser]);

  const loadLockStatus = useCallback(async () => {
    try {
      const res = await getLocationLockStatus();
      const payload = res.data;
      setLockStatus({
        locked: !!payload.locked,
        daysLeft: payload.daysLeft ?? 0,
        locationLockUntil: payload.locationLockUntil || null,
      });
    } catch {
      setLockStatus({ locked: false, daysLeft: 0, locationLockUntil: null });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const api = tab === "monthly" ? getMonthlyLeaderboard : getPermanentLeaderboard;
      const res = await api(scope);
      setData(res.data);
    } catch (e: any) {
      setData(null);
      setErrorMsg(e?.response?.data?.message || e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [tab, scope]);

  useFocusEffect(
    useCallback(() => {
      setData(null);
      setErrorMsg(null);
      (async () => {
        await loadLockStatus();
        await load();
      })();
    }, [load, loadLockStatus])
  );

  // Monthly reset countdown (UTC)
  useEffect(() => {
    if (tab !== "monthly") return;
    const calc = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const nextReset = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0)); // 1st of next month 00:00 UTC
      let diff = nextReset.getTime() - now.getTime();
      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      const pad = (n: number) => n.toString().padStart(2, "0");
      setTimeLeft(`${pad(hours)}:${pad(mins)}:${pad(secs)} UTC`);
      setDaysLeftUntilReset(days);
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [tab]);

  const handleSaveLocationConfirmed = async () => {
    if (isLocationLocked) {
      setErrorMsg(lockMessage || "Location change is locked.");
      return;
    }
    if (!selectedCountryCode) {
      setErrorMsg("Please select a country.");
      return;
    }
    setSavingLocation(true);
    setErrorMsg(null);
    try {
      const countryName =
        countryOptions.find((c) => c.value === selectedCountryCode)?.label || "";
      await updateLocation(countryName, selectedCity);
      setEditLocation(false);
      setShowConfirm(false);
      await loadLockStatus();
      await load();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Failed to update location");
    } finally {
      setSavingLocation(false);
    }
  };

  const onPressSave = () => {
    if (isLocationLocked) {
      setErrorMsg(lockMessage || "Location change is locked.");
      return;
    }
    if (!selectedCountryCode) {
      setErrorMsg("Please select a country.");
      return;
    }
    setShowConfirm(true);
  };

  const renderRow = ({ item }: any) => (
    <View style={styles.row}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={styles.rank}>{item.rank}</Text>
        <View>
          <Text style={styles.name}>{item.name || item.username}</Text>
          <Text style={styles.sub}>
            {item.title ? `${item.title} (Lv ${item.level})` : `Lv ${item.level}`}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.xpLabel}>{tab === "monthly" ? "Monthly XP" : "Total XP"}</Text>
        <Text style={styles.xpValue}>{tab === "monthly" ? item.monthlyXp : item.xp}</Text>
      </View>
    </View>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const currentUser = data?.currentUser;

  return (
    <MainLayout>
      <View style={styles.root}>
        {/* Background & glows */}
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.header}>Leaderboard</Text>
            <TouchableOpacity onPress={() => setShowRules(true)} style={styles.infoBtn}>
              <Icon name="information-outline" size={20} color="#E5E7EB" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {tabs.map((t, i) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabBtn,
                  tab === t.key && styles.tabBtnActive,
                  i === tabs.length - 1 && { marginRight: 0 },
                ]}
                onPress={() => setTab(t.key as any)}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scopes */}
          <View style={styles.scopes}>
            {scopes.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.scopeBtn, scope === s.key && styles.scopeBtnActive]}
                onPress={() => setScope(s.key)}
              >
                <Text style={[styles.scopeText, scope === s.key && styles.scopeTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Monthly reset info */}
          {tab === "monthly" && (
            <View style={styles.resetCard}>
              <Text style={styles.resetTitle}>Monthly reset timer (UTC 00:00)</Text>
              <Text style={styles.resetSub}>{daysLeftUntilReset} day(s) left until reset</Text>
            </View>
          )}

          {/* Location setup / display */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeaderRow}>
              <Text style={styles.locationTitle}>
                {editLocation ? "Set / Update your location" : "Your location"}
              </Text>
              {!editLocation && (
                <TouchableOpacity
                  onPress={() => {
                    if (isLocationLocked) return;
                    prefillFromCurrentUser();
                    setEditLocation(true);
                  }}
                  style={[styles.switchIconBtn, isLocationLocked && { opacity: 0.4 }]}
                  disabled={isLocationLocked}
                >
                  <Icon name="swap-horizontal" size={18} color="#E5E7EB" />
                </TouchableOpacity>
              )}
            </View>

            {isLocationLocked && !editLocation && (
              <Text style={styles.lockText}>{lockMessage}</Text>
            )}

            {editLocation ? (
              <>
                {isLocationLocked && <Text style={styles.lockText}>{lockMessage}</Text>}

                {/* Country dropdown */}
                <View style={styles.dropdownRow}>
                  <Text style={styles.dropdownLabel}>Country</Text>
                  <View style={styles.dropdownBox}>
                    <FlatList
                      data={countryOptions}
                      keyExtractor={(item) => item.value}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            selectedCountryCode === item.value && styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setSelectedCountryCode(item.value);
                            loadCitiesForCountry(item.value);
                          }}
                          disabled={isLocationLocked}
                        >
                          <Text style={styles.dropdownItemText}>{item.label}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>

                {/* City dropdown (only after country is picked) */}
                {selectedCountryCode && (
                  <View style={styles.dropdownRow}>
                    <Text style={styles.dropdownLabel}>City</Text>
                    <View style={styles.dropdownBox}>
                      <FlatList
                        data={cityOptions}
                        keyExtractor={(item, idx) => item.value + idx}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={[
                              styles.dropdownItem,
                              selectedCity === item.value && styles.dropdownItemActive,
                            ]}
                            onPress={() => setSelectedCity(item.value)}
                            disabled={isLocationLocked}
                          >
                            <Text style={styles.dropdownItemText}>{item.label}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    (savingLocation || !selectedCountryCode || isLocationLocked) && { opacity: 0.7 },
                  ]}
                  onPress={onPressSave}
                  disabled={savingLocation || !selectedCountryCode || isLocationLocked}
                >
                  <Text style={styles.applyText}>{savingLocation ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.locationInfoText}>
                {currentUser
                  ? `Country: ${currentUser.country || "—"}${
                      currentUser.city ? `        City: ${currentUser.city}` : ""
                    }`
                  : "No location set"}
              </Text>
            )}
          </View>

          {/* Error glass card */}
          {errorMsg && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.errorRetryBtn} onPress={load}>
                <Text style={styles.errorRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentUser && (
            <View style={styles.meCard}>
              <Text style={styles.meTitle}>Your Rank</Text>
              <Text style={styles.meRank}>{currentUser.rank ?? "—"}</Text>
              <Text style={styles.meName}>{currentUser.name || currentUser.username}</Text>
              <Text style={styles.meSub}>
                {currentUser.title
                  ? `${currentUser.title} (Lv ${currentUser.level})`
                  : `Lv ${currentUser.level}`}
              </Text>
              <Text style={styles.meXp}>
                {tab === "monthly"
                  ? `Monthly XP: ${currentUser.monthlyXp}`
                  : `Total XP: ${currentUser.xp}`}
              </Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color="#A855F7" style={{ marginTop: 12 }} />
          ) : (
            <FlatList
              data={data?.leaderboard || []}
              keyExtractor={(item) => String(item.userId || item._id || item.rank)}
              renderItem={renderRow}
              ItemSeparatorComponent={renderSeparator}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>

        {/* Confirmation Modal */}
        <Modal transparent visible={showConfirm} animationType="fade" onRequestClose={() => setShowConfirm(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Confirm Location Change</Text>
              <Text style={styles.modalText}>
                You won’t be able to change this for 30 days. Continue?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setShowConfirm(false)}
                  disabled={savingLocation}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm]}
                  onPress={handleSaveLocationConfirmed}
                  disabled={savingLocation}
                >
                  <Text style={styles.modalBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Rules Modal */}
        <Modal transparent visible={showRules} animationType="fade" onRequestClose={() => setShowRules(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Leaderboard Rules</Text>
              <Text style={styles.modalText}>
                • Monthly leaderboard resets at 00:00 UTC on the 1st of each month.{'\n'}
                • Location changes are locked for 30 days after each update.{'\n'}
                • Points shown are XP: Monthly XP (monthly tab) and Total XP (all-time tab).{'\n'}
                • S Points will be rewarded on the basis 500 to 1st, 250 to 2nd & 100 to 3-100.{'\n'}
                • S Points can be used in redeem store.{'\n'}
                • Timer shown is based on UTC.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm]}
                  onPress={() => setShowRules(false)}
                >
                  <Text style={styles.modalBtnText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
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
  container: { flex: 1, paddingTop: Platform.OS === "android" ? "3%" : "5%", paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  header: { color: "#fff", fontSize: 20, fontWeight: "700", marginRight: 8 },
  infoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  tabs: { flexDirection: "row", marginBottom: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(31, 41, 55, 0.85)",
    marginRight: 8,
  },
  tabBtnActive: { backgroundColor: "#6366f1" },
  tabText: { color: "#cbd5e1", fontWeight: "700", fontSize: 15 },
  tabTextActive: { color: "#fff" },

  resetCard: {
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderColor: "rgba(148, 163, 184, 0.35)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  resetTitle: { color: "#e5e7eb", fontWeight: "700", fontSize: 13, marginBottom: 6 },
  resetSub: { color: "#cbd5e1", fontSize: 12, marginTop: 2 },

  scopes: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  scopeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(31, 41, 55, 0.85)",
    marginRight: 8,
    marginBottom: 8,
  },
  scopeBtnActive: { backgroundColor: "#a855f7" },
  scopeText: { color: "#cbd5e1", fontWeight: "700" },
  scopeTextActive: { color: "#fff" },

  locationCard: {
    backgroundColor: "rgba(31, 41, 55, 0.7)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  locationHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.4)",
  },
  locationTitle: { color: "#e5e7eb", fontWeight: "700", marginBottom: 8, fontSize: 13 },
  lockText: { color: "#f59e0b", fontSize: 12, marginBottom: 8 },
  dropdownRow: { marginBottom: 8 },
  dropdownLabel: { color: "#cbd5e1", marginBottom: 4, fontWeight: "600", fontSize: 12 },
  dropdownBox: {
    maxHeight: 180,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.5)",
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownItemActive: { backgroundColor: "rgba(99, 102, 241, 0.2)" },
  dropdownItemText: { color: "#e5e7eb", fontSize: 14 },
  applyBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#6366f1",
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "700" },
  locationInfoText: { color: "#cbd5e1", fontSize: 12, marginTop: 6 },

  errorCard: {
    backgroundColor: "rgba(127, 29, 29, 0.3)",
    borderColor: "rgba(248, 113, 113, 0.5)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  errorTitle: { color: "#fecdd3", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  errorText: { color: "#fecdd3", fontSize: 12, marginBottom: 8 },
  errorRetryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248, 250, 252, 0.6)",
  },
  errorRetryText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  meCard: {
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.9)",
  },
  meTitle: { color: "#cbd5e1", fontSize: 13, marginBottom: 4 },
  meRank: { color: "#22c55e", fontSize: 24, fontWeight: "800" },
  meName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  meSub: { color: "#94a3b8", fontSize: 13 },
  meXp: { color: "#cbd5e1", fontSize: 13, marginTop: 4 },

  row: {
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  separator: { height: 8, backgroundColor: "transparent" },
  rank: { color: "#a855f7", fontSize: 16, fontWeight: "800", width: 30, marginRight: 10 },
  name: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sub: { color: "#94a3b8", fontSize: 12 },
  xpLabel: { color: "#94a3b8", fontSize: 11 },
  xpValue: { color: "#fff", fontSize: 15, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  modalText: { color: "#cbd5e1", fontSize: 14, marginBottom: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end" },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancel: {
    borderColor: "rgba(148, 163, 184, 0.5)",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginRight: 10,
  },
  modalConfirm: {
    borderColor: "rgba(99, 102, 241, 0.6)",
    backgroundColor: "rgba(99, 102, 241, 0.25)",
  },
  modalBtnText: { color: "#fff", fontWeight: "700" },
});

export default LeaderboardScreen;