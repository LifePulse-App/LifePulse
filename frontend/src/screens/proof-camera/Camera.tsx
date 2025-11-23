import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  SectionList,
  TextInput,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  CameraDevice,
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppActivityIndicator from '../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import AppText from '../../components/Layout/AppText/AppText';
import colors from '../../shared/styling/lightModeColors';
import ProofApi from './api_camera';

type Habit = {
  id: string;
  habitName: string;
  label?: string;
  icon?: string;
  time?: string;   // defaultTime from backend
  group?: string;  // e.g. "Movement / Fitness"
};

type HabitSection = {
  title: string;
  data: Habit[];
};

type Props = {
  navigation: any;
  route: { params?: { habitId?: string | null } };
};

const GLASS_BG = 'rgba(15, 23, 42, 0.65)';
const GLASS_BORDER = 'rgba(148, 163, 184, 0.35)';

const ProofVisionCameraScreen: React.FC<Props> = ({ navigation, route }) => {
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitSections, setHabitSections] = useState<HabitSection[]>([]);
  const [habitId, setHabitId] = useState<string | null>(
    route.params?.habitId ?? null
  );
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

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

  useEffect(() => {
    if (habitModalVisible) {
      fetchHabits(search);  // auto refresh list on modal open
    }
  }, [habitModalVisible]);
  

  const groupHabits = (items: Habit[]): HabitSection[] => {
    console.log('groupHabits items.length:', items.length);
    const byGroup: Record<string, Habit[]> = {};
    items.forEach(h => {
      const groupName = h.group || 'Other';
      if (!byGroup[groupName]) byGroup[groupName] = [];
      byGroup[groupName].push(h);
    });
    const sections = Object.keys(byGroup)
      .sort()
      .map(title => ({
        title,
        data: byGroup[title].sort((a, b) =>
          (a.label || a.habitName).localeCompare(b.label || b.habitName),
        ),
      }));
    console.log(
      'groupHabits sections:',
      sections.map(s => ({ title: s.title, count: s.data.length })),
    );
    return sections;
  };

  const fetchHabits = async (query: string) => {
    setHabitsLoading(true);
    try {
      console.log('fetchHabits query:', query);
      const res = await ProofApi.GetHabits(query || undefined);
      console.log('fetchHabits raw res.data:', (res as any).data);
      const data = (res as any).data?.habits ?? (res as any).habits ?? [];
      console.log('fetchHabits data.length:', data.length);

      const normalized: Habit[] = data.map((h: any) => ({
        id: h.id || h._id?.toString(),
        habitName: h.habitName,
        label: h.habitName,
        icon: h.icon,
        group: h.group, // backend provides this
      }));

      setHabits(normalized);
      setHabitSections(groupHabits(normalized));

      // If we came with a preset habitId from route, set selectedHabit
      if (!selectedHabit && habitId) {
        const found = normalized.find(h => h.id === habitId);
        if (found) {
          setSelectedHabit(found);
        }
      }
    } catch (err) {
      console.error('Failed to load habits:', err);
      setHabits([]);
      setHabitSections([]);
    }
    setHabitsLoading(false);
  };

  const handleSearchHabit = (txt: string) => {
    setSearch(txt);
  
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  
    searchTimeout.current = setTimeout(() => {
      fetchHabits(txt);
    }, 400);
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

      const res = await ProofApi.SubmitProof(formData);

      if ((res as any).data?.success) {
        const reason = (res as any).data?.reason;
        if (reason) {
          Alert.alert('Notice', reason);
        } else {
          Alert.alert('Success', 'Proof uploaded!');
        }
        navigation.goBack();
      } else {
        Alert.alert(
          'Upload failed',
          (res as any).data?.message || 'Please try again.',
        );
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Server error while uploading proof.');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!habitId) {
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

  const selectedLabel =
    selectedHabit?.habitName || 'Tap to select a activity';

  // Modal for habit selection (glassy + grouped)
  const renderHabitList = () => (
    <Modal visible={habitModalVisible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalGlassCard}>
          <AppText style={styles.modalTitle}>Select Activity</AppText>

          <View style={styles.searchWrapper}>
            <Icon
              name="magnify"
              size={18}
              color="#6B7280"
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.searchBar}
              value={search}
              onChangeText={handleSearchHabit}
              placeholder="Search activity..."
              placeholderTextColor="#6B7280"
              autoFocus
            />
          </View>

          {habitsLoading ? (
            <View style={styles.modalLoading}>
            </View>
          ) : (
            <SectionList
              sections={habitSections}
              keyExtractor={item => item.id}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                  <AppText style={styles.sectionHeaderText}>
                    {section.title}
                  </AppText>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.habitItem}
                  onPress={() => {
                    setHabitId(item.id);
                    setSelectedHabit(item);
                    setHabitModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.habitIconCircle}>
                      <Icon
                        name={item.icon || 'check'}
                        size={20}
                        color="#C4B5FD"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.habitNameText}>
                        {item.label || item.habitName}
                      </AppText>
                      {item.time ? (
                        <AppText style={styles.habitTimeText}>
                          {item.time}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 12 }}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setHabitModalVisible(false)}
          >
            <AppText style={styles.modalCloseText}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.root}>
      {/* Background glow to match dashboard vibe */}
      <View style={styles.baseBackground} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <AppActivityIndicator visible={uploading} />

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!uploading}
        photo={true}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar glass */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconGlass}
          >
            <Icon name="arrow-left" size={22} color="#E5E7EB" />
          </TouchableOpacity>
          <AppText style={styles.title}>Capture Activity Proof</AppText>
          <View style={{ width: 40 }} />
        </View>

        {/* Selected habit glass pill */}
        <View style={styles.selectedHabitBar}>
          <TouchableOpacity
            style={styles.selectedHabitButton}
            onPress={() => setHabitModalVisible(true)}
            activeOpacity={0.9}
          >
            <View style={styles.selectedHabitIconWrap}>
              <Icon
                name={selectedHabit?.icon || 'check'}
                size={22}
                color="#C4B5FD"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.selectedHabitLabel} numberOfLines={1}>
                {selectedLabel}
              </AppText>
              {selectedHabit?.time && (
                <AppText style={styles.selectedHabitTime}>
                  {selectedHabit.time}
                </AppText>
              )}
            </View>
            <Icon
              name="chevron-up"
              size={22}
              color="#9CA3AF"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>

        {/* Shutter glass ring */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.shutterOuterGlass}
            onPress={handleTakePhoto}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </View>

      {renderHabitList()}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingHorizontal: 20,
  },
  center: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  title: { color: '#F9FAFB', fontSize: 16, fontWeight: '600' },

  // Selected habit pill
  selectedHabitBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 120,
  },
  selectedHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  selectedHabitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(55, 65, 81, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectedHabitLabel: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedHabitTime: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },

  // Shutter
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterOuterGlass: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: 'rgba(191, 219, 254, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    shadowColor: '#60A5FA',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F9FAFB',
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
  },
  modalGlassCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 20,
    padding: 14,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.6)',
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 14,
    paddingVertical: 4,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingVertical: 6,
  },
  sectionHeaderText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  habitItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(31, 41, 55, 0.8)',
  },
  habitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55,65,81,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  habitNameText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  habitTimeText: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  modalClose: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.6)',
  },
  modalCloseText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProofVisionCameraScreen;