import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Modal, FlatList, TextInput } from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraDevice,
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppActivityIndicator from '../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import AppText from '../../components/Layout/AppText/AppText';
import colors from '../../shared/styling/lightModeColors';
import api from '../../shared/services/shared-api';

type Habit = {
  id: string;              // from getTodayHabits or mapped _id
  habitName: string;
  label?: string;
  icon?: string;
  time?: string;
};

type Props = {
  navigation: any;
  route: { params?: { habitId?: string | null } };
};

const ProofVisionCameraScreen: React.FC<Props> = ({ navigation, route }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitId, setHabitId] = useState<string | null>(
    route.params?.habitId ?? null
  );
  const [habitModalVisible, setHabitModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [habitsLoading, setHabitsLoading] = useState(false);

  const cameraRef = useRef<Camera | null>(null);
  const devices = useCameraDevices();
  const device: CameraDevice | undefined =
    devices.find(d => d.position === 'back') ?? devices[0];

  // Camera permissions
  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (status === 'granted') {
        setHasPermission(true);
        return;
      }
      const newStatus = await Camera.requestCameraPermission();
      setHasPermission(newStatus === 'granted');
    })();
  }, []);

  // Habits fetching (for picker)
  useEffect(() => {
    fetchHabits('');
  }, []);

  const fetchHabits = async (query: string) => {
    setHabitsLoading(true);
    try {
      const res = await api.get('/api/habits', {
        params: query ? { search: query } : {},
      });
      // Backend returns { success, habits }
      const data = res.data?.habits ?? [];
      // Normalize id
      const normalized: Habit[] = data.map((h: any) => ({
        id: h.id || h._id?.toString(),
        habitName: h.habitName,
        label: h.label,
        icon: h.icon,
        time: h.time,
      }));
      setHabits(normalized);
    } catch (err) {
      console.error('Failed to load habits:', err);
      setHabits([]);
    }
    setHabitsLoading(false);
  };

  const handleSearchHabit = (txt: string) => {
    setSearch(txt);
    fetchHabits(txt);
  };

  const handleTakePhoto = async () => {
    if (!habitId) {
      // force user to choose habit before capture
      setHabitModalVisible(true);
      return;
    }
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'balanced',
        flash: 'off',
      });

      const filePath = `file://${photo.path}`;
      await uploadProof(filePath, habitId);
    } catch (err) {
      console.error('Capture error:', err);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const uploadProof = async (uri: string, habitId: string) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('proof', {
        uri,
        name: 'proof.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('habitId', habitId);

      const res = await api.post('/api/proofs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        Alert.alert('Success', 'Proof uploaded!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Upload failed', res.data?.message || 'Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Server error while uploading proof.');
    } finally {
      setUploading(false);
    }
  };

  // UI for loading / permission
  if (hasPermission === null || !device) {
    return (
      <View style={styles.center}>
        <AppText style={{ color: '#fff', marginTop: 8 }}>Loading camera…</AppText>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <AppText style={{ color: '#fff', textAlign: 'center' }}>
          Camera permission denied. Please allow camera access in settings.
        </AppText>
      </View>
    );
  }

  // Modal for habit selection
  const renderHabitList = () => (
    <Modal visible={habitModalVisible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <AppText style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Select Habit
          </AppText>
          <TextInput
            style={styles.searchBar}
            value={search}
            onChangeText={handleSearchHabit}
            placeholder="Search habits…"
            placeholderTextColor="#6B7280"
            autoFocus
          />
          {habitsLoading ? (
            <AppActivityIndicator visible={true} />
          ) : (
            <FlatList
              data={habits}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.habitItem}
                  onPress={() => {
                    setHabitId(item.id);
                    setHabitModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                      name={item.icon || 'check'}
                      size={20}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <View>
                      <AppText>{item.label || item.habitName}</AppText>
                      {item.time ? (
                        <AppText style={{ fontSize: 12, color: '#6B7280' }}>
                          {item.time}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setHabitModalVisible(false)}
          >
            <AppText style={{ fontWeight: 'bold', color: colors.primary }}>
              Cancel
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <AppActivityIndicator visible={uploading} />
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!uploading}
        photo={true}
      />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <AppText style={styles.title}>Capture Habit Proof</AppText>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.shutterButtonOuter}
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <View style={styles.shutterButtonInner} />
        </TouchableOpacity>
      </View>

      {renderHabitList()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  title: { color: '#F9FAFB', fontSize: 16, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  shutterButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F9FAFB',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '88%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalClose: { alignSelf: 'flex-end', marginTop: 6 },
  habitItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  searchBar: {
    backgroundColor: colors.gray100,
    marginBottom: 8,
    padding: 8,
    borderRadius: 6,
    color: '#111827',
  },
});

export default ProofVisionCameraScreen;