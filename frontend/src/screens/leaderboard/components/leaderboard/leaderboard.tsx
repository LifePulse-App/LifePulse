import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "@rneui/themed";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMonthlyLeaderboard,
  getPermanentLeaderboard,
} from "../../services/api_leaderboard";

// Scopes with labels
const scopes: Array<{ key: "world" | "country" | "city" | "friends"; label: string }> = [
  { key: "world", label: "World" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "friends", label: "Friends" }, // If your API supports friends; otherwise disable until ready
];

const tabs = [
  { key: "monthly", label: "Monthly" },
  { key: "permanent", label: "All-time" },
];

const LeaderboardScreen = () => {
  const [tab, setTab] = useState<"monthly" | "permanent">("monthly");
  const [scope, setScope] = useState<"world" | "country" | "city" | "friends">("world");
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const api = tab === "monthly" ? getMonthlyLeaderboard : getPermanentLeaderboard;
      const res = await api(scope, country, city);
      setData(res.data);
    } catch (e: any) {
      setData(null);
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [tab, scope, country, city]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
    <View style={styles.container}>
      <Text style={styles.header}>Leaderboard</Text>

      {/* Tabs without icons */}
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

      {/* Scope chips */}
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

      {/* TODO: add country/city pickers when scope === 'country' or 'city' */}

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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 16 },
  header: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 12 },

  // Tabs
  tabs: { flexDirection: "row", marginBottom: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1f2937",
    marginRight: 8,
  },
  tabBtnActive: { backgroundColor: "#6366f1" },
  tabText: { color: "#cbd5e1", fontWeight: "700", fontSize: 15 },
  tabTextActive: { color: "#fff" },

  // Scope chips
  scopes: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  scopeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1f2937",
    marginRight: 8,
    marginBottom: 8,
  },
  scopeBtnActive: { backgroundColor: "#a855f7" },
  scopeText: { color: "#cbd5e1", fontWeight: "700" },
  scopeTextActive: { color: "#fff" },

  meCard: {
    backgroundColor: "#1f2937",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  meTitle: { color: "#cbd5e1", fontSize: 13, marginBottom: 4 },
  meRank: { color: "#22c55e", fontSize: 24, fontWeight: "800" },
  meName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  meSub: { color: "#94a3b8", fontSize: 13 },
  meXp: { color: "#cbd5e1", fontSize: 13, marginTop: 4 },

  row: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  separator: {
    height: 8,
    backgroundColor: "transparent",
  },
  rank: { color: "#a855f7", fontSize: 16, fontWeight: "800", width: 30, marginRight: 10 },
  name: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sub: { color: "#94a3b8", fontSize: 12 },
  xpLabel: { color: "#94a3b8", fontSize: 11 },
  xpValue: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default LeaderboardScreen;