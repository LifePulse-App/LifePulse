import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import profileApi from "../services/api_profile";
import GlassyResultCard from "./GlassyConfirmModal"; // <-- Make sure this is GlassyResultCard

const EditProfileScreen = ({ navigation }: any) => {
  const [profileData, setProfileData] = useState({ name: "", username: "" });
  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  const handleEditProfile = async () => {
    try {
      await profileApi.editProfile(profileData);
      setResultCard({ visible: true, type: "success", message: "Profile updated!" });
      setTimeout(() => {
        setResultCard({ ...resultCard, visible: false });
        navigation.goBack();
      }, 1200);
    } catch (error) {
      setResultCard({ visible: true, type: "error", message: "Error updating profile." });
    }
  };

  return (
    <View style={styles.glassyMain}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconGlass}>
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit Profile</Text>
        <View style={styles.rightSpacer} />
      </View>
      <View style={styles.avatarCircleBig}>
        <Icon name="account-circle" size={90} color="#6366f1" />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="#6366f1"
        value={profileData.name}
        onChangeText={name => setProfileData({ ...profileData, name })}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#6366f1"
        value={profileData.username}
        onChangeText={username => setProfileData({ ...profileData, username })}
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleEditProfile}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Save</Text>
      </TouchableOpacity>
      <GlassyResultCard
        visible={resultCard.visible}
        type={resultCard.type}
        message={resultCard.message}
        onClose={() => setResultCard({ ...resultCard, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  glassyMain: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    alignItems: "center",
    padding: 30,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(30,41,59,0.36)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  pageTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#F9FAFB",
  },
  rightSpacer: { width: 40, height: 40 },
  avatarCircleBig: {
    width: 104,
    height: 104,
    borderRadius: 56,
    backgroundColor: "#272747",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 36,
    marginTop: 12,
  },
  input: {
    backgroundColor: "rgba(30,41,59,0.65)",
    color: "#F9FAFB",
    borderRadius: 11,
    padding: 16,
    fontSize: 16,
    width: "100%",
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    marginBottom: 30,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 7,
  },
});

export default EditProfileScreen;