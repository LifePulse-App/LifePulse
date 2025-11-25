import React, { useContext, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import MainLayout from "../../../shared/components/MainLayout";
import AuthContext from '../../../auth/user/UserContext';
import { logout } from "../../../navigation/main/RootNavigation";

// Simple Glassy Confirmation Modal
const GlassyConfirmModal = ({ visible, message, onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <View style={modalStyles.modalOverlay}>
      <View style={modalStyles.glassyModal}>
        <Text style={modalStyles.confirmText}>{message}</Text>
        <View style={modalStyles.modalBtns}>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel}>
            <Text style={{ color: "#374151", fontWeight: "bold" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.confirmBtn} onPress={onConfirm}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(30,41,59,0.7)",
    justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  glassyModal: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderColor: "white",
    borderWidth: 1,
    borderRadius: 28,
    padding: 26,
    alignItems: "center",
    width: 280,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
  },
  confirmText: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 22,
    textAlign: "center",
  },
  modalBtns: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: "rgba(228,227,236,1)",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 23,
    marginRight: 10,
  },
  confirmBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 23,
  },
});

const settingSections = [
  {
    title: "Account",
    items: [
      { icon: "account-edit", label: "Edit Profile", route: "EditProfile" },
      { icon: "key", label: "Change Password", route: "ChangePassword" },
      { icon: "phone", label: "Change Number", route: "ChangeNumber" },
      { icon: "link", label: "Manage Linked Account", route: "LinkedAccount" },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { icon: "security", label: "Two-factor Authentication", route: "TwoFactor" },
      { icon: "devices", label: "Authorized Devices", route: "Devices" },
    ],
  },
  {
    title: "Help & Support",
    items: [
      { icon: "help-circle-outline", label: "FAQ & Help", route: "HelpSupport" },
      { icon: "alert-octagon-outline", label: "Report a Problem", route: "ReportProblem" },
      { icon: "file-document-outline", label: "Legal & Policy", route: "LegalPolicy" },
    ],
  },
];

const ProfileScreen = ({ navigation } :any) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.User?.user;
  const userId = user?.id;

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const confirmLogout = async () => {
    await logout(userId);
    authContext?.setUser(null);
    setLogoutModalVisible(false);
  };

  return (
    <MainLayout>
      <View style={styles.topBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.iconGlass}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.rightSpacer} />
      </View>
      <ScrollView style={styles.overlay}>
        {/* Profile Card */}
        <View style={styles.mainCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {user?.bitmoji ? (
                <BitmojiFace data={user.bitmoji} previewOnly />
              ) : (
                <Icon name="account-circle-outline" size={70} color="#6366f1" />
              )}
              <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("BitmojiFace")}>
                <Icon name="pencil" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.name || user?.username}</Text>
            <Text style={styles.userUsername}>@{user?.username}</Text>
          </View>
          {/* Stats Row */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.level || 1}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.streak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.friendsCount || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>
        </View>
        {/* Settings Sections */}
        {settingSections.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(item => (
              <TouchableOpacity key={item.route} style={styles.settingCard} onPress={() => navigation.navigate(item.route)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name={item.icon} size={24} color="#A855F7" />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                <Icon name="chevron-right" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Glassy Logout Card */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.86}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => {/* delete user API */}}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Glassy Confirm Modal for Logout */}
      <GlassyConfirmModal
        visible={logoutModalVisible}
        message="Are you sure you want to logout?"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  // ...same glass styles as before
  overlay: { flex:1, paddingTop:30, paddingHorizontal:18 },
  mainCard: { backgroundColor: "rgba(15,23,42,0.65)", borderRadius: 22, padding:20, marginBottom:20, alignItems:"center" },
  avatarWrap: { marginBottom:14, alignItems:"center" },
  avatarCircle: { width:95, height:95, borderRadius:48, backgroundColor:"#F3F4F6", justifyContent:"center", alignItems:"center" },
  editBtn: { position:"absolute", right:3, bottom:3, backgroundColor:"#6366f1", borderRadius:14, padding:7, zIndex:999 },
  userName: { color:"#F9FAFB", fontWeight:"bold", fontSize:18, marginTop:6 },
  userUsername: { color:"#9CA3AF", fontSize:13 },
  statRow: { flexDirection:"row", justifyContent:'space-between', marginTop:6, marginBottom:7 },
  statCard: { alignItems:'center', paddingHorizontal:12 },
  statLabel: { color:"#9CA3AF", fontSize:13 },
  statValue: { color:"#E5E7EB", fontWeight:"bold", fontSize:15 },
  sectionTitle: { fontSize:16, fontWeight:'bold', color:"#F9FAFB", marginTop:16, marginBottom:5 },
  settingCard: { backgroundColor:"rgba(15,23,42,0.34)", borderRadius:14, padding:13, marginBottom:7, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  settingLabel: { color:"#F9FAFB", fontWeight:"bold", fontSize:15, marginLeft:13 },
  logoutBtn: { backgroundColor: "#ef4444", borderRadius:20, paddingVertical:11, alignItems:'center', marginTop:18, marginBottom: 10 },
  logoutText: { color:"#fff", fontWeight:"bold", fontSize:15 },
  deleteBtn: { backgroundColor: "#333", borderRadius:20, paddingVertical:10, alignItems:'center', marginTop:8, marginBottom: 60 },
  deleteText: { color:"#fff", fontWeight:"bold", fontSize:14 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.0)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 0,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
    marginLeft: 12,
    marginTop: 5
  },
  pageTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  rightSpacer: {
    width: 40, // matches icon width
    height: 40,
  },
});

export default ProfileScreen;