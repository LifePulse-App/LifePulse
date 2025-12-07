import React, { useEffect, useState, useCallback } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import { fetchConversations } from "../services/api_e2ee";
import MainLayout from "../../../shared/components/MainLayout";

export default function ChatListScreen({ navigation }: any) {
  const [search, setSearch] = useState("");
  const [convos, setConvos] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await fetchConversations();
      setConvos(data.conversations || []);
    } catch (e) {
      console.log("load convos error", e);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const filtered = convos.filter((c) =>
    (c._id?.peerName || c._id?.peer || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.title}>Chats</Text>
              <Text style={[styles.netStatus, offline ? styles.netOffline : styles.netOnline]}>
                {offline ? "Connecting..." : "Online"}
              </Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("NewChat")}>
              <Icon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Icon name="magnify" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id.peer}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  navigation.navigate("Chat", { peerUserId: item._id.peer, peerName: item._id.peerName || "Friend" })
                }
              >
                <Text style={styles.peer}>{item._id.peerName || "Friend"}</Text>
                <Text style={styles.snippet}>{item.lastMessage?.ciphertext ? "Encrypted message" : ""}</Text>
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
  peer: { color: "#fff", fontSize: 16, fontWeight: "700" },
  snippet: { color: "#94a3b8", marginTop: 4 },
});