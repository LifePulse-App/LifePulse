import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import profileApi from '../services/api_profile';
import BitmojiFace, { AvatarConfig } from '../../../shared/components/BitmojiFace';
import LoaderKitView from 'react-native-loader-kit';

const SKIN_TONES = ['skin_light', 'skin_medium', 'skin_tan', 'skin_dark'];
const HAIR_COLORS = ['hair_black', 'hair_brown', 'hair_blonde', 'hair_red'];
const HAIR_STYLES = ['hair_short_1', 'hair_medium_1'];
const EYE_COLORS = ['eye_brown', 'eye_blue', 'eye_green'];
const MOUTHS = ['mouth_smile', 'mouth_flat'];
const BROWS = ['brow_soft'];

type TabKey = 'face' | 'hair' | 'eyes' | 'outfit';

const AvatarCustomizeScreen = () => {
  const navigation = useNavigation<any>();

  const [config, setConfig] = useState<AvatarConfig>({
    skinTone: 'skin_light',
    hairStyle: 'hair_short_1',
    hairColor: 'hair_black',
    eyeColor: 'eye_brown',
    mouth: 'mouth_smile',
    eyebrowStyle: 'brow_soft',
    backgroundColor: '#E5E7EB',
    accessories: [],
    outfit: 'outfit_casual_1',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>('face');

  useEffect(() => {
    (async () => {
      try {
        const res = await profileApi.getAvatar();
        if (res.data?.avatarConfig) {
          setConfig(res.data.avatarConfig);
        }
      } catch {
        // ignore, use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (field: keyof AvatarConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateAvatar(config);
      navigation.goBack();
    } catch {
      // you can show a toast/modal if you like
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Customize Avatar</Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  const TabButton = ({ value, label }: { value: TabKey; label: string }) => {
    const selected = tab === value;
    return (
      <TouchableOpacity
        onPress={() => setTab(value)}
        style={[
          styles.tabButton,
          selected && styles.tabButtonSelected,
        ]}
      >
        <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const ColorRow = ({
    title,
    options,
    field,
  }: {
    title: string;
    options: string[];
    field: keyof AvatarConfig;
  }) => (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {options.map((option) => {
          const selected = (config[field] as any) === option;
          const displayColor =
            field === 'skinTone'
              ? {
                  skin_light: '#F9D3B4',
                  skin_medium: '#E0AC69',
                  skin_tan: '#C68642',
                  skin_dark: '#8D5524',
                }[option] || '#E5E7EB'
              : field === 'hairColor'
              ? {
                  hair_black: '#111827',
                  hair_brown: '#4B3621',
                  hair_blonde: '#FBBF24',
                  hair_red: '#C2410C',
                }[option] || '#E5E7EB'
              : field === 'eyeColor'
              ? {
                  eye_brown: '#4B3621',
                  eye_blue: '#1D4ED8',
                  eye_green: '#15803D',
                }[option] || '#E5E7EB'
              : '#E5E7EB';

          return (
            <TouchableOpacity
              key={option}
              onPress={() => setField(field, option)}
              style={[
                styles.colorCircle,
                { backgroundColor: displayColor },
                selected && styles.colorCircleSelected,
              ]}
            />
          );
        })}
      </View>
    </View>
  );

  const OptionRow = ({
    title,
    options,
    field,
  }: {
    title: string;
    options: string[];
    field: keyof AvatarConfig;
  }) => (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {options.map((option) => {
          const selected = (config[field] as any) === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => setField(field, option)}
              style={[
                styles.pillButton,
                selected && styles.pillButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.pillLabel,
                  selected && styles.pillLabelSelected,
                ]}
              >
                {option.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (tab === 'face') {
      return (
        <>
          <ColorRow
            title="Skin tone"
            options={SKIN_TONES}
            field="skinTone"
          />
        </>
      );
    }
    if (tab === 'hair') {
      return (
        <>
          <OptionRow
            title="Hair style"
            options={HAIR_STYLES}
            field="hairStyle"
          />
          <ColorRow
            title="Hair color"
            options={HAIR_COLORS}
            field="hairColor"
          />
        </>
      );
    }
    if (tab === 'eyes') {
      return (
        <>
          <ColorRow
            title="Eye color"
            options={EYE_COLORS}
            field="eyeColor"
          />
          <OptionRow
            title="Mouth"
            options={MOUTHS}
            field="mouth"
          />
        </>
      );
    }
    if (tab === 'outfit') {
      // For now, just simple placeholder; later you can map true outfits.
      return (
        <>
          <OptionRow
            title="Outfit"
            options={['outfit_casual_1', 'outfit_casual_2']}
            field="outfit"
          />
        </>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <LoaderKitView
          style={{ width: 40, height: 40 }}
          name="BallSpinFadeLoader"
          animationSpeedMultiplier={1.0}
          color="#6366F1"
        />
        <Text style={{ marginTop: 8, color: '#111827' }}>Loading avatar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.kbWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderHeader()}

        <View style={styles.previewWrapper}>
          <BitmojiFace config={config} size={120} />
        </View>

        <View style={styles.tabRow}>
          <TabButton value="face" label="Face" />
          <TabButton value="hair" label="Hair" />
          <TabButton value="eyes" label="Eyes" />
          <TabButton value="outfit" label="Outfit" />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {renderTabContent()}

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.primaryButton, saving && { opacity: 0.75 }]}
            disabled={saving}
          >
            {saving ? (
              <LoaderKitView
                style={{ width: 20, height: 20 }}
                name="BallSpinFadeLoader"
                animationSpeedMultiplier={1.0}
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.primaryButtonText}>Save Avatar</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  kbWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 48,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRightSpacer: { width: 40, height: 40 },
  previewWrapper: { alignItems: 'center', marginBottom: 12 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  tabButtonSelected: {
    backgroundColor: '#111827',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  tabLabelSelected: {
    color: '#F9FAFB',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  pillButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    marginBottom: 8,
  },
  pillButtonSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  pillLabel: {
    fontSize: 12,
    color: '#4B5563',
  },
  pillLabelSelected: {
    color: '#F9FAFB',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default AvatarCustomizeScreen;