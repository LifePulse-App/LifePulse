import React, { useContext, useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Modal from "react-native-modal";
import MainLayout from "../../../shared/components/MainLayout";
import AuthContext from '../../../auth/user/UserContext';
import { logout } from "../../../navigation/main/RootNavigation";
import profileApi from "../services/api_profile"; // Use your actual path!
import { useFocusEffect } from "@react-navigation/native";

// --- Glassy Confirm Modal Component ---
const GlassyConfirmModal = ({ visible, message, onConfirm, onCancel }: any) => {
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
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
const modalStyles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(30,41,59,0.7)", justifyContent: "center",
    alignItems: "center", zIndex: 1000,
  },
  glassyModal: {
    backgroundColor: "rgba(15,23,42,0.82)", borderColor: "white",
    borderWidth: 1, borderRadius: 28, padding: 26, alignItems: "center", width: 280,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, elevation: 18,
  },
  confirmText: {
    color: "#F9FAFB", fontSize: 18, fontWeight: "700", marginBottom: 22, textAlign: "center",
  },
  modalBtns: { flexDirection: "row", justifyContent: "space-evenly", width: '100%' },
  cancelBtn: { backgroundColor: "rgba(228,227,236,1)", borderRadius: 12, paddingVertical: 9, paddingHorizontal: 23, marginRight: 10 },
  confirmBtn: { backgroundColor: "#6366f1", borderRadius: 12, paddingVertical: 9, paddingHorizontal: 23 },
});

// --- Glassy Result Card Component ---
const GlassyResultCard = ({ visible, type = "success", message, onClose }: any) => {
  if (!visible) return null;
  return (
    <View style={resultStyles.overlay}>
      <View style={resultStyles.card}>
        <Text style={[
          resultStyles.message,
          { color: type === "error" ? "#ef4444" : "#22c55e" }
        ]}>
          {message}
        </Text>
        <TouchableOpacity style={resultStyles.okBtn} onPress={onClose}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const resultStyles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,41,59,0.45)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  card: { backgroundColor: "rgba(15,23,42,0.94)", borderColor: "#fff", borderWidth: 1, borderRadius: 24, padding: 26, width: 270, alignItems: "center" },
  message: { fontSize: 17, fontWeight: "bold", textAlign: "center", marginBottom: 18, marginTop: 2 },
  okBtn: { backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 34, marginTop: 2 },
});

