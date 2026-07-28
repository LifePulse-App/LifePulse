import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-crop-picker'; // Switched to crop-picker
import profileApi from '../services/api_profile'; 
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../auth/api-client/api_client';
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_CACHE_KEY = 'sbjkshiuhuw';

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

const baseUrl = apiClient.getBaseURL(); 
const BASE_SERVER_URL = baseUrl.replace(/\/api\/?$/, "");

export default function ProfilePicUploaderScreen() {
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [resultCard, setResultCard] = useState({ visible: false, type: "success", message: "" });

  useEffect(() => {
    const load = async () => {
      // 1. Load instantly from cache
      try {
        const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.avatarUrl || parsed?.avatarThumbnailUrl) {
            setAvatarUrl(parsed.avatarUrl || parsed.avatarThumbnailUrl);
          }
        }
      } catch (e) {}

      // 2. Fetch fresh from backend
      try {
        const res = await profileApi.getAvatarUrl();
        if (res?.data?.avatarUrl) {
          setAvatarUrl(res.data.avatarUrl);
        }
      } catch (e) {}
    };
    load();
  }, []);

  const pickPhoto = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true, // Shows circular crop UI for avatars
        mediaType: 'photo',
      });
      if (image?.path) {
        setPhotoUri(image.path);
      }
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        setResultCard({ visible: true, type: "error", message: 'Failed to pick image' });
      }
    }
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
    } catch (e: any) {
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
    } catch (e: any) {
      setResultCard({ visible: true, type: "error", message: e?.message || 'Failed to remove profile photo.' });
    }
  };

  // Safely compose image URL (handles HTTP prefixes vs local paths)
  let avatarDisplayUrl = photoUri;
  if (!avatarDisplayUrl && avatarUrl) {
    avatarDisplayUrl = avatarUrl.startsWith("http") 
      ? avatarUrl 
      : BASE_SERVER_URL + avatarUrl;
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} style={styles.iconGlass} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Profile Picture</Text>
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
          <View style={styles.avatarFallback}>
            <Icon name="account" size={80} color="#94a3b8" />
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>Tap the avatar above to pick a photo.</Text>

      {/* Dynamic Button Logic */}
      {photoUri ? (
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={uploadPhoto}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Save New Picture</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={pickPhoto}
        >
          <Text style={styles.saveBtnTxt}>{avatarUrl ? 'Change Picture' : 'Upload Picture'}</Text>
        </TouchableOpacity>
      )}

      {/* Only show delete button if they have an active avatar and aren't in the middle of uploading a new one */}
      {avatarUrl && !photoUri && (
        <TouchableOpacity style={styles.deleteBtn} onPress={deleteAvatar}>
          <Text style={styles.deleteBtnTxt}>Remove Profile Picture</Text>
        </TouchableOpacity>
      )}

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
  root: { flex: 1, backgroundColor: '#020617', alignItems: 'center', paddingTop: 56 },
  avatarWrap: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: { width: 150, height: 150, borderRadius: 75 },
  avatarFallback: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 24,
    marginBottom: 6,
    width: '70%',
    alignItems: 'center'
  },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deleteBtn: {
    marginTop: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 18,
    width: '70%',
    alignItems: 'center'
  },
  deleteBtnTxt: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 15,
  },
  pageTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#F9FAFB" },
  rightSpacer: { width: 40, height: 40 },
  hint: { color: '#64748b', marginTop: 8, fontSize: 13 },
  topBar: { flexDirection: "row", alignItems: "center", marginTop: 3, marginBottom: 40 },
  iconGlass: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.0)",
    borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center", alignItems: "center", marginRight: 0,
    marginLeft: 12, marginTop: 5
  },
});