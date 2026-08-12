import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import LoaderKitView from 'react-native-loader-kit';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';
import apiClient from '../../../auth/api-client/api_client';
import { launchImageLibrary } from 'react-native-image-picker';

const CATEGORIES = ['Creator', 'Musician', 'Actor', 'Athlete', 'Public Figure', 'Other'];

export default function VerifySelfScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [statusData, setStatusData] = useState<{
    tick: string;
    requestStatus: 'none' | 'pending' | 'approved' | 'rejected';
    adminNotes: string | null;
  }>({
    tick: 'none',
    requestStatus: 'none',
    adminNotes: null,
  });

  const [verificationCode, setVerificationCode] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [stageName, setStageName] = useState('');
  const [category, setCategory] = useState('Creator');
  const [publicProfileLink, setPublicProfileLink] = useState('');
  
  // Real Image States
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
  };
  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  // Helper function to upload an image file to 0x0.st
async function uploadToImgBB(imageUri: string): Promise<string> {
  const formData = new FormData();
  
  // Replace with your actual ImgBB API key
  const API_KEY = '6922f511b56a345652a0f1ff8b72fe7b'; 
  formData.append('key', API_KEY);

  const filename = imageUri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  const uri = Platform.OS === 'android' ? imageUri : imageUri.replace('file://', '');

  formData.append('image', {
    uri,
    name: filename,
    type,
  } as any);

  try {
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data?.success && data?.data?.url) {
      return data.data.url; // Returns the permanent direct image URL
    } else {
      throw new Error(data?.error?.message || 'Upload failed');
    }
  } catch (error: any) {
    console.log("ImgBB Error:", error);
    throw new Error('Failed to upload image.');
  }
}

  useEffect(() => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setVerificationCode(`SS-${randomCode}`);

    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiClient.get('/verify/status');
      if (res.data?.success) {
        setStatusData({
          tick: res.data.tick || 'none',
          requestStatus: res.data.requestStatus || 'none',
          adminNotes: res.data.adminNotes || null,
        });
      }
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Failed to fetch verification status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const pickImage = (type: 'document' | 'selfie') => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        showError('Image selection failed. Please try again.');
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        if (type === 'document') setDocumentUri(uri);
        if (type === 'selfie') setSelfieUri(uri);
      }
    });
  };

