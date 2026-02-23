import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import profileApi from '../services/api_profile'; // Your API
import { useNavigation } from '@react-navigation/native';

export default function ProfilePicUploaderScreen() {
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);

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
      // API Call (Backend described below)
      await profileApi.updateAvatarImage(formData);
      Alert.alert('Success', 'Profile photo updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error uploading photo', e?.message || 'Try again later');
    }
    setUploading(false);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.header}>Upload Your Profile Picture</Text>
      <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} activeOpacity={0.95}>
        {!photoUri ? (
          <Icon name="account-circle-outline" size={120} color="#6366f1" />
        ) : (
          <Image
            style={styles.avatar}
            source={{ uri: photoUri }}
            resizeMode="cover"
          />
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
  hint: { color: '#a1a1aa', marginTop: 12, fontSize: 13 },
});