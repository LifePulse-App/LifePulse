// src/screens/auth/SuspendedScreen.tsx
import React, { useContext, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AuthContext from './src/auth/user/UserContext';
import SavedAccountsStorage from './src/auth/user/SavedAccountsStorage';
import { logout } from './src/navigation/main/RootNavigation';
import { disconnectSocket } from './src/auth/api-client/socket';
import UserStorage from './src/auth/user/UserStorage';
import apiClient from './src/auth/api-client/api_client';
import MainLayout from './src/shared/components/MainLayout';

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

export default function SuspendedScreen({ route, navigation }: any) {
  // ⚡ Ensure your backend includes `appealDetails` in the 403 error payload!
  const { reason, liftAt, isBanned, appealDetails } = route.params || {};
  
  // Track appeal state locally so it updates immediately after submitting
  const [appealState, setAppealState] = useState(appealDetails || { status: 'none' });
  const [appealText, setAppealText] = useState('');
  
  // ⚡ NEW: Control when to show the text input form
  const [showAppealForm, setShowAppealForm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });
  
  const authContext = useContext(AuthContext);
  const userData = authContext?.User;

  const handleLogout = async () => {
    if (userData?.user?.id && userData?.UserName && userData?.Password) {
      await SavedAccountsStorage.save({
        id: userData.user.id,
        username: userData.UserName,
        password: userData.Password,
        user: userData,
      });
    }
    await logout(userData?.user?.id);
    disconnectSocket();
    authContext?.setUser(null);
    await UserStorage.clearTokens();
    await UserStorage.deleteUser();
    navigation.replace("SavedAccounts");
  };

  const submitAppeal = async () => {
    if (!appealText.trim()) {
      setResultCard({ visible: true, type: "error", message: "Please enter an explanation for your appeal." });
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/moderate/user/appeal', { appealText });
      if (res.data.success) {
        // ⚡ Update UI to "Pending" instantly without reloading
        setAppealState({ status: 'pending', text: appealText });
        setAppealText('');
        setShowAppealForm(false); // Hide the form once submitted
      }
    } catch (e: any) {
      setResultCard({ 
        visible: true, 
        type: "error", 
        message: e?.response?.data?.message || e?.message || "Failed to submit appeal." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout hideNavBar={true}>
      <StatusBar barStyle="light-content" backgroundColor="#03040A" translucent={true} />
      <View style={styles.topBar}>
        <View style={styles.rightSpacer} />
        <Text style={styles.pageTitle}>Account Restriction</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView style={styles.overlay} showsVerticalScrollIndicator={false}>
        
        {/* WARNING ICON & TITLE CARD */}
        <View style={styles.mainCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <View style={styles.avatarMask}>
                <Icon name={isBanned ? "shield-alert" : "clock-alert-outline"} size={45} color="#ef4444" />
              </View>
            </View>
            <Text style={styles.userName}>
              {isBanned ? 'Account Banned' : 'Account Suspended'}
            </Text>
            <Text style={styles.userUsername}>
              {isBanned ? 'Your access has been permanently revoked.' : 'Your account has temporary restrictions.'}
            </Text>
          </View>
        </View>

        {/* REASON SECTION */}
        <View style={styles.relationshipCard}>
          <Text style={styles.inputLabel}>Reason for restriction</Text>
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>
              {reason || 'Violation of community guidelines.'}
            </Text>
          </View>

          {!isBanned && liftAt && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, gap: 6 }}>
              <Icon name="timer-sand" size={16} color="#fbbf24" />
              <Text style={{ color: "#fbbf24", fontSize: 13, fontWeight: "600" }}>
                Restricted until: {new Date(liftAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* APPEAL SECTION (Dynamic based on state) */}
        {!isBanned && (
          <>
            <Text style={styles.sectionTitle}>Appeal Center</Text>
            <View style={styles.relationshipCard}>
              
              {/* STATE 1: APPEAL PENDING */}
              {appealState?.status === 'pending' ? (
                <View style={styles.pendingBox}>
                  <Icon name="clock-fast" size={32} color="#818cf8" style={{ marginBottom: 8 }} />
                  <Text style={styles.pendingTitle}>Appeal Under Review</Text>
                  <Text style={styles.pendingText}>
                    Your appeal has been successfully submitted. Our moderation team will review your case shortly. Please allow up to 24-48 hours for processing.
                  </Text>
                </View>
              ) 
              
              /* STATE 2: APPEAL REJECTED / REVIEWED */
              : appealState?.status === 'rejected' || appealState?.status === 'reviewed' ? (
                <View style={styles.rejectedBox}>
                  <Icon name="close-octagon" size={32} color="#f87171" style={{ marginBottom: 8 }} />
                  <Text style={styles.rejectedTitle}>Appeal Denied</Text>
                  <Text style={styles.rejectedText}>
                    After reviewing your account activity, the moderation team has decided to uphold the suspension.
                  </Text>
                  
                  {appealState?.response && (
                    <View style={styles.moderatorResponseBox}>
                      <Text style={styles.inputLabel}>Moderator Note:</Text>
                      <Text style={styles.moderatorResponseText}>{appealState.response}</Text>
                    </View>
                  )}
                </View>
              ) 
              
              /* STATE 3: NO APPEAL YET (SHOW FORM OR BUTTON) */
              : (
                <>
                  {!showAppealForm ? (
                    // ⚡ Before clicking: Show a clean button
                    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                      <Text style={{ color: "#94a3b8", fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
                        If you believe this restriction was a mistake, you can submit an appeal for review.
                      </Text>
                      <TouchableOpacity 
                        style={styles.sheetSaveBtn} 
                        onPress={() => setShowAppealForm(true)}
                      >
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>Write an Appeal</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // ⚡ After clicking: Show the text input and submit/cancel buttons
                    <>
                      <Text style={styles.inputLabel}>Explanation</Text>
                      <TextInput
                        style={styles.sheetInputArea}
                        placeholder="Explain why this action should be reversed..."
                        placeholderTextColor="#87878b"
                        multiline
                        autoFocus={true}
                        value={appealText}
                        onChangeText={setAppealText}
                      />
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                        <TouchableOpacity 
                          style={[styles.sheetSaveBtn, { flex: 1, backgroundColor: "rgb(127, 137, 151)" }]} 
                          onPress={() => setShowAppealForm(false)} 
                          disabled={loading}
                        >
                          <Text style={{ color: "#ffffff", fontWeight: "bold" }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.sheetSaveBtn, { flex: 2 }]} 
                          onPress={submitAppeal} 
                          disabled={loading}
                        >
                          <Text style={{ color: "#fff", fontWeight: "bold" }}>
                            {loading ? "Submitting..." : "Send Appeal"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      <GlassyResultCard
        visible={resultCard.visible}
        type={resultCard.type}
        message={resultCard.message}
        onClose={() => setResultCard({ ...resultCard, visible: false })}
      />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, paddingTop: 30, paddingHorizontal: 18 },
  mainCard: { backgroundColor: "transparent", borderRadius: 22, padding: 5, marginBottom: 3, alignItems: "center" },
  avatarWrap: { marginBottom: 14, alignItems: "center" },
  avatarCircle: { width: 95, height: 95, borderRadius: 48, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", justifyContent: "center", alignItems: "center" },
  avatarMask: { width: 95, height: 95, borderRadius: 48, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  userName: { color: "#F9FAFB", fontWeight: "bold", fontSize: 18, marginTop: 10 },
  userUsername: { color: "#9CA3AF", fontSize: 13, marginTop: 2, textAlign: "center" },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: "#F9FAFB", marginTop: 16, marginBottom: 5 },
  
  inputLabel: {
    color: "#94a3b8", fontSize: 12, fontWeight: "600",
    marginBottom: 4, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5, alignSelf: "flex-start"
  },
  
  sheetInputArea: { 
    backgroundColor: "rgba(30,41,59,0.65)", color: "#F9FAFB", borderRadius: 13, 
    padding: 14, fontSize: 15, width: "100%", marginBottom: 12, marginTop: 2, 
    height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.2)" 
  },
  
  sheetSaveBtn: {
    backgroundColor: "#6366f1", borderRadius: 15, paddingVertical: 13, alignItems: "center",
    width: "100%",
    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 7,
  },

  logoutBtn: { backgroundColor: "#ef4444", borderRadius: 20, paddingVertical: 12, alignItems: 'center', marginTop: 22, marginBottom: 10 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  
  topBar: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },
  
  resultOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(30,41,59,0.45)", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  resultCard: { backgroundColor: "rgba(15,23,42,0.94)", borderColor: "#fff", borderWidth: 1, borderRadius: 24, padding: 26, width: 270, alignItems: "center" },
  resultMessage: { fontSize: 17, fontWeight: "bold", textAlign: "center", marginBottom: 18, marginTop: 2 },
  resultOkBtn: { backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 34, marginTop: 2 },
  
  relationshipCard: {
    backgroundColor: "rgba(30,41,59,0.4)", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.15)", marginBottom: 16, width: "100%",
  },
  
  reasonBox: {
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", width: "100%", marginTop: 4
  },
  reasonText: { color: "#f87171", fontSize: 14, fontWeight: "600", lineHeight: 20 },

  // ⚡ New Pending Appeal Styles
  pendingBox: {
    backgroundColor: "rgba(99,102,241,0.08)", borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: "rgba(99,102,241,0.25)", width: "100%", alignItems: "center"
  },
  pendingTitle: { color: "#a5b4fc", fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  pendingText: { color: "#818cf8", fontSize: 13, textAlign: "center", lineHeight: 20 },

  // ⚡ New Rejected Appeal Styles
  rejectedBox: {
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", width: "100%", alignItems: "center"
  },
  rejectedTitle: { color: "#fca5a5", fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  rejectedText: { color: "#f87171", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 12 },
  
  moderatorResponseBox: {
    backgroundColor: "rgba(15,23,42,0.6)", borderRadius: 10, padding: 12, width: "100%",
    borderLeftWidth: 3, borderLeftColor: "#ef4444", marginTop: 8
  },
  moderatorResponseText: { color: "#cbd5e1", fontSize: 13, fontStyle: "italic", marginTop: 4 }
});