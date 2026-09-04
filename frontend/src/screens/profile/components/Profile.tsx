import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput, Image, ActivityIndicator, Platform } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
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
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import FastImage from 'react-native-fast-image';
import { getAvatar } from "../../../storage/AvatarManager";
import { disconnectSocket } from "../../../auth/api-client/socket";
import { getApp } from "@react-native-firebase/app";
import { getMessaging, getToken } from "@react-native-firebase/messaging";

const PROFILE_CACHE_KEY = 'sbjkshiuhuw';

const GlassyResultCard = ({ visible, type = "success", message, onClose }: any) => {
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

// --- Edit Profile Modal (Cleaned up: privacy setting moved out) ---
function EditProfileModal({ user, onClose, setResultCard, onChange }: any) {
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
      onChange?.();
      onClose(); // ⚡ Silently closes without success alert card
    } catch (err: any) {
      setLoading(false);
      setResultCard({
        visible: true,
        type: "error",
        message: err?.response?.data?.message || err?.message || "Error updating profile."
      });
    }
  };

  return (
    <ScrollView style={styles.glassyInner} showsVerticalScrollIndicator={false}>
      <Text style={styles.sheetTitle}>Edit Profile</Text>
      
      <Text style={styles.inputLabel}>Name</Text>
      <TextInput
        style={styles.sheetInput}
        placeholder="Name"
        placeholderTextColor="#6366f1"
        value={data.name}
        onChangeText={name => setData(d => ({ ...d, name }))}
      />

      <Text style={styles.inputLabel}>Username</Text>
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
                ? "Anyone can see your city & country."
                : "No one can see your city & country."}
            </Text>
          </View>
        </View>
        <View style={[styles.togglePill, data.isPublic ? styles.pillOn : styles.pillOff]}>
          <View style={[styles.toggleDot, data.isPublic ? styles.dotOn : styles.dotOff]} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sheetSaveBtn} onPress={onSave} disabled={loading}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>{loading ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// --- ⚡ NEW: Activity Posting Privacy Modal ---
function ActivityPrivacyModal({ currentScope, onClose, onChange }: any) {
  const [selectedScope, setSelectedScope] = useState(currentScope || "world");
  const [loading, setLoading] = useState(false);

  const scopes = [
    { label: "World (Everyone)", value: "world", icon: "earth" },
    { label: "Friends Only", value: "friends", icon: "account-multiple" },
    { label: "Private (Only Me)", value: "private", icon: "lock" },
  ];

  const handleSelect = async (val: string) => {
    setSelectedScope(val);
    setLoading(true);
    try {
      await profileApi.updateActivityPrivacy(val);
      setLoading(false);
      onChange?.(val);
      onClose(); // ⚡ Silently closes without alerts
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <View style={styles.glassyInner}>
      <Text style={styles.sheetTitle}>Activity Posting Privacy</Text>
      <Text style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
        Choose who can see your new activity feed posts by default.
      </Text>

      <View style={{ marginBottom: 12 }}>
        {scopes.map(scope => {
          const isSelected = selectedScope === scope.value;
          return (
            <TouchableOpacity
              key={scope.value}
              activeOpacity={0.8}
              style={[
                styles.scopeOptionRow,
                isSelected && styles.scopeOptionRowActive
              ]}
              onPress={() => handleSelect(scope.value)}
              disabled={loading}
            >
              <Icon
                name={scope.icon}
                size={18}
                color={isSelected ? "#6366f1" : "#94a3b8"}
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.scopeOptionText, isSelected && styles.scopeOptionTextActive]}>
                {scope.label}
              </Text>
              {isSelected && (
                <Icon name="check-circle" size={18} color="#6366f1" style={{ marginLeft: "auto" }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose}>
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Change Password Modal ---
function ChangePasswordModal({ onClose, setResultCard, onChange }: any) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.requestPasswordChangeOtp(oldPassword);
      if (!response.data?.success) {
        setResultCard({
          visible: true,
          type: "error",
          message: response.data?.message || "Error changing password."
        });
        onClose();
        return;
      }
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
      if (!response.data?.success) {
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
    } catch (err: any) {
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
          <Text style={{ marginBottom: 12, color: "#cbd5e1" }}>
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
function LinkedAccountModal({ onClose, onChange, setResultCard }: any) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState(1);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await profileApi.getLinkedAccounts();
        setEmail((res.data as any)?.email || "");
      } catch (err) {
        setEmail("");
      }
    })();
  }, []);

  const handleRequestOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.requestEmailChange(currentPassword, newEmail);
      if (!(response.data as any)?.success) {
        setResultCard({ 
          visible: true, 
          type: "error", 
          message: (response as any)?.data?.message || "Error changing email." 
        });
        onClose(); 
        return;
      }
      setLoading(false);
      setStage(2);
    } catch (err: any) {
      setResultCard({ 
        visible: true, 
        type: "error", 
        message: err?.response?.data?.message || "Failed to send OTP." 
      });
      onClose(); 
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const response = await profileApi.verifyEmailChange(otp);
      if (!(response.data as any)?.success) {
        setResultCard({ 
          visible: true, 
          type: "error", 
          message: (response.data as any)?.message || "Error changing email." 
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
      setResultCard({ visible: true, type: "success", message: "Email successfully updated!" });
      onChange?.();
      onClose(); 
    } catch (err: any) {
      setResultCard({ 
        visible: true, 
        type: "error", 
        message: err?.response?.data?.message || "Failed to update email." 
      });
      onClose(); 
    }
  };

  return (
    <View style={styles.glassyInner}>
      <Text style={styles.sheetTitle}>Change Email</Text>
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
        <Text style={{ color: "#a1a1aa", fontWeight: "bold" }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Delete Account Modal ---
function DeleteAccountModal({ onClose, setResultCard, onSuccess }: any) {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    try {
      await profileApi.deleteAccount(); 
      setLoading(false);
      setStep(2);
      setResultCard({ visible: true, type: "success", message: "OTP sent to your email." });
    } catch (error: any) {
      setLoading(false);
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || error?.message || "Error sending OTP." });
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await profileApi.deleteAccountWithOtp(otp);
      setLoading(false);
      setResultCard({ visible: true, type: "success", message: "Account deleted!" });
      onClose();
      onSuccess();
    } catch (error: any) {
      setLoading(false);
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || error?.message || "Error deleting account." });
    }
  };

  return (
    <View style={styles.glassyInner}>
      <Text style={[styles.sheetTitle, { color: "#ef4444" }]}>Delete Account</Text>
      {step === 1 ? (
        <>
          <Text style={{ color: "#cbd5e1", marginBottom: 16, textAlign: "center", lineHeight: 22 }}>
            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
          </Text>
          <TouchableOpacity
            style={[styles.sheetSaveBtn, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }]}
            onPress={requestOtp}
            disabled={loading}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Sending OTP..." : "Yes, Delete My Account"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 12, color: "#cbd5e1", textAlign: "center" }}>
            Enter the OTP sent to your registered email to confirm account deletion:
          </Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="OTP"
            placeholderTextColor="#ef4444"
            value={otp}
            keyboardType="number-pad"
            onChangeText={setOtp}
          />
          <TouchableOpacity
            style={[styles.sheetSaveBtn, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }]}
            onPress={confirmDelete}
            disabled={loading || !otp}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading ? "Deleting..." : "Confirm Deletion"}
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

const settingSections = [
  {
    title: "Account",
    items: [
      { icon: "account-edit", label: "Edit Profile", route: "EditProfile" },
      { icon: "key", label: "Change Password", route: "ChangePassword" },
      { icon: "link", label: "Manage Linked Account", route: "LinkedAccount" },
      { icon: "account-multiple-plus", label: "Invite Friends", route: "InviteFriends" },
      { icon: "crown-outline", label: "StreakSphere+", route: "plus" },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { icon: "security", label: "Two-factor Authentication", route: "Enable2FA" },
      { icon: "devices", label: "Devices in which you are logged in", route: "Devices" },
      { icon: "account-cancel", label: "Blocked Users", route: "BlockedUsers" }, 
      { icon: "eye-outline", label: "Activity Posting Privacy", route: "ActivityPrivacy" }, // ⚡ Moved here
      { icon: "check-decagram", label: "Verify Yourself", route: "VerifySelf" },
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

export default function ProfileScreen({ navigation }: any) {
  const authContext = useContext(AuthContext);
  const user = authContext?.User?.user;
  const userId = user?.id;
  
  const [profile, setProfile] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const sheetRef = useRef<TrueSheet>(null);
  const logoutSheetRef = useRef<TrueSheet>(null);
  const relReqSheetRef = useRef<TrueSheet>(null); 
  const breakupSheetRef = useRef<TrueSheet>(null);

  const sheetDetents = useMemo(() => [0.65], []); 

  const openSheet = useCallback(async (type: string) => {
    await sheetRef.current?.dismiss();
    setActiveModal(type);
    await sheetRef.current?.present();
  }, []);

  const closeSheet = useCallback(async () => {
    await sheetRef.current?.dismiss();
    setActiveModal(null);
  }, []);

  const openRelReqSheet = () => relReqSheetRef.current?.present();
  const closeRelReqSheet = () => relReqSheetRef.current?.dismiss();

  const formatTimeRemaining = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  const offlineRef = useRef(false);
  const [offline, setOffline] = useState(false);

  const openLogoutSheet = async () => {
    await logoutSheetRef.current?.present();
  };

  const closeLogoutSheet = async () => {
    await logoutSheetRef.current?.dismiss();
  };

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
    if (offlineRef.current) return;

    try {
      const [profileRes, avatarRes, privacyRes] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getAvatarUrl(),
        profileApi.getActivityPrivacy().catch(() => null), // ⚡ Fetch privacy setting
      ]);
      
      const fetchedUser = (profileRes as any)?.data?.user;
      if (!fetchedUser) return;

      const { avatarThumbnailUrl, avatarUrl: fetchedAvatarUrl } = (avatarRes as any)?.data || {};
      const defaultVisibilityScope = (privacyRes as any)?.data?.defaultVisibilityScope || fetchedUser.defaultVisibilityScope || "world";
      
      const merged = { ...fetchedUser, avatarThumbnailUrl, avatarUrl: fetchedAvatarUrl, defaultVisibilityScope };
      
      setProfile(merged);
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(merged));
      
    } catch (e: any) {
      console.log("[Profile] fetchProfileOnline error — keeping cache:", e?.message);
    }
  }, []); 

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (raw && isMounted) {
          setProfile(JSON.parse(raw));
        }
      } catch {}
      
      fetchProfileOnline();
    })();
    return () => { isMounted = false; };
  }, [fetchProfileOnline]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileOnline();
    }, [fetchProfileOnline])
  );

  useEffect(() => {
    const loadAvatarFromManager = async () => {
      if (!profile?._id) return;
      
      const rawUrl = profile?.avatarUrl || profile?.avatarThumbnailUrl;
      
      if (!rawUrl || rawUrl.trim() === '' || rawUrl === 'null' || rawUrl === 'undefined') {
        setLocalAvatarUri(null);
        return;
      }

      const localPath = await getAvatar(profile._id, rawUrl, profile.avatarVersion);
      setLocalAvatarUri(localPath); 
    };
    loadAvatarFromManager();
  }, [profile?._id, profile?.avatarUrl, profile?.avatarThumbnailUrl, profile?.avatarVersion]);

  const confirmLogout = async () => {
    const userData = authContext?.User;
    
    // ⚡ FIX: Removed the `userData.Password` check. 
    // We only need the ID and Username now to save the UI profile!
    if (userData?.user?.id && userData?.UserName) {
      await SavedAccountsStorage.save({
        id: userData.user.id,
        username: userData.UserName,
        name: userData.user.name || userData.UserName,
        avatarUrl: finalAvatarUri || null,
        avatarVersion: profile?.avatarVersion || 1,
      });
    }

    // ⚡ 1. FORCE UNREGISTER PUSH TOKEN BEFORE LOGGING OUT
    try {
      const firebaseApp = getApp();
      const messagingInstance = getMessaging(firebaseApp);
      const currentToken = await getToken(messagingInstance);
      
      if (currentToken) {
        // Call your backend to delete this specific token from the database
        await apiClient.post('/push/unregister', { token: currentToken, platform: Platform.OS });

      }
    } catch (e) {
      console.log("Failed to unregister push token:", e);
    }

    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    
    // Note: If your `logout(userId)` function calls the backend to delete the 
    // refresh token, the Saved Accounts screen will force the user to enter a 
    // password next time. If you want seamless 1-tap login from Saved Accounts, 
    // you should ONLY clear local UserStorage here, and NOT hit the backend logout API.
    //await logout(userId); 
    
    disconnectSocket();
    authContext?.setUser(null);
    UserStorage.clearTokens();
    UserStorage.deleteUser();
    navigation.replace("SavedAccounts");
  };

  const handleDeleteSuccess = async () => {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    authContext?.setUser(null);
    UserStorage.clearTokens();
    setTimeout(() => {
      navigation.replace("Login");
    }, 1400);
  };

  const handleAcceptRequest = async (targetId: string) => {
    try {
      setActionLoading(true);
      await apiClient.post(`/relationship/accept/${targetId}`);
      await fetchProfileOnline(); 
    } catch (error: any) {
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || "Error accepting request." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async (targetId: string) => {
    try {
      setActionLoading(true);
      await apiClient.post(`/relationship/cancel/${targetId}`);
      await fetchProfileOnline();
    } catch (error: any) {
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || "Error cancelling request." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendRelationship = async (instant: boolean) => {
    try {
      breakupSheetRef.current?.dismiss();
      setActionLoading(true);
      await apiClient.post(`/relationship/remove`, { instant });
      await fetchProfileOnline();
    } catch (error: any) {
      setResultCard({ visible: true, type: "error", message: error?.response?.data?.message || "Error suspending relationship." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreRelationship = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(`/relationship/restore`);
      await fetchProfileOnline();
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Error restoring relationship.";
      setResultCard({ visible: true, type: "error", message: msg });
      if (msg.includes("expired")) await fetchProfileOnline();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePartnerClick = () => {
    if (profile?.partner?._id) {
      navigation.push("ProfilePreview", {
        userId: profile.partner._id,
        name: profile.partner.name,
      });
    }
  };

  let daysTogether = 0;
  if (profile?.partner && profile?.partnerSince) {
    const msInDay = 24 * 60 * 60 * 1000;
    daysTogether = Math.floor((Date.now() - new Date(profile.partnerSince).getTime()) / msInDay);
  }
  const isSuspended = !!profile?.partnerGracePeriodEnd;

  const incomingReqs = Array.isArray(profile?.relationshipIncoming) ? profile.relationshipIncoming : [];
  const hasIncoming = incomingReqs.length > 0;

  const finalAvatarUri = localAvatarUri ? `${localAvatarUri}?v=${profile?.avatarVersion || 1}` : null;
  const anyPremium = profile?.isPremium || profile?.partner?.isPremium;

  const renderActionModal = () => {
    return (
      <TrueSheet
        ref={sheetRef}
        detents={sheetDetents}
        cornerRadius={30}
        backgroundColor="#0F172A"
        grabber={false}
        onDismiss={() => setActiveModal(null)}
      >
        <View style={{ padding: 20 }}>
          {activeModal === "EditProfile" && (
            <EditProfileModal
              user={profile}
              onClose={closeSheet}
              setResultCard={setResultCard}
              onChange={fetchProfileOnline}
            />
          )}

          {activeModal === "ActivityPrivacy" && (
            <ActivityPrivacyModal
              currentScope={profile?.defaultVisibilityScope}
              onClose={closeSheet}
              onChange={async (newScope: string) => {
                setProfile((prev: any) => ({ ...prev, defaultVisibilityScope: newScope }));
                await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ...profile, defaultVisibilityScope: newScope }));
              }}
            />
          )}

          {activeModal === "ChangePassword" && (
            <ChangePasswordModal
              onClose={closeSheet}
              setResultCard={setResultCard}
              onChange={fetchProfileOnline}
            />
          )}

          {activeModal === "ChangeNumber" && (
            <ChangeNumberModal
              user={profile}
              onClose={closeSheet}
              setResultCard={setResultCard}
            />
          )}

          {activeModal === "LinkedAccount" && (
            <LinkedAccountModal
              onClose={closeSheet}
              onChange={fetchProfileOnline}
              setResultCard={setResultCard} 
            />
          )}

          {activeModal === "DeleteAccount" && (
            <DeleteAccountModal
              onClose={closeSheet}
              setResultCard={setResultCard}
              onSuccess={handleDeleteSuccess}
            />
          )}
        </View>
      </TrueSheet>
    );
  };

  const renderLogoutSheet = () => {
    return (
      <TrueSheet
        ref={logoutSheetRef}
        detents={[0.3]}
        cornerRadius={28}
        backgroundColor="#0F172A"
        grabber={false}
      >
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#F9FAFB", fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            Confirm Logout
          </Text>
          <Text style={{ color: "#9CA3AF", textAlign: "center", marginBottom: 25 }}>
            Are you sure you want to logout from your account?
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#ef4444", width: "100%", padding: 14, borderRadius: 14, marginBottom: 10, alignItems: "center" }}
            onPress={async () => {
              await closeLogoutSheet();
              confirmLogout();
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: "rgba(148,163,184,0.25)", width: "100%", padding: 14, borderRadius: 14, alignItems: "center" }}
            onPress={closeLogoutSheet}
          >
            <Text style={{ color: "#CBD5E1", fontWeight: "bold" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TrueSheet>
    );
  };

  const renderRelReqSheet = () => {
    return (
      <TrueSheet
        ref={relReqSheetRef}
        detents={[0.5, 0.8]}
        cornerRadius={24}
        backgroundColor="#0F172A"
        grabber={false}
      >
        <View style={{ flex: 1, padding: 20 }}> 
          <Text style={{ color: "#F9FAFB", fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
            Relationship Requests
          </Text>
          
          {incomingReqs.length === 0 ? (
            <Text style={{ color: "#9CA3AF", textAlign: "center", marginTop: 20 }}>
              No pending requests.
            </Text>
          ) : (
            <View style={{ flex: 1 }}>
              {incomingReqs.map((req: any, index: number) => {
                const reqUser = req.user || req; 
                
                return (
                  <View key={reqUser?._id || index} style={styles.reqCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                      {reqUser.avatarUrl ? (
                        <Image 
                          source={{ uri: reqUser.avatarUrl.startsWith("http") ? reqUser.avatarUrl : newUrl + reqUser.avatarUrl }} 
                          style={styles.reqAvatar} 
                        />
                      ) : (
                        <View style={styles.reqAvatarFallback}>
                          <Icon name="account" size={24} color="#6366f1" />
                        </View>
                      )}
                      
                      <View style={styles.textContainer}>
                        <Text style={{ color: "#F9FAFB", fontSize: 16, fontWeight: "bold" }}>
                          {reqUser.name || "Unknown"}
                        </Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
                          @{reqUser.username || "user"}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity 
                        style={styles.reqBtnAccept} 
                        onPress={() => {
                          handleAcceptRequest(reqUser._id);
                          closeRelReqSheet();
                        }}
                      >
                        <Icon name="check" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.reqBtnDecline} 
                        onPress={() => handleCancelRequest(reqUser._id)}
                      >
                        <Icon name="close" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </TrueSheet>
    );
  };

  return (
    <MainLayout hideNavBar={true}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.overlay} showsVerticalScrollIndicator={false}>
        
        {/* AVATAR & NAME CARD */}
        <View style={styles.mainCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {finalAvatarUri ? (
                <View style={styles.avatarMask}>
                 <FastImage
                    style={styles.avatarImageZoomed}
                    source={{
                      uri: finalAvatarUri,
                      priority: FastImage.priority.high,
                    }}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                </View>
              ) : (
                <Icon name="account" size={70} color="#94a3b8" />
              )}
              <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AvatarCreator')}>
                <Icon name="pencil" size={17} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Text style={styles.userName}>{profile?.name}</Text>
              {profile?.tick === "verified" && (
                <Icon name="check-decagram" size={20} color="#3b82f6" style={{ marginLeft: 7, marginTop: 2 }} />
              )}
              {profile?.tick === "golden" && (
                <Icon name="check-decagram" size={20} color="#fbbf24" style={{ marginLeft: 5, marginTop: 7 }} />
              )}
              {profile?.isPremium && (
                <Icon name="star-circle" size={20} color="#fbbf24" style={{ marginLeft: 5, marginTop: 7 }} />
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
              <Text style={styles.userUsername}>@{profile?.username}</Text>
            </View>
          </View>
        </View>

        {/* RELATIONSHIP STATUS SECTION */}
        <Text style={styles.sectionTitle}>Relationship Status</Text>
        <View style={styles.relationshipCard}>
          {profile?.partner ? (
            <View>
              <View style={styles.pillRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handlePartnerClick}
                  style={[
                    styles.relationshipPill, 
                    isSuspended && styles.relationshipPillSuspended
                  ]}
                >
                  {!isSuspended ? (
                    <Icon name="cards-heart" size={16} color="#f43f5e" />
                  ) : (
                    <Text style={{ fontSize: 14, marginRight: 4, includeFontPadding: false }}>❤️‍🩹</Text>
                  )}
                  <Text style={[
                    styles.relationshipText, 
                    isSuspended && styles.relationshipTextSuspended
                  ]}>
                    {isSuspended 
                      ? `With ${profile.partner?.name || "Partner"} • ${formatTimeRemaining(profile.partnerGracePeriodEnd)} left` 
                      : `With ${profile.partner?.name || "Partner"} • ${daysTogether}d`}
                  </Text>
                </TouchableOpacity>
              </View>

              {!isSuspended ? (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.btnDanger]} 
                  onPress={() => anyPremium ? breakupSheetRef.current?.present() : handleSuspendRelationship(false)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator size="small" color="#f87171" /> : (
                    <>
                      <Icon name="heart-broken" size={18} color="#f87171" />
                      <Text style={styles.btnTextDanger}>
                        {anyPremium ? "Break Up Options" : "Break-up (Start 24h Timer)"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.btnSuccess]} 
                  onPress={handleRestoreRelationship}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator size="small" color="#34d399" /> : (
                    <>
                      <Icon name="heart-pulse" size={18} color="#34d399" />
                      <Text style={styles.btnTextSuccess}>Patch-up Relationship</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

          ) : (
            <View>
              <View style={[styles.pillRow, { justifyContent: "space-between", alignItems: "center" }]}>
                <View style={[styles.relationshipPill, styles.relationshipPillEmpty]}>
                  <Icon name="heart-outline" size={16} color="#94a3b8" />
                  <Text style={[styles.relationshipText, { color: "#94a3b8" }]}>No one</Text>
                </View>

                {hasIncoming && (
                <TouchableOpacity onPress={openRelReqSheet} style={{ paddingHorizontal: 8 }}>
                  <Text style={{ 
                    color: hasIncoming ? "#f87171" : "#F9FAFB", 
                    fontWeight: "bold", 
                    fontSize: 14 
                  }}>
                    See all reqs {hasIncoming ? `(${incomingReqs.length})` : ""}
                  </Text>
                </TouchableOpacity>
                )}
              </View>
              <Text style={styles.helperText}>Visit his/hers profile to send them request.</Text>
            </View>
          )}
        </View>

        {/* SETTINGS SECTIONS */}
        {settingSections.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(item => (
              <TouchableOpacity
                key={item.route}
                style={[
                  styles.settingCard,
                  item.disabled && { opacity: 0.5 }
                ]}
                disabled={item.disabled}
                onPress={() => {
                  if (!item.disabled) {
                    if (["Enable2FA", "Devices", "HelpSupport", "ReportProblem", "LegalPolicy", "BlockedUsers", "VerifySelf", "plus", "InviteFriends"].includes(item.route)) {
                      navigation.navigate(item.route);
                    } else {
                      openSheet(item.route);
                    }
                  }
                }}
                activeOpacity={item.disabled ? 1 : 0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name={item.icon} size={24} color={item.disabled ? "#A855F7" : "#A855F7"} />
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  {item.disabled && (
                    <Text style={{ color: "#64748b", fontWeight: "600", marginLeft: 9 }}>Coming soon</Text>
                  )}
                </View>
                
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {item.route === "BlockedUsers" && profile?.blockedUsers?.length > 0 && (
                    <View style={styles.blockedBadge}>
                      <Text style={styles.blockedBadgeText}>
                        {profile.blockedUsers.length}
                      </Text>
                    </View>
                  )}
                  <Icon name="chevron-right" size={22} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={openLogoutSheet} >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => openSheet("DeleteAccount")}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>

      <GlassyResultCard
        visible={resultCard.visible}
        type={resultCard.type}
        message={resultCard.message}
        onClose={() => setResultCard({ ...resultCard, visible: false })}
      />
      {renderActionModal()}
      {renderLogoutSheet()}
      {renderRelReqSheet()}

      <TrueSheet
        ref={breakupSheetRef}
        detents={[0.4]}
        cornerRadius={30}
        backgroundColor="#0F172A"
        grabber={false}
      >
        <View style={{ padding: 24, paddingBottom: 40 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Icon name="heart-broken" size={36} color="#f87171" style={{ marginBottom: 8 }} />
            <Text style={styles.sheetTitle}>End Relationship</Text>
            <Text style={{ color: "#9ca3b8", textAlign: "center" }}>
              As a StreakSphere+ member, how do you want to handle this?
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.sheetOptionRow} 
            onPress={() => handleSuspendRelationship(false)}
          >
            <Icon name="timer-sand" size={22} color="#fbbf24" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionText, { color: "#fbbf24" }]}>Suspend (36h Timer)</Text>
              <Text style={{ color: "#9ca3b8", fontSize: 12, marginTop: 2 }}>You can restore the streak within 36 hours.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sheetOptionRow} 
            onPress={() => handleSuspendRelationship(true)}
          >
            <Icon name="lightning-bolt" size={22} color="#f87171" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionText, { color: "#f87171" }]}>Break Up Instantly</Text>
              <Text style={{ color: "#9ca3b8", fontSize: 12, marginTop: 2 }}>Skip the timer. Move to history immediately.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </TrueSheet>
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
  
  blockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8
  },
  blockedBadgeText: {
    color: "#b4b1b1",
    fontSize: 13,
    fontWeight: "bold"
  },

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
  
  resultOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,41,59,0.45)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  resultCard: { backgroundColor: "rgba(15,23,42,0.94)", borderColor: "#fff", borderWidth: 1, borderRadius: 24, padding: 26, width: 270, alignItems: "center" },
  resultMessage: { fontSize: 17, fontWeight: "bold", textAlign: "center", marginBottom: 18, marginTop: 2 },
  resultOkBtn: { backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 34, marginTop: 2 },
  
  glassyInner: { width: "100%", paddingTop: 10, paddingBottom: 20 },
  sheetTitle: { color: "#F9FAFB", fontSize: 19, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  inputLabel: {
    color: "#94a3b8", fontSize: 12, fontWeight: "600",
    marginBottom: 4, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5, alignSelf: "flex-start"
  },
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

  relationshipCard: {
    backgroundColor: "rgba(30,41,59,0.4)", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.15)", marginBottom: 16, width: "100%",
  },
  scopeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30,41,59,0.4)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
  },
  scopeOptionRowActive: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderColor: "rgba(99,102,241,0.4)",
  },
  scopeOptionText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  scopeOptionTextActive: {
    color: "#F9FAFB",
    fontWeight: "700",
  },
  pillRow: { flexDirection: "row", marginBottom: 12 },
  relationshipPill: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(244,63,94,0.12)",
    borderWidth: 1, borderColor: "rgba(244,63,94,0.3)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  relationshipPillEmpty: { backgroundColor: "rgba(148,163,184,0.08)", borderColor: "rgba(148,163,184,0.2)" },
  relationshipPillSuspended: { backgroundColor: "rgba(249, 115, 22, 0.15)", borderColor: "rgba(249, 115, 22, 0.4)" },
  relationshipText: { color: "#fda4af", fontSize: 13, fontWeight: "700" },
  relationshipTextSuspended: { color: "#fdba74" },
  helperText: { color: "#64748b", fontSize: 12, lineHeight: 16, paddingHorizontal: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  btnDanger: { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(248,113,113,0.3)" },
  btnTextDanger: { color: "#f87171", fontWeight: "700", fontSize: 13 },
  btnSuccess: { backgroundColor: "rgba(52,211,153,0.1)", borderColor: "rgba(52,211,153,0.3)" },
  btnTextSuccess: { color: "#34d399", fontWeight: "700", fontSize: 13 },

  reqCard: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "rgba(30,41,59,0.5)", 
    padding: 12, 
    borderRadius: 16, 
    marginBottom: 10, 
    width: "100%", 
    minHeight: 70, 
    borderWidth: 1, 
    borderColor: "rgba(148,163,184,0.15)" 
  },
  textContainer: { 
    marginLeft: 12, 
    flex: 1,           
    flexShrink: 1,     
    justifyContent: "center",
    overflow: "hidden" 
  },
  reqAvatar: { width: 44, height: 44, borderRadius: 22 },
  reqAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(99,102,241,0.15)", justifyContent: "center", alignItems: "center" },
  reqBtnAccept: { backgroundColor: "#10b981", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  reqBtnDecline: { backgroundColor: "#ef4444", width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  
  sheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
  },
  sheetOptionText: {
    fontSize: 16,
    fontWeight: "700",
  },
});