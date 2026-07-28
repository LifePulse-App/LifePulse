import React, { useState, useContext } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  Linking,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text } from '@rneui/themed';
import { TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import AppText from '../../../components/Layout/AppText/AppText';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';
import AuthContext from '../../../auth/user/UserContext';
import DeviceInfo from 'react-native-device-info';
import LoaderKitView from 'react-native-loader-kit';

const SUPPORT_EMAIL = 'suppart@streaksphere.app';

const ReportProblemScreen = () => {
  const navigation = useNavigation<any>();
  const authContext = useContext(AuthContext);
  const user = authContext?.User?.user;

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorVisible(true);
  };
  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage(null);
  };

  const handleSend = async () => {
    Keyboard.dismiss();

    if (!description.trim()) {
      showError('Please describe the problem so we can help you.');
      return;
    }

    setSending(true);
    try {
      const deviceModel = DeviceInfo.getModel();
      const deviceBrand = DeviceInfo.getBrand();
      const systemName = DeviceInfo.getSystemName();
      const systemVersion = DeviceInfo.getSystemVersion();

      const userEmail = user?.email || 'Unknown';
      const userId = user?.id || 'Unknown';

      const finalSubject =
        subject.trim() || 'Problem report from StreakSphere app';

      const meta = [
        '',
        '---',
        `User ID: ${userId}`,
        `User Email: ${userEmail}`,
        `Device: ${deviceBrand} ${deviceModel}`,
        `OS: ${systemName} ${systemVersion}`,
        '',
      ].join('\n');

      const bodyText = description + meta;
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        finalSubject,
      )}&body=${encodeURIComponent(bodyText)}`;

      let canOpen = false;
      try {
        canOpen = await Linking.canOpenURL(mailtoUrl);
      } catch {
        canOpen = false;
      }

      if (!canOpen) {
        // Try anyway (some devices misreport canOpenURL for mailto)
        try {
          await Linking.openURL(mailtoUrl);
          navigation.goBack();
          return;
        } catch {
          showError(
            'No email client appears to be configured on this device. ' +
              'Please install or set up an email app and try again.',
          );
          return;
        }
      }

      await Linking.openURL(mailtoUrl);
      navigation.goBack();
    } catch {
      showError('Unable to open email client. Please try again.');
    } finally {
      setSending(false);
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
      <Text style={styles.headerTitle}>Report a Problem</Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  return (
    <>
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderHeader()}

            <View style={styles.body}>
              <Text style={styles.title}>Tell us what went wrong</Text>
              <Text style={styles.subtitle}>
                We take reliability and user experience seriously. Please share as
                many details as you can so we can investigate and fix the issue.
              </Text>

              <Text style={styles.inputLabel}>Subject (optional)</Text>
              <TextInput
                style={styles.textInput}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#FFFFFF"
                placeholder="Brief summary of the issue"
                placeholderTextColor="#64748B"
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={styles.inputLabel}>Describe the issue</Text>
              <TextInput
                style={[styles.textInput, styles.descriptionInput]}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#FFFFFF"
                placeholder="What happened? Steps to reproduce, expected vs actual behavior"
                placeholderTextColor="#64748B"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <TouchableOpacity
                onPress={handleSend}
                style={[styles.primaryButton, sending && { opacity: 0.75 }]}
                disabled={sending}
              >
                {sending ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <LoaderKitView
                      style={{ width: 24, height: 24 }}
                      name={'BallSpinFadeLoader'}
                      color={'#FFFFFF'}
                    />
                    <Text style={[styles.primaryButtonText, { marginLeft: 10 }]}>
                      Opening mail...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Send via Email</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.footerText}>
                We will include basic device information (such as device model and
                OS version) to help us reproduce and debug the issue. No
                passwords, tokens, or other sensitive data are sent.
              </Text>
            </View>
            
            {/* Added spacer to ensure scroll space exists above keyboard */}
            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage || ''}
        onClose={hideError}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617', // Flat, deep dark background
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  descriptionInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});

export default ReportProblemScreen;