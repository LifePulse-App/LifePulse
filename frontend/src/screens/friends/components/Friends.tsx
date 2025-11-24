import React, { useState, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import MainLayout from "../../../shared/components/MainLayout";
import AppScreen from "../../../components/Layout/AppScreen/AppScreen";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";
const ICON_GLASS_BG = "rgba(15, 23, 42, 0)";

type FriendUser = {
  id: string;
  name: string;
  username: string;
  avatarColor?: string;
};

const MOCK_SUGGESTIONS: FriendUser[] = [
  { id: "1", name: "Alice Johnson", username: "@alice", avatarColor: "#F97316" },
  { id: "2", name: "Mark Davis", username: "@mark", avatarColor: "#22C55E" },
  { id: "3", name: "Sophia Lee", username: "@sophia", avatarColor: "#38BDF8" },
];

const MOCK_ALL_USERS: FriendUser[] = [
  ...MOCK_SUGGESTIONS,
  { id: "4", name: "John Doe", username: "@john" },
  { id: "5", name: "Emily Parker", username: "@emily" },
  { id: "6", name: "David Kim", username: "@david" },
];

const Friends = ({ navigation }: any) => {
  const [search, setSearch] = useState("");

  const isSearching = search.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = search.trim().toLowerCase();
    return MOCK_ALL_USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [search, isSearching]);

  const handleAddFriend = (user: FriendUser) => {
    // TODO: replace with your API call
    console.log("Add friend:", user);
  };

  const renderUserItem = ({ item }: { item: FriendUser }) => {
    const initials = item.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <View style={styles.userCard}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                item.avatarColor ||
                "rgba(55, 65, 81, 0.9)",
            },
          ]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>{item.username}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.addBtn}
          onPress={() => handleAddFriend(item)}
        >
          <Icon name="account-plus-outline" size={18} color="#F9FAFB" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const listData = isSearching ? searchResults : MOCK_SUGGESTIONS;

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        {/* Background (same as dashboard) */}
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
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.iconGlass}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={22} color="#E5E7EB" />
            </TouchableOpacity>

            <Text style={styles.topTitle}>Add Friends</Text>

            {/* Right spacer to keep title centered */}
            <View style={styles.topRightSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Search bar */}
            <View style={styles.searchCard}>
              <Icon
                name="magnify"
                size={20}
                color="#9CA3AF"
                style={{ marginRight: 8 }}
              />
              <TextInput
                placeholder="Search users..."
                placeholderTextColor="#6B7280"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>

            {/* Section title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isSearching ? "Search results" : "Suggested for you"}
              </Text>
              {!isSearching && (
                <Text style={styles.sectionHint}>
                  People you may want to add as friends
                </Text>
              )}
            </View>

            {/* Users list */}
            {listData.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Icon name="account-search-outline" size={32} color="#6B7280" />
                <Text style={styles.emptyTitle}>No users found</Text>
                {isSearching ? (
                  <Text style={styles.emptyText}>
                    Try a different name or username.
                  </Text>
                ) : (
                  <Text style={styles.emptyText}>
                    We’ll show suggestions here when they’re available.
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.userListCard}>
                <FlatList
                  data={listData}
                  keyExtractor={(item) => item.id}
                  renderItem={renderUserItem}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.listSeparator} />
                  )}
                />
              </View>
            )}

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
  scrollContent: {
    paddingTop: 8,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  topRightSpacer: {
    width: 40,
    height: 40,
  },

  // Search
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 14,
  },

  // Section header
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  sectionHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // List + cards
  userListCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 8,
  },
  listSeparator: {
    height: 1,
    backgroundColor: "rgba(31, 41, 55, 0.9)",
    marginVertical: 8,
  },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  userUsername: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(30, 64, 175, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.7)",
  },
  addBtnText: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Empty state
  emptyStateCard: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

export default Friends;