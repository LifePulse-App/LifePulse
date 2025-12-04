import React, { useState, useContext } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  Linking,
  StyleSheet,
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

const SUPPORT_EMAIL = 'infostreaksphere@gmail.com';

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
        <Icon name="arrow-left" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Report a Problem</Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  return (
    <>
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={styles.kbWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {renderHeader()}

          <View style={styles.body}>
            <Text style={styles.title}>Tell us what went wrong</Text>
            <Text style={styles.subtitle}>
              We take reliability and user experience seriously. Please share as
              many details as you can so we can investigate and fix the issue.
            </Text>

            <TextInput
              label="Subject (optional)"
              value={subject}
              onChangeText={setSubject}
              style={styles.input}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor="black"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              label="Describe the issue"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.descriptionInput]}
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor="black"
              placeholder="What happened? Steps to reproduce, expected vs actual behavior, any screenshots."
              placeholderTextColor="#9CA3AF"
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
                    style={{ width: 20, height: 20 }}
                    name={'BallSpinFadeLoader'}
                    animationSpeedMultiplier={1.0}
                    color={'#FFFFFF'}
                  />
                  <AppText style={[styles.primaryButtonText, { marginLeft: 8 }]}>
                    Opening mail...
                  </AppText>
                </View>
              ) : (
                <AppText style={styles.primaryButtonText}>Send via Email</AppText>
              )}
            </TouchableOpacity>

            <Text style={styles.footerText}>
              We will include basic device information (such as device model and
              OS version) to help us reproduce and debug the issue. No
              passwords, tokens, or other sensitive data are sent.
            </Text>
          </View>
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
    backgroundColor: '#FFFFFF',
  },
  kbWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 48,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 14,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
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
  footerText: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default ReportProblemScreen;