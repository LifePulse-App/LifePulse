import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import profileApi from '../services/api_profile'; // Your API
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../../auth/api-client/api_client';

// Set your backend base (for local avatars, adjust as needed)
const baseUrl = apiClient.getBaseURL(); // Example: "http://localhost:40000/api"
const BASE_SERVER_URL = baseUrl.replace(/\/api\/?$/, "");

export default function ProfilePicUploaderScreen() {
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Load current avatar from backend on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await profileApi.getAvatarUrl();
        // Prefer .data.avatarUrl if you use their getMyAvatar API
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
      Alert.alert('Error', res.errorMessage || 'Failed to pick image');
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
      // If your API returns the new url, update local state:
      setAvatarUrl(uploadRes?.data?.url ?? null);
      setPhotoUri(null);
      Alert.alert('Success', 'Profile photo updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error uploading photo', e?.message || 'Try again later');
    }
    setUploading(false);
  };

  const deleteAvatar = async () => {
    try {
      await profileApi.deleteAvatar();
      setPhotoUri(null);
      setAvatarUrl(null); // clear displayed avatar
      Alert.alert('Success', 'Profile picture removed!');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to remove profile photo.');
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