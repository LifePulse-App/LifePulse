import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const HelpSupportScreen = () => {
  const navigation = useNavigation<any>();

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>FAQ & Help</Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  const Question = ({ q, a }: { q: string; a: string }) => (
    <View style={styles.questionCard}>
      <Text style={styles.questionTitle}>{q}</Text>
      <Text style={styles.questionText}>{a}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.kbWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderHeader()}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>Need some help?</Text>
          <Text style={styles.subtitle}>
            This page covers common questions and tips about using StreakSphere.
            If you can&apos;t find your answer here, you can always report a problem
            from the Profile → Help & Support section.
          </Text>

          <Question
            q="How do I enable two-factor authentication (2FA)?"
            a={
              'Go to Profile → Privacy & Security → Two-factor Authentication. ' +
              'Follow the on-screen steps to:\n\n' +
              '1. Scan the QR code with an authenticator app (Google Authenticator, Authy, iOS Passwords, etc.).\n' +
              '2. Enter the 6-digit code from the app to confirm.\n' +
              '3. Save your backup codes in a secure place in case you lose access to your authenticator app.'
            }
          />

          <Question
            q="How can I reset my password?"
            a={
              'If you forgot your password:\n\n' +
              '1. On the login screen, tap "Forget Password".\n' +
              '2. Enter your email or username.\n' +
              '3. Check your email for a verification code.\n' +
              '4. Enter the code in the app, then set a new password.\n\n' +
              'For security reasons, the code is time-limited and can only be used once.'
            }
          />

          <Question
            q="How do streaks work in StreakSphere?"
            a={
              'Streaks are a way to keep track of your consistent activity over time. ' +
              'Each day you complete your required activity, your streak increases by 1.\n\n' +
              'If you miss a day, your streak will reset back to 0, unless the app introduces ' +
              'a specific feature (like a "streak freeze" or "streak protection") that prevents it.\n\n' +
              'You can usually see your current streak on your profile or on the main dashboard.'
            }
          />

          <Question
            q="What are authorized devices and why do they matter?"
            a={
              'Authorized devices are the phones or tablets that are currently logged into your StreakSphere account. ' +
              'We show you this list so that you can:\n\n' +
              '• See where your account is being used.\n' +
              '• Log out devices you don&apos;t recognize or no longer use.\n\n' +
              'You can view and manage authorized devices in Profile → Privacy & Security → "Devices in which you are logged in".'
            }
          />

          <Question
            q="I found a bug or something is not working. What should I do?"
            a={
              'If something looks broken or doesn&apos;t behave as expected:\n\n' +
              '1. Go to Profile → Help & Support → "Report a Problem".\n' +
              '2. Fill in the subject (optional) and describe what happened in as much detail as possible.\n' +
              '3. We automatically attach basic device information (model and OS version) to help us debug.\n\n' +
              'This sends us an email so our team can review and address the issue.'
            }
          />

          <Question
            q="How is my data and privacy handled?"
            a={
              'We only collect the information needed to provide and secure the service, such as your email, username, and basic device details. ' +
              'We do not sell your personal data.\n\n' +
              'For full details, you can read the Legal & Policy section from Profile → Help & Support → "Legal & Policy".'
            }
          />

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
    marginBottom: 18,
  },
  questionCard: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  questionTitle: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  questionText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default HelpSupportScreen;