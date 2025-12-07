import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import MainLayout from "../../../shared/components/MainLayout";

const mockUsers = [
  { _id: "u1", name: "Alice" },
  { _id: "u2", name: "Bob" },
  { _id: "u3", name: "Carol" },
];

export default function NewChatScreen({ navigation }: any) {
  const [q, setQ] = useState("");
  const [offline, setOffline] = useState(false);
  const filtered = mockUsers.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  return (
    <MainLayout>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.title}>New Chat</Text>
              <Text style={[styles.netStatus, offline ? styles.netOffline : styles.netOnline]}>
                {offline ? "Connecting..." : "Online"}
              </Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Icon name="magnify" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users"
              placeholderTextColor="#94a3b8"
              value={q}
              onChangeText={setQ}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate("chat", { peerUserId: item._id, peerName: item.name })}
              >
                <Text style={styles.name}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </View>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a", padding: 12 },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: { position: "absolute", top: -120, left: -40, width: 220, height: 220, borderRadius: 220, backgroundColor: "rgba(59, 130, 246, 0.28)" },
  glowBottom: { position: "absolute", bottom: -140, right: -40, width: 220, height: 220, borderRadius: 220, backgroundColor: "rgba(168, 85, 247, 0.28)" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  netStatus: { fontSize: 12, marginTop: 2 },
  netOnline: { color: "#22c55e" },
  netOffline: { color: "#f97316" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(148,163,184,0.3)" },
  searchInput: { flex: 1, color: "#fff", paddingVertical: 8, marginLeft: 6 },
  row: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
});