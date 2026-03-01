import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import profileApi from '../services/api_profile'; // Your API
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../auth/api-client/api_client';

// Glassy Result Card Component
const GlassyResultCard = ({ visible, type = "success", message, onClose }: any) => {
  if (!visible) return null;
  return (
    <View style={resultStyles.overlay}>
      <View style={resultStyles.card}>
        <Text style={[
          resultStyles.message,
          { color: type === "error" ? "#ef4444" : "#22c55e" }
        ]}>{message}</Text>
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

// Set your backend base (for local avatars, adjust as needed)
const baseUrl = apiClient.getBaseURL(); // Example: "http://localhost:40000/api"
const BASE_SERVER_URL = baseUrl.replace(/\/api\/?$/, "");

export default function ProfilePicUploaderScreen() {
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Glassy message state!
  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  // Load current avatar from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await profileApi.getAvatarUrl();
        setAvatarUrl(res?.data?.avatarUrl ?? null);
      } catch (e) {
        setAvatarUrl(null);
      }
    };
    load();
  }, []);

  const pickPhoto = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (res.didCancel) return;
    if (res.errorCode) {
      setResultCard({ visible: true, type: "error", message: res.errorMessage || 'Failed to pick image' });
      return;
    }
    if (res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
  };

  const uploadPhoto = async () => {
    if (!photoUri) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
      const uploadRes = await profileApi.updateAvatarImage(formData);
      setAvatarUrl(uploadRes?.data?.url ?? null);
      setPhotoUri(null);
      setResultCard({ visible: true, type: "success", message: "Profile photo updated!" });
      setTimeout(() => {
        setResultCard({ visible: false, type: "success", message: "" });
        navigation.goBack();
      }, 1400);
    } catch (e) {
      setResultCard({ visible: true, type: "error", message: e?.message || 'Error uploading photo. Try again later.' });
    }
    setUploading(false);
  };

  const deleteAvatar = async () => {
    try {
      await profileApi.deleteAvatar();
      setPhotoUri(null);
      setAvatarUrl(null);
      setResultCard({ visible: true, type: "success", message: "Profile picture removed!" });
    } catch (e) {
      setResultCard({ visible: true, type: "error", message: e?.message || 'Failed to remove profile photo.' });
    }
  };

  // Compose image url for local uploads (if needed)
  const avatarDisplayUrl =
    photoUri ||
    (avatarUrl
      ? BASE_SERVER_URL + avatarUrl
      : null);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Upload Profile Pic</Text>
        <View style={styles.rightSpacer} />
      </View>
      <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} activeOpacity={0.95}>
        {avatarDisplayUrl ? (
          <Image
            style={styles.avatar}
            source={{ uri: avatarDisplayUrl }}
            resizeMode="cover"
          />
        ) : (
          <Icon name="account-circle-outline" size={120} color="#6366f1" />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.saveBtn, { opacity: photoUri ? 1 : 0.5 }]}
        onPress={uploadPhoto}
        disabled={!photoUri || uploading}
      >
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Upload</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnTxt}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={deleteAvatar}>
        <Text style={styles.deleteBtnTxt}>Remove Profile Picture</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Tap the avatar above to choose a new photo.</Text>
      <GlassyResultCard
        visible={resultCard.visible}
        type={resultCard.type}
        message={resultCard.message}
        onClose={() => setResultCard({ visible: false, type: resultCard.type, message: "" })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center', paddingTop: 56 },
  header: { fontSize: 19, color: '#fff', fontWeight: 'bold', marginBottom: 36 },
  avatarWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: { width: 140, height: 140, borderRadius: 70 },
  saveBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 18,
    marginTop: 22,
    marginBottom: 6,
  },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { paddingHorizontal: 32, paddingVertical: 11, marginTop: 6 },
  cancelBtnTxt: { color: '#6b7280', fontWeight: 'bold', fontSize: 15 },
  deleteBtn: {
    marginTop: 10,
    paddingHorizontal: 32,
    paddingVertical: 11,
    backgroundColor: '#EF4444',
    borderRadius: 18,
  },
  deleteBtnTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },
  hint: { color: '#a1a1aa', marginTop: 12, fontSize: 13 },
  topBar: { flexDirection: "row", alignItems: "center", marginTop: 3, marginBottom: 30 },
  iconGlass: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.0)",
    borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center", alignItems: "center", marginRight: 0,
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10, elevation: 4, marginLeft: 12, marginTop: 5
  },
});