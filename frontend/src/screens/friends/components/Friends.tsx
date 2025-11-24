import React, { useState, useEffect, useMemo, useContext } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Platform,
  StatusBar,
  Alert
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import MainLayout from "../../../shared/components/MainLayout";
import AppScreen from "../../../components/Layout/AppScreen/AppScreen";
import socialApi from "../services/api_friends";
import { UserProfile, FollowRequest } from "../models/FriendModel";
import AuthContext from "../../../auth/user/UserContext";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";
const ICON_GLASS_BG = "rgba(15, 23, 42, 0)";

const Friends = ({ navigation }: any) => {
  const authContext = useContext(AuthContext);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FollowRequest[]>([]);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [loadingActions, setLoadingActions] = useState<string | null>(null);

  // You should get this from your auth context/store
  const currentUserId = authContext?.User?.user?.id; // replace with real user id

  const isSearching = search.trim().length > 0;

  // Fetch suggestions
  useEffect(() => {
    socialApi.getSuggestedUsers(10)
      .then((res) => {
        console.log("getSuggestedUsers", res.data);
        setSuggestions(res.data.suggestions ?? []);
      })
      .catch((error) => {
        setSuggestions([]);
        console.log("Suggestion Error:", error);
      });
  }, []);

  // Fetch friend requests
  useEffect(() => {
    socialApi.getFollowRequests()
      .then((res) => {
        console.log("getFollowRequests", res.data);
        setFriendRequests(res.data.pendingRequests ?? []);
      })
      .catch((error) => {
        setFriendRequests([]);
        console.log("Requests Error:", error);
      });
  }, []);

  // Search users
  useEffect(() => {
    if (isSearching) {
      socialApi.searchUsers(`q=${encodeURIComponent(search)}`)
        .then((res) => {
          console.log("searchUsers", res.data);
          setAllUsers(res.data.user ?? []);
        })
        .catch((error) => {
          setAllUsers([]);
          console.log("Search Error:", error);
        });
    } else {
      setAllUsers([]);
    }
  }, [search, isSearching]);

  const searchResults = useMemo(() => {
    return isSearching ? allUsers : [];
  }, [allUsers, isSearching]);

  const handleAddFriend = async (user: UserProfile) => {
    setLoadingActions(user._id);
    try {
      await socialApi.followUser(user._id, currentUserId);
      Alert.alert("Friend Request Sent", `Request sent to ${user.name}`);
      console.log("Add Friend API called: user=", user._id, "currentUser=", currentUserId);
    } catch (e) {
      console.log("Add Friend Error:", e);
      Alert.alert("Error", "Could not send friend request.");
    }
    setLoadingActions(null);
  };

  const handleAcceptRequest = async (req: FollowRequest) => {
    setLoadingActions(req.user._id);
    try {
      await socialApi.acceptFollowRequest(currentUserId, req.user._id); // userId = current, requester = request user
      Alert.alert("Request Accepted", `Accepted request from ${req.user.name}`);
      console.log("Accept API:", currentUserId, req.user._id);
      // Remove locally
      setFriendRequests((prev) => prev.filter((r) => r.user._id !== req.user._id));
    } catch (e) {
      Alert.alert("Error", "Couldn't accept request.");
      console.log("Accept Error:", e);
    }
    setLoadingActions(null);
  };

  const handleRejectRequest = async (req: FollowRequest) => {
    setLoadingActions(req.user._id);
    try {
      await socialApi.removeFollowRequest(currentUserId, req.user._id); // userId = current, requester = request user
      Alert.alert("Request Rejected", `Rejected request from ${req.user.name}`);
      console.log("Reject API:", currentUserId, req.user._id);
      setFriendRequests((prev) => prev.filter((r) => r.user._id !== req.user._id));
    } catch (e) {
      Alert.alert("Error", "Couldn't reject request.");
      console.log("Reject Error:", e);
    }
    setLoadingActions(null);
  };

  const renderUserItem = ({ item }: { item: UserProfile | FollowRequest }) => {
    // For requests, item = FollowRequest { user: UserProfile }
    const isRequest = !!(item as FollowRequest).requestedAt;
    const user =
      isRequest && (item as FollowRequest).user
        ? (item as FollowRequest).user
        : (item as UserProfile);
    const initials =
      user.name
        ? user.name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)
        : user.username[1].toUpperCase();

    return (
      <View style={styles.userCard}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: user.avatarColor || "rgba(55, 65, 81, 0.9)",
            },
          ]}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name ?? user.username}</Text>
          <Text style={styles.userUsername}>{user.username}</Text>
        </View>
        {isRequest ? (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.addBtn,
                {
                  backgroundColor:
                    loadingActions === user._id ? "#d1d5db" : "#22C55E",
                  marginRight: 6,
                },
              ]}
              onPress={() => handleAcceptRequest(item as FollowRequest)}
              disabled={loadingActions === user._id}
            >
              <Icon name="check" size={18} color="#F9FAFB" />
              <Text style={styles.addBtnText}>
                {loadingActions === user._id ? "..." : "Accept"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.addBtn,
                {
                  backgroundColor:
                    loadingActions === user._id ? "#d1d5db" : "#EF4444",
                },
              ]}
              onPress={() => handleRejectRequest(item as FollowRequest)}
              disabled={loadingActions === user._id}
            >
              <Icon name="close" size={18} color="#F9FAFB" />
              <Text style={styles.addBtnText}>
                {loadingActions === user._id ? "..." : "Reject"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.addBtn,
              {
                backgroundColor:
                  loadingActions === user._id
                    ? "#d1d5db"
                    : "rgba(30, 64, 175, 0.9)",
              },
            ]}
            onPress={() => handleAddFriend(user)}
            disabled={loadingActions === user._id}
          >
            <Icon name="account-plus-outline" size={18} color="#F9FAFB" />
            <Text style={styles.addBtnText}>
              {loadingActions === user._id ? "..." : "Add"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const requestListToShow = showAllRequests
    ? friendRequests
    : friendRequests.slice(0, 3);

  const listData = isSearching ? searchResults : suggestions;

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.iconGlass}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={22} color="#E5E7EB" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Add Friends</Text>
            <View style={styles.topRightSpacer} />
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.searchCard}>
              <Icon name="magnify" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search users..."
                placeholderTextColor="#6B7280"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
            </View>
            {friendRequests.length > 0 && (
              <View style={styles.userListCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Friend Requests</Text>
                  <Text style={styles.sectionHint}>Accept or ignore friend requests</Text>
                </View>
                <FlatList
                  data={requestListToShow}
                  keyExtractor={(item) => item.user._id}
                  renderItem={renderUserItem}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.listSeparator} />
                  )}
                  ListFooterComponent={() =>
                    friendRequests.length > 3 && (
                      <TouchableOpacity
                        onPress={() => setShowAllRequests((v) => !v)}
                        style={{ alignItems: "center", marginTop: 10, paddingBottom: 2 }}
                      >
                        <Icon
                          name={showAllRequests ? "chevron-up" : "chevron-down"}
                          size={26}
                          color="#94A3B8"
                        />
                        <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                          {showAllRequests ? "Show Less" : "Show All"}
                        </Text>
                      </TouchableOpacity>
                    )
                  }
                />
              </View>
            )}
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
                  keyExtractor={(item) => item._id}
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