const handleSubmitApplication = async () => {
  if (!fullName.trim() || !stageName.trim() || !publicProfileLink.trim()) {
    showError('Please complete all text fields.');
    return;
  }
  if (!documentUri) {
    showError('Please attach a photo of your Government-Issued ID.');
    return;
  }
  if (!selfieUri) {
    showError('Please attach your verification selfie holding the code paper.');
    return;
  }

  setSubmitting(true);
  try {
    // ⚡ 1. Upload both images to 0x0.st first
    const uploadedDocUrl = await uploadToImgBB(documentUri);
const uploadedSelfieUrl = await uploadToImgBB(selfieUri);

    // ⚡ 2. Submit the resulting public links to your backend database
    const res = await apiClient.post('/verify/submit', {
      fullName: fullName.trim(),
      stageName: stageName.trim(),
      category,
      publicProfileLink: publicProfileLink.trim(),
      documentUrl: uploadedDocUrl, 
      selfieUrl: uploadedSelfieUrl,
      verificationCode,
    });

    if (res.data?.success) {
      setSuccessModal(true);
      fetchStatus();
    }
  } catch (e: any) {
    showError(e?.response?.data?.message || e?.message || 'Failed to submit application.');
  } finally {
    setSubmitting(false);
  }
};

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Verify Yourself</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoaderKitView style={{ width: 40, height: 40 }} name={'BallSpinFadeLoader'} color={'#6366F1'} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {offline && (
          <View style={styles.offlineBanner}>
            <Icon name="wifi-off" size={14} color="#94A3B8" />
            <Text style={styles.offlineText}>Offline mode enabled</Text>
          </View>
        )}

        {statusData.tick !== 'none' || statusData.requestStatus === 'approved' ? (
          <View style={styles.centerContainer}>
            <View style={[styles.statusIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' }]}>
              <Icon name="check-decagram" size={48} color="#3b82f6" />
            </View>
            <Text style={styles.mainTitle}>You are Verified!</Text>
            <Text style={styles.mainSubtitle}>
              Your account holds official celebrity/creator status on StreakSphere. Your badge is visible across your profile and interactions.
            </Text>
          </View>
        ) : statusData.requestStatus === 'pending' ? (
          <View style={styles.centerContainer}>
            <View style={[styles.statusIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
              <Icon name="clock-outline" size={48} color="#FBBF24" />
            </View>
            <Text style={styles.mainTitle}>Application Under Review</Text>
            <Text style={styles.mainSubtitle}>
              Our moderation team is auditing your credentials and media presence. You will receive an update once processing completes.
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.mainTitle}>Request Official Badge</Text>
              <Text style={styles.mainSubtitle}>
                Verified creator badges are reserved for notable public figures, artists, and prominent community creators. Please provide valid proof of identity and public presence.
              </Text>
            </View>

            {statusData.requestStatus === 'rejected' && (
              <View style={styles.rejectBanner}>
                <Icon name="alert-circle-outline" size={18} color="#F87171" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.rejectTitle}>Application Rejected</Text>
                  <Text style={styles.rejectText}>
                    {statusData.adminNotes || 'Your previous submission did not meet verification criteria.'} You may re-submit below.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Full Legal Name</Text>
              <TextInput
                style={styles.sheetInput}
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>Professional / Stage Name</Text>
              <TextInput
                style={styles.sheetInput}
                value={stageName}
                onChangeText={setStageName}
              />

              {/* ⚡ CATEGORY SELECTOR */}
              <Text style={styles.inputLabel}>Select Category</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Public Social Media / Press Link</Text>
              <TextInput
                style={styles.sheetInput}
                autoCapitalize="none"
                value={publicProfileLink}
                onChangeText={setPublicProfileLink}
              />

              <View style={styles.sectionDivider} />
              
              <Text style={styles.inputLabel}>1. Government-Issued ID</Text>
              <Text style={styles.instructionText}>Attach a clear photo of your official Passport or National Identity Card.</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('document')} activeOpacity={0.8}>
                {documentUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: documentUri }} style={styles.previewImage} />
                    <Text style={styles.changeImageText}>Tap to change ID</Text>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="card-account-details-outline" size={28} color="#818CF8" />
                    <Text style={styles.uploadText}>Attach Government ID</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>2. Verification Selfie with Code</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeBoxTitle}>Your Unique Session Code:</Text>
                <Text style={styles.codeText}>{verificationCode}</Text>
                <Text style={styles.codeSubText}>Write this code clearly on a piece of paper and take a selfie holding it next to your face so both your face and the code are fully visible.</Text>
              </View>
              
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage('selfie')} activeOpacity={0.8}>
                {selfieUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: selfieUri }} style={styles.previewImage} />
                    <Text style={styles.changeImageText}>Tap to change selfie</Text>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Icon name="camera-account" size={28} color="#818CF8" />
                    <Text style={styles.uploadText}>Attach Code Selfie</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitApplication}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Verification Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {successModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="check-circle" size={48} color="#22C55E" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Request Submitted</Text>
            <Text style={styles.modalText}>
              Your credentials and code selfie have been securely transmitted to the admin review queue.
            </Text>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={() => {
                setSuccessModal(false);
                fetchStatus();
              }}
            >
              <Text style={styles.modalConfirmText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <GlassyErrorModal visible={errorVisible} message={errorMessage || ''} onClose={hideError} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: Platform.OS === 'ios' ? 60 : 50,
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#F9FAFB' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: { color: '#FBBF24', fontSize: 13, fontWeight: '600' },
  headerTextWrap: { marginBottom: 20, marginTop: 10 },
  mainTitle: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  mainSubtitle: { color: '#94A3B8', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  centerContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  statusIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  rejectBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  rejectTitle: { color: '#F87171', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  rejectText: { color: '#94A3B8', fontSize: 12, lineHeight: 16 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sheetInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryPillSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#818CF8',
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  instructionText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  codeBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  codeBoxTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  codeText: {
    color: '#818CF8',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginVertical: 4,
  },
  codeSubText: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  imagePickerBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  previewContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageText: {
    position: 'absolute',
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  submitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
  },
  modalTitle: { color: '#F9FAFB', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalText: { color: '#94A3B8', fontSize: 14, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  modalConfirmBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});