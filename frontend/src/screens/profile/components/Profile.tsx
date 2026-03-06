import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Modal from "react-native-modal";
import MainLayout from "../../../shared/components/MainLayout";
import AuthContext from '../../../auth/user/UserContext';
import { logout } from "../../../navigation/main/RootNavigation";
import profileApi from "../services/api_profile";
import { useFocusEffect } from "@react-navigation/native";
import UserStorage from "../../../auth/user/UserStorage";
import SavedAccountsStorage from "../../../auth/user/SavedAccountsStorage";
import apiClient from "../../../auth/api-client/api_client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const PROFILE_CACHE_KEY = "profile_cache_v1";

const GlassyConfirmModal = ({ visible, message, onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.glassyModal}>
        <Text style={styles.confirmText}>{message}</Text>
        <View style={styles.modalBtns}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={{ color: "#374151", fontWeight: "bold" }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const GlassyResultCard = ({ visible, type = "success", message, onClose }) => {
  if (!visible) return null;
  return (
    <View style={styles.resultOverlay}>
      <View style={styles.resultCard}>
        <Text style={[
          styles.resultMessage,
          { color: type === "error" ? "#ef4444" : "#22c55e" }
        ]}>{message}</Text>
        <TouchableOpacity style={styles.resultOkBtn} onPress={onClose}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Edit Profile Modal ---
function EditProfileModal({ user, onClose, setResultCard, onChange }) {
  const [data, setData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    isPublic: typeof user?.isPublic === "boolean" ? user.isPublic : true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData({
      name: user?.name || "",
      username: user?.username || "",
      isPublic: typeof user?.isPublic === "boolean" ? user.isPublic : true,
    });
  }, [user]);

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
      setResultCard({
        visible: true,
        type: "error",
        message: err?.response?.data?.message || err?.message || "Error updating profile."
      });
    }
  };

  return (
    <View style={styles.glassyInner}>
      <Text style={styles.sheetTitle}>Edit Profile</Text>
      <TextInput
        style={styles.sheetInput}
        placeholder="Name"
        placeholderTextColor="#6366f1"
        value={data.name}
        onChangeText={name => setData(d => ({ ...d, name }))}
      />
      <TextInput
        style={styles.sheetInput}
        placeholder="Username"
        placeholderTextColor="#6366f1"
        value={data.username}
        autoCapitalize="none"
        onChangeText={username => setData(d => ({ ...d, username }))}
      />
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.toggleRow}
        onPress={() => setData(d => ({ ...d, isPublic: !d.isPublic }))}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Icon
            name={data.isPublic ? "earth" : "account-multiple"}
            size={20}
            color={data.isPublic ? "#22c55e" : "#f59e0b"}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.toggleTitle}>Show my location</Text>
            <Text style={styles.toggleSub}>
              {data.isPublic
                ? "Anyone can see your city & country in profile."
                : "No one can see your city & country."}
            </Text>
          </View>
        </View>
        <View style={[styles.togglePill, data.isPublic ? styles.pillOn : styles.pillOff]}>
          <View style={[styles.toggleDot, data.isPublic ? styles.dotOn : styles.dotOff]} />
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sheetSaveBtn} onPress={onSave} disabled={loading}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>{loading ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Change Password Modal ---
function ChangePasswordModal({ onClose, setResultCard, onChange }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    try {
      await profileApi.requestPasswordChangeOtp();
      setLoading(false);
      setStep(2);
    } catch (err) {
      setLoading(false);
      setResultCard({ visible: true, type: "error", message: "Error sending OTP" });
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
      setResultCard({ visible: true, type: "success", message: "Password changed!" });
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
    <View style={styles.glassyInner}>
      <Text style={styles.sheetTitle}>Change Password</Text>
      {step === 1 ? (
        <>
          <TextInput
            style={styles.sheetInput}
            placeholder="Current Password"
            placeholderTextColor="#6366f1"
            value={oldPassword}
            secureTextEntry
            onChangeText={setOldPassword}
          />
          <TextInput
            style={styles.sheetInput}
            placeholder="New Password"
            placeholderTextColor="#6366f1"
            value={newPassword}
            secureTextEntry
            onChangeText={setNewPassword}
          />
          <TouchableOpacity
            style={styles.sheetSaveBtn}
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
            style={styles.sheetInput}
            placeholder="OTP"
            placeholderTextColor="#6366f1"
            value={otp}
            keyboardType="number-pad"
            onChangeText={setOtp}
          />
          <TouchableOpacity
            style={styles.sheetSaveBtn}
            onPress={changePasswordWithOtp}
            disabled={loading || !otp}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Updating..." : "Update Password"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Change Number Modal ---
function ChangeNumberModal({ user, onClose, setResultCard }) {
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
    <View style={styles.glassyInner}>
      <Text style={styles.sheetTitle}>Change Number</Text>
      <TextInput style={styles.sheetInput} placeholder="Phone Number" placeholderTextColor="#6366f1" value={number} keyboardType="phone-pad" onChangeText={setNumber} />
      <TouchableOpacity style={styles.sheetSaveBtn} onPress={onSave} disabled={loading}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>{loading ? "Saving..." : "Update"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Linked Account Modal ---
function LinkedAccountModal({ onClose, onChange }) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState(1);
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

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.requestEmailChange({ currentPassword, newEmail });
      if (!response.ok) {
        setResult({ visible: true, type: "error", message: response?.data?.message || "Error changing password." });
        onClose();
        return;
      }
      setLoading(false);
      setStage(2);
    } catch (err) {
      setLoading(false);
      setResult({ visible: true, type: "error", message: err?.response?.data?.message || "Failed to send OTP." });
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.verifyEmailChange({ otp });
      if (!response.ok) {
        setResult({ visible: true, type: "error", message: response.data?.message || "Error changing password." });
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
    } catch (err) {
      setLoading(false);
      setResult({ visible: true, type: "error", message: err?.response?.data?.message || "Failed to update email." });
    }
  };

  return (
    <View style={styles.glassyInner}>
      <Text style={styles.sheetTitle}>Change Email</Text>
      <Text style={{ color: "#fff", marginTop: 30, fontSize: 16, marginBottom: 20 }}>
        Registered Email: <Text style={{ fontWeight: "bold", color: "#6366f1" }}>{email}</Text>
      </Text>
      {stage === 1 ? (
        <>
          <TextInput
            style={styles.sheetInput}
            placeholder="Current Password"
            placeholderTextColor="#6366f1"
            value={currentPassword}
            secureTextEntry
            onChangeText={setCurrentPassword}
          />
          <TextInput
            style={styles.sheetInput}
            placeholder="Enter new email"
            placeholderTextColor="#6366f1"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={styles.sheetSaveBtn}
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
          <Text style={{ color: "#fff", marginBottom: 9 }}>Enter OTP sent to your new email:</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="OTP"
            placeholderTextColor="#6366f1"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={styles.sheetSaveBtn}
            onPress={handleVerifyOtp}
            disabled={loading || !otp}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Verifying..." : "Verify & Change Email"}
            </Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Close</Text>
      </TouchableOpacity>
      {result.visible && (
        <View style={styles.resultSoftCard}>
          <Text style={{
            padding: 16,
            color: result.type === "success" ? "#22c55e" : "#ef4444",
            fontWeight: "bold",
            textAlign: "center"
          }}>{result.message}</Text>
          <TouchableOpacity
            style={styles.resultSoftOkBtn}
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
      { icon: "devices", label: "Devices in which you are logged in", route: "Devices" },
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

export default function ProfileScreen({ navigation }) {
  const authContext = useContext(AuthContext);
  const user = authContext?.User?.user;
  const userId = user?.id;
  const [profile, setProfile] = useState(null);
  const avatarUrl = profile?.avatarUrl || profile?.avatarThumbnailUrl;
  const [activeModal, setActiveModal] = useState(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteOtpStep, setDeleteOtpStep] = useState(0);
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  // FIX 1: Use a ref for offline status so callbacks always read the latest
  // value synchronously — avoids stale closure in useFocusEffect and fetchProfileOnline.
  const offlineRef = useRef(false);
  const [offline, setOffline] = useState(false);

  // FIX 2: Track mount to prevent useFocusEffect double-firing with the initial load.
  const hasMountedRef = useRef(false);

  // FIX 3: Set up NetInfo listener AND fetch initial state immediately on mount,
  // so offlineRef is populated before the first profile load runs.
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });

    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const fetchProfileOnline = useCallback(async () => {
    // FIX 4: Read offlineRef.current synchronously — never rely on offline state here.
    if (offlineRef.current) return;

    try {
      const [profileRes, avatarRes] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getAvatarUrl(),
      ]);
      const fetchedUser = profileRes?.data?.user;

      // FIX 5: Guard against undefined API response — don't overwrite good cache.
      if (!fetchedUser) {
        console.log("[Profile] API returned no user data — keeping cache.");
        return;
      }

      const { avatarThumbnailUrl } = avatarRes?.data || {};
      const merged = { ...fetchedUser, avatarThumbnailUrl };
      setProfile(merged);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(merged));
    } catch (e) {
      // On error, keep whatever is already in state (loaded from cache below).
      console.log("[Profile] fetchProfileOnline error — keeping cache:", e?.message);
    }
  }, []); // FIX 6: No `offline` dependency — uses ref instead.

  // FIX 7: On mount, always load cache first unconditionally, then attempt online fetch.
  // Previously the online fetch ran inside the same effect that read offline state —
  // but offline state wasn't set yet at that point, so it always hit the API.
  useEffect(() => {
    (async () => {
      // Step 1: Load cache immediately for instant display.
      try {
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached) setProfile(cached);
        }
      } catch {}

      // Step 2: Attempt live fetch (fetchProfileOnline checks offlineRef internally).
      await fetchProfileOnline();
    })();
  }, [fetchProfileOnline]);

  // FIX 8: useFocusEffect skips first mount (handled above) and only re-fetches
  // on subsequent screen focus events — prevents double-fire race condition.
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      fetchProfileOnline();
    }, [fetchProfileOnline])
  );

  // FIX 9: Re-fetch when coming back online so live data replaces cached data.
  useEffect(() => {
    if (!offline) {
      fetchProfileOnline();
    }
  }, [offline]); // intentionally only triggers on offline toggle

  const confirmLogout = async () => {
    const userData = authContext?.User;
    if (userData?.user?.id && userData?.UserName && userData?.Password) {
      await SavedAccountsStorage.save({
        id: userData.user.id,
        username: userData.UserName,
        password: userData.Password,
        user: userData,
      });
    }
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    await logout(userId);
    authContext?.setUser(null);
    UserStorage.clearTokens();
    UserStorage.deleteUser();
    navigation.replace("SavedAccounts");
  };

  const handleRequestDeleteOtp = async () => {
    setDeleteLoading(true);
    try {
      await profileApi.requestDeleteAccountOtp();
      setDeleteOtpStep(1);
      setDeleteLoading(false);
      setResultCard({ visible: true, type: "success", message: "OTP sent to your email." });
    } catch (error) {
      setDeleteLoading(false);
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || error?.message || "Error sending OTP." });
    }
  };

  const handleDeleteAccountWithOtp = async () => {
    setDeleteLoading(true);
    try {
      await profileApi.deleteAccountWithOtp(deleteOtp);
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
      setDeleteConfirmVisible(false);
      setDeleteOtp("");
      setDeleteOtpStep(0);
      setResultCard({ visible: true, type: "success", message: "Account deleted!" });
      setTimeout(() => {
        setResultCard({ visible: false, type: "success", message: "" });
        authContext?.setUser(null);
        UserStorage.clearTokens();
        navigation.replace("Login");
      }, 1400);
    } catch (error) {
      setDeleteLoading(false);
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || error?.message || "Error deleting account." });
    }
  };

  const renderActionModal = () => {
    if (!activeModal) return null;
    const ModalComponent = actionComponents[activeModal];
    return (
      <Modal
        isVisible={!!activeModal}
        onBackdropPress={() => setActiveModal(null)}
        style={styles.modalSheet}
        backdropOpacity={0.41}
        useNativeDriver
      >
        <View style={styles.sheetContent}>
          <ModalComponent
            user={profile}
            onClose={() => setActiveModal(null)}
            setResultCard={setResultCard}
            onChange={fetchProfileOnline}
          />
        </View>
      </Modal>
    );
  };

  return (
    <MainLayout>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.overlay}>
        <View style={styles.mainCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {avatarUrl ? (
                <View style={styles.avatarMask}>
                  <Image
                    source={{ uri: avatarUrl.startsWith("http") ? avatarUrl : newUrl + avatarUrl }}
                    style={styles.avatarImageZoomed}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Icon name="account-circle-outline" size={70} color="#6366f1" />
              )}
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate('AvatarCreator')}
              >
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
                  if (["Enable2FA", "Devices", "HelpSupport", "ReportProblem", "LegalPolicy"].includes(item.route)) {
                    navigation.navigate(item.route);
                  } else {
                    setActiveModal(item.route);
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

        <TouchableOpacity style={styles.deleteBtn} onPress={() => {
          setDeleteConfirmVisible(true);
          setDeleteOtpStep(0);
          setDeleteOtp("");
        }}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        {deleteConfirmVisible && (
          <Modal
            isVisible={deleteConfirmVisible}
            backdropOpacity={0.54}
            useNativeDriver
            onBackdropPress={() => {
              setDeleteConfirmVisible(false);
              setDeleteOtp("");
              setDeleteOtpStep(0);
            }}
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <View style={styles.glassyModal}>
              <Text style={styles.confirmText}>
                {deleteOtpStep === 0
                  ? "Are you sure you want to delete your account? This cannot be undone."
                  : "Enter the OTP sent to your registered email to confirm account deletion."}
              </Text>
              {deleteOtpStep === 0 ? (
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setDeleteConfirmVisible(false); setDeleteOtpStep(0); setDeleteOtp(""); }}
                  >
                    <Text style={{ color: "#374151", fontWeight: "bold" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleRequestDeleteOtp}>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      {deleteLoading ? "Sending OTP..." : "Send OTP"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={[styles.sheetInput, { width: 200 }]}
                    placeholder="Enter OTP"
                    placeholderTextColor="#6366f1"
                    value={deleteOtp}
                    onChangeText={setDeleteOtp}
                    keyboardType="number-pad"
                  />
                  <View style={styles.modalBtns}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setDeleteConfirmVisible(false); setDeleteOtpStep(0); setDeleteOtp(""); }}
                    >
                      <Text style={{ color: "#374151", fontWeight: "bold" }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleDeleteAccountWithOtp}
                      disabled={deleteLoading || !deleteOtp}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        {deleteLoading ? "Deleting..." : "Confirm Deletion"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </Modal>
        )}
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
}

const styles = StyleSheet.create({
  overlay: { flex: 1, paddingTop: 30, paddingHorizontal: 18 },
  mainCard: { backgroundColor: "transparent", borderRadius: 22, padding: 5, marginBottom: 3, alignItems: "center" },
  avatarWrap: { marginBottom: 14, alignItems: "center" },
  avatarCircle: { width: 95, height: 95, borderRadius: 48, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  avatarMask: { width: 95, height: 95, borderRadius: 48, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImageZoomed: { width: 110, height: 110, borderRadius: 65 },
  editBtn: { position: "absolute", right: 3, bottom: 3, backgroundColor: "#6366f1", borderRadius: 14, padding: 7, zIndex: 999 },
  userName: { color: "#F9FAFB", fontWeight: "bold", fontSize: 18, marginTop: 6 },
  userUsername: { color: "#9CA3AF", fontSize: 13 },
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
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10, elevation: 4, marginLeft: 12, marginTop: 5,
  },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },
  modalOverlay: {
    position: "absolute", left: 0, top: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(30,41,59,0.7)", justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  glassyModal: {
    backgroundColor: "rgba(15,23,42,0.82)", borderColor: "white",
    borderWidth: 1, borderRadius: 28, padding: 26, alignItems: "center", width: 280,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, elevation: 18,
  },
  confirmText: { color: "#F9FAFB", fontSize: 18, fontWeight: "700", marginBottom: 22, textAlign: "center" },
  modalBtns: { flexDirection: "row", justifyContent: "space-evenly", width: '100%' },
  cancelBtn: { backgroundColor: "rgba(228,227,236,1)", borderRadius: 12, paddingVertical: 9, paddingHorizontal: 23, marginRight: 10 },
  confirmBtn: { backgroundColor: "#6366f1", borderRadius: 12, paddingVertical: 9, paddingHorizontal: 23 },
  resultOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,41,59,0.45)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  resultCard: { backgroundColor: "rgba(15,23,42,0.94)", borderColor: "#fff", borderWidth: 1, borderRadius: 24, padding: 26, width: 270, alignItems: "center" },
  resultMessage: { fontSize: 17, fontWeight: "bold", textAlign: "center", marginBottom: 18, marginTop: 2 },
  resultOkBtn: { backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 34, marginTop: 2 },
  glassyInner: { width: "100%", alignItems: "center", justifyContent: "center" },
  sheetTitle: { color: "#F9FAFB", fontSize: 19, fontWeight: "bold", marginBottom: 22, marginTop: 10 },
  sheetInput: { backgroundColor: "rgba(30,41,59,0.65)", color: "#F9FAFB", borderRadius: 13, padding: 17, fontSize: 16, width: "100%", marginBottom: 17, marginTop: 2 },
  sheetSaveBtn: {
    backgroundColor: "#6366f1", borderRadius: 15, paddingVertical: 13, alignItems: "center",
    width: "100%", marginTop: 8, marginBottom: 8,
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 7,
  },
  sheetCancelBtn: { backgroundColor: "rgba(148,163,184,0.26)", borderRadius: 12, paddingVertical: 10, alignItems: "center", width: "100%", marginBottom: 8, marginTop: 3 },
  toggleRow: {
    width: "100%", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12,
    marginTop: -6, marginBottom: 14, backgroundColor: "rgba(15,23,42,0.55)",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  toggleTitle: { color: "#F9FAFB", fontWeight: "800", fontSize: 13 },
  toggleSub: { color: "#9CA3AF", fontSize: 11, marginTop: 3, lineHeight: 14 },
  togglePill: { width: 44, height: 24, borderRadius: 999, padding: 3, justifyContent: "center" },
  pillOn: { backgroundColor: "rgba(34,197,94,0.45)" },
  pillOff: { backgroundColor: "rgba(148,163,184,0.25)" },
  toggleDot: { width: 18, height: 18, borderRadius: 999 },
  dotOn: { backgroundColor: "#22c55e", alignSelf: "flex-end" },
  dotOff: { backgroundColor: "#e5e7eb", alignSelf: "flex-start" },
  sheetContent: {
    backgroundColor: "rgba(15,23,42,0.96)", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, minHeight: 360, borderColor: "white", borderTopWidth: 0.1, borderLeftWidth: 0.2, borderRightWidth: 0.2,
  },
  modalSheet: { justifyContent: "flex-end", margin: 0 },
  resultSoftCard: { backgroundColor: "rgba(30,41,59,0.61)", borderRadius: 16, position: "absolute", left: 20, right: 20, top: '45%', zIndex: 400 },
  resultSoftOkBtn: { backgroundColor: "#6366f1", borderRadius: 10, alignSelf: "center", marginBottom: 12, marginTop: 5, paddingHorizontal: 32, paddingVertical: 9 },
});