// --- Bottom Sheet Modal Components for Each Action ---
function EditProfileModal({ user, onClose, setResultCard, onChange }: any) {
  const [data, setData] = useState({ name: user?.name || "", username: user?.username || "" });
  const [loading, setLoading] = useState(false);
  const onSave = async () => {
    setLoading(true);
    try {
      await profileApi.editProfile(data);
      setLoading(false);
      setResultCard({ visible: true, type: "success", message: "Profile updated!" });
      onChange?.();
      onClose();
    } catch (err) {
      setLoading(false);
      setResultCard({ visible: true, type: "error", message: "Error updating profile." });
    }
  };
  return (
    <View style={sheetStyles.glassyInner}>
      <Text style={sheetStyles.sheetTitle}>Edit Profile</Text>
      <TextInput style={sheetStyles.input} placeholder="Name" placeholderTextColor="#6366f1" value={data.name} onChangeText={name => setData(d => ({ ...d, name }))} />
      <TextInput style={sheetStyles.input} placeholder="Username" placeholderTextColor="#6366f1" value={data.username} onChangeText={username => setData(d => ({ ...d, username }))} />
      <TouchableOpacity style={sheetStyles.saveBtn} onPress={onSave} disabled={loading}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>{loading ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
function ChangePasswordModal({ onClose, setResultCard, onChange }: any) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP after entering passwords
  const requestOtp = async () => {
    setLoading(true);
    try {
      // You can pass the passwords here, or require OTP on registered email regardless
      await profileApi.requestPasswordChangeOtp();
      setLoading(false);
      setStep(2);
    } catch (err) {
      setLoading(false);
      setResultCard({
        visible: true,
        type: "error",
        message: "Error sending OTP"
      });
    }
  };

  const changePasswordWithOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.changePasswordWithOtp({ oldPassword, newPassword, otp });
      if (!response.ok) {
        setResultCard({
          visible: true,
          type: "error",
          message: response.data?.message || "Error changing password."
        });
        onClose();
        return;
      }
      setResultCard({
        visible: true,
        type: "success",
        message: "Password changed!"
      });
      onChange?.();
      onClose();
    } catch (err) {
      setResultCard({
        visible: true,
        type: "error",
        message: err?.response?.data?.message || err?.message || "Error changing password."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={sheetStyles.glassyInner}>
      <Text style={sheetStyles.sheetTitle}>Change Password</Text>
      {step === 1 ? (
        <>
          <TextInput
            style={sheetStyles.input}
            placeholder="Current Password"
            placeholderTextColor="#6366f1"
            value={oldPassword}
            secureTextEntry
            onChangeText={setOldPassword}
          />
          <TextInput
            style={sheetStyles.input}
            placeholder="New Password"
            placeholderTextColor="#6366f1"
            value={newPassword}
            secureTextEntry
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            style={sheetStyles.saveBtn}
            onPress={requestOtp}
            disabled={loading || !oldPassword || !newPassword}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Sending OTP..." : "Request OTP"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 12 }}>
            Enter OTP sent to your email to confirm password change:
          </Text>
          <TextInput
            style={sheetStyles.input}
            placeholder="OTP"
            placeholderTextColor="#6366f1"
            value={otp}
            keyboardType="number-pad"
            onChangeText={setOtp}
          />
          <TouchableOpacity
            style={sheetStyles.saveBtn}
            onPress={changePasswordWithOtp}
            disabled={loading || !otp}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Updating..." : "Update Password"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
function ChangeNumberModal({ user, onClose, setResultCard }: any) {
  const [number, setNumber] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);
  const onSave = async () => {
    setLoading(true);
    try {
      await profileApi.changeNumber(number);
      setLoading(false);
      setResultCard({ visible: true, type: "success", message: "Number changed!" });
      
      onClose();
    } catch (err) {
      setLoading(false);
      setResultCard({ visible: true, type: "error", message: "Error changing number." });
    }
  };
  return (
    <View style={sheetStyles.glassyInner}>
      <Text style={sheetStyles.sheetTitle}>Change Number</Text>
      <TextInput style={sheetStyles.input} placeholder="Phone Number" placeholderTextColor="#6366f1" value={number} keyboardType="phone-pad" onChangeText={setNumber} />
      <TouchableOpacity style={sheetStyles.saveBtn} onPress={onSave} disabled={loading}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>{loading ? "Saving..." : "Update"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
function LinkedAccountModal({ onClose, onChange }: any) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState(1); // 1: request, 2: verify OTP
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ visible: false, type: "success", message: "" });

  useEffect(() => {
    (async () => {
      try {
        const res = await profileApi.getLinkedAccounts();
        setEmail(res.data?.email || "");
      } catch (err) {
        setEmail("");
      }
    })();
  }, []);

  // Request OTP (verify password first!)
  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      
      const response = await profileApi.requestEmailChange({ currentPassword, newEmail }); // Update API on frontend to send password!
      
      if (!response.ok) {  
        setResult({
          visible: true,
          type: "error",
          message: response?.data?.message || "Error changing password."
        });
        onClose();
        return;
      }
      setLoading(false);
      setStage(2);
    } catch (err: any) {
      setLoading(false);
      setResult({
        visible: true,
        type: "error",
        message: err?.response?.data?.message || "Failed to send OTP.",
      });
    }
  };

  // Verify OTP and actually change email
  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.verifyEmailChange({ otp }); // Make sure this matches backend (only OTP needed)
      if (!response.ok) {
        setResult({
          visible: true,
          type: "error",
          message: response.data?.message || "Error changing password."
        });
        onClose();
        return;
      }
      setEmail(newEmail);
      setStage(1);
      setNewEmail("");
      setCurrentPassword("");
      setOtp("");
      setLoading(false);
      setResult({ visible: true, type: "success", message: "Email successfully updated!" });
      onChange?.();
    } catch (err: any) {
      setLoading(false);
      setResult({
        visible: true,
        type: "error",
        message: err?.response?.data?.message || "Failed to update email.",
      });
    }
  };

  return (
    <View style={sheetStyles.glassyInner}>
      <Text style={sheetStyles.sheetTitle}>Change Email</Text>
      <Text style={{ color: "#fff", marginTop: 30, fontSize: 16, marginBottom: 20 }}>
        Registered Email: <Text style={{ fontWeight: "bold", color: "#6366f1" }}>{email}</Text>
      </Text>

      {stage === 1 ? (
        <>
          <TextInput
            style={sheetStyles.input}
            placeholder="Current Password"
            placeholderTextColor="#6366f1"
            value={currentPassword}
            secureTextEntry
            onChangeText={setCurrentPassword}
          />
          <TextInput
            style={sheetStyles.input}
            placeholder="Enter new email"
            placeholderTextColor="#6366f1"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={sheetStyles.saveBtn}
            onPress={handleRequestOtp}
            disabled={loading || !newEmail || !currentPassword}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Requesting OTP..." : "Request OTP"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ color: "#fff", marginBottom: 9 }}>
            Enter OTP sent to your new email:
          </Text>
          <TextInput
            style={sheetStyles.input}
            placeholder="OTP"
            placeholderTextColor="#6366f1"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={sheetStyles.saveBtn}
            onPress={handleVerifyOtp}
            disabled={loading || !otp}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Verifying..." : "Verify & Change Email"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Close</Text>
      </TouchableOpacity>
      {result.visible && (
        <View style={{
          backgroundColor: "rgba(30,41,59,0.61)",
          borderRadius: 16,
          position: "absolute",
          left: 20,
          right: 20,
          top: '45%',
          zIndex: 400
        }}>
          <Text style={{
            padding: 16,
            color: result.type === "success" ? "#22c55e" : "#ef4444",
            fontWeight: "bold",
            textAlign: "center"
          }}>
            {result.message}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#6366f1",
              borderRadius: 10,
              alignSelf: "center",
              marginBottom: 12,
              marginTop: 5,
              paddingHorizontal: 32,
              paddingVertical: 9,
            }}
            onPress={() => setResult({ ...result, visible: false })}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>OK</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const actionComponents = {
  EditProfile: EditProfileModal,
  ChangePassword: ChangePasswordModal,
  ChangeNumber: ChangeNumberModal,
  LinkedAccount: LinkedAccountModal,
};

const settingSections = [
  {
    title: "Account",
    items: [
      { icon: "account-edit", label: "Edit Profile", route: "EditProfile" },
      { icon: "key", label: "Change Password", route: "ChangePassword" },
      { icon: "link", label: "Manage Linked Account", route: "LinkedAccount" },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { icon: "security", label: "Two-factor Authentication", route: "Enable2FA" },
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

const ProfileScreen = ({ navigation }: any) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.User?.user;
  const userId = user?.id;
  const [profile, setProfile] = useState();
  const [activeModal, setActiveModal] = useState(null);

  // --- Modal and Glassy Card States ---
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  // --- API Action Handlers ---
  const confirmLogout = async () => {
    await logout(userId);
    authContext?.setUser(null);
    setLogoutModalVisible(false);
    setResultCard({ visible: true, type: "success", message: "Logged out!" });
    setTimeout(() => {
      setResultCard({ ...resultCard, visible: false });
      navigation.replace("Login");
    }, 1100);
  };
  const handleDeleteAccount = async () => {
    try {
      await profileApi.deleteAccount();
      setDeleteConfirmVisible(false);
      setResultCard({ visible: true, type: "success", message: "Account deleted!" });
      setTimeout(() => {
        setResultCard({ ...resultCard, visible: false });
        authContext?.setUser(null);
        navigation.replace("Login");
      }, 1400);
    } catch (error) {
      setDeleteConfirmVisible(false);
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || error?.message || "Error deleting account." });
    }
  };
  const fetchProfile = async () => {
    try {
      const res = await profileApi.getProfile();
      setProfile(res?.data?.user);
    } catch (e) { }
  };

  const renderActionModal = () => {
    if (!activeModal) return null;
    const ModalComponent = actionComponents[activeModal];
    return (
      <Modal
        isVisible={!!activeModal}
        onBackdropPress={() => setActiveModal(null)}
        style={sheetStyles.modalSheet}
        backdropOpacity={0.41}
        useNativeDriver
      >
        <View style={sheetStyles.sheetContent}>
        <ModalComponent
  user={profile}
  onClose={() => setActiveModal(null)}
  setResultCard={setResultCard}
  onChange={fetchProfile}  // Pass callback for refresh
/>
        </View>
      </Modal>
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  return (
    <MainLayout>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.rightSpacer} />
      </View>
      <ScrollView style={styles.overlay}>
        <View style={styles.mainCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {user?.bitmoji ? (
                <BitmojiFace data={user.bitmoji} previewOnly />
              ) : (
                <Icon name="account-circle-outline" size={70} color="#6366f1" />
              )}
              <TouchableOpacity style={styles.editBtn} onPress={() => setActiveModal("EditProfile")}>
                <Icon name="pencil" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{profile?.name}</Text>
            <Text style={styles.userUsername}>@{profile?.username}</Text>
          </View>
        </View>
        {settingSections.map(section => (
  <View key={section.title}>
    <Text style={styles.sectionTitle}>{section.title}</Text>
    {section.items.map(item => (
      <TouchableOpacity
        key={item.route}
        style={styles.settingCard}
        onPress={() => {
          if (item.route === 'Enable2FA') {
            navigation.navigate('Enable2FA');   // push screen instead of modal
          } else if (item.route === 'Devices') {
            navigation.navigate('Devices');     // if you have that screen
          } else {
            setActiveModal(item.route as any); // use bottom sheet for others
          }
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name={item.icon} size={24} color="#A855F7" />
          <Text style={styles.settingLabel}>{item.label}</Text>
        </View>
        <Icon name="chevron-right" size={22} color="#9CA3AF" />
      </TouchableOpacity>
    ))}
  </View>
))}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.86}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <GlassyConfirmModal
          visible={logoutModalVisible}
          message="Are you sure you want to logout?"
          onConfirm={confirmLogout}
          onCancel={() => setLogoutModalVisible(false)}
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteConfirmVisible(true)}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
        <GlassyConfirmModal
          visible={deleteConfirmVisible}
          message="Are you sure you want to delete your account? This cannot be undone."
          onConfirm={handleDeleteAccount}
          onCancel={() => setDeleteConfirmVisible(false)}
        />
      </ScrollView>
      <GlassyResultCard
        visible={resultCard.visible}
        type={resultCard.type}
        message={resultCard.message}
        onClose={() => setResultCard({ ...resultCard, visible: false })}
      />
      {renderActionModal()}
    </MainLayout>
  );
};

const sheetStyles = StyleSheet.create({
  modalSheet: { justifyContent: "flex-end", margin: 0 },
  sheetContent: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    minHeight: 360,
    borderColor: "white",
    borderTopWidth: 0.1,
    borderLeftWidth: 0.2,
    borderRightWidth: 0.2,
  },
  glassyInner: { width: "100%", alignItems: "center", justifyContent: "center" },
  sheetTitle: { color: "#F9FAFB", fontSize: 19, fontWeight: "bold", marginBottom: 22, marginTop: 10 },
  input: { backgroundColor: "rgba(30,41,59,0.65)", color: "#F9FAFB", borderRadius: 13, padding: 17, fontSize: 16, width: "100%", marginBottom: 17, marginTop: 2 },
  saveBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
    marginBottom: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 7,
  },
  cancelBtn: { backgroundColor: "rgba(148,163,184,0.26)", borderRadius: 12, paddingVertical: 10, alignItems: "center", width: "100%", marginBottom: 8, marginTop: 3 }
});

const styles = StyleSheet.create({
  overlay: { flex: 1, paddingTop: 30, paddingHorizontal: 18 },
  mainCard: { backgroundColor: "rgba(15,23,42,0.65)", borderRadius: 22, padding: 20, marginBottom: 20, alignItems: "center" },
  avatarWrap: { marginBottom: 14, alignItems: "center" },
  avatarCircle: { width: 95, height: 95, borderRadius: 48, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  editBtn: { position: "absolute", right: 3, bottom: 3, backgroundColor: "#6366f1", borderRadius: 14, padding: 7, zIndex: 999 },
  userName: { color: "#F9FAFB", fontWeight: "bold", fontSize: 18, marginTop: 6 },
  userUsername: { color: "#9CA3AF", fontSize: 13 },
  statRow: { flexDirection: "row", justifyContent: 'space-between', marginTop: 6, marginBottom: 7 },
  statCard: { alignItems: 'center', paddingHorizontal: 12 },
  statLabel: { color: "#9CA3AF", fontSize: 13 },
  statValue: { color: "#E5E7EB", fontWeight: "bold", fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: "#F9FAFB", marginTop: 16, marginBottom: 5 },
  settingCard: { backgroundColor: "rgba(15,23,42,0.34)", borderRadius: 14, padding: 13, marginBottom: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingLabel: { color: "#F9FAFB", fontWeight: "bold", fontSize: 15, marginLeft: 13 },
  logoutBtn: { backgroundColor: "#ef4444", borderRadius: 20, paddingVertical: 11, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  deleteBtn: { backgroundColor: "#333", borderRadius: 20, paddingVertical: 10, alignItems: 'center', marginTop: 8, marginBottom: 60 },
  deleteText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  topBar: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  iconGlass: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.0)",
    borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center", alignItems: "center", marginRight: 0,
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10, elevation: 4, marginLeft: 12, marginTop: 5
  },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },
});

export default ProfileScreen;