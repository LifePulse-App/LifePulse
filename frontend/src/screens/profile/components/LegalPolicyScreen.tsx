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

const LegalPolicyScreen = () => {
  const navigation = useNavigation<any>();

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Legal & Policy</Text>
      <View style={styles.headerRightSpacer} />
    </View>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
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
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lastUpdated}>Last Updated: July 2026</Text>

          <Section title="Introduction">
            Welcome to StreakSphere. These Terms of Service and Privacy Policy ("Terms") govern your use of the StreakSphere mobile application, website, and related services (collectively, the "Service"). By creating an account or using the Service, you agree to be bound by these Terms.
          </Section>

          <View style={styles.divider} />
          <Text style={styles.partTitle}>PART 1: PRIVACY POLICY</Text>

          <Section title="1. Information We Collect">
            To provide and secure the Service, we collect the following information:{'\n\n'}
            • Information you provide: Email address, username, profile picture, bio, and content you post.{'\n'}
            • App Usage Data: How you interact with the app, including streak tracking, challenges, social interactions, and crash reports.{'\n'}
            • Device & Log Data: Device model, operating system version, unique device identifiers, IP address, and login timestamps.{'\n'}
            • Security Data: 2FA status, backup codes, and a list of authorized devices to prevent unauthorized access.{'\n'}
            • Device Permissions: With your consent, we may access your camera, photo library, or push notifications to enable specific app features.
          </Section>

          <Section title="2. How We Use Your Information">
            We use your data strictly to operate and improve StreakSphere:{'\n\n'}
            • To maintain your account, streaks, and data synchronization across devices.{'\n'}
            • To enable social features, such as sharing progress or participating in challenges.{'\n'}
            • To secure your account, detect fraud, and alert you of suspicious logins.{'\n'}
            • To send administrative emails (e.g., password resets) and push notifications.{'\n'}
            • To analyze app performance and fix technical bugs.
          </Section>

          <Section title="3. Third-Party Services">
            We do not sell your personal data. However, we use trusted third-party service providers to help operate the Service (e.g., cloud hosting like MongoDB/AWS/GCP, analytics, and email delivery). These third parties are contractually obligated to protect your data and may only process it based on our instructions.
          </Section>

          <Section title="4. User Rights & Data Deletion">
            Depending on your location, you have the right to access, update, or delete your personal data.{'\n\n'}
            Account Deletion:{'\n'}
            You may permanently delete your account and associated data at any time via the in-app settings (Settings {'>'} Account {'>'} Delete Account). If you no longer have the app installed, you can email us at contact@streaksphere.app with the subject "Account Deletion Request".{'\n\n'}
            Upon deletion:{'\n'}
            • Your profile, streaks, and personal data are removed from our active databases.{'\n'}
            • Active sessions and authentication tokens are immediately revoked.{'\n'}
            • Some anonymized analytical data may be retained securely for legal or operational purposes.
          </Section>

          <Section title="5. Children's Privacy">
            StreakSphere is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a user is under 13, we will delete their account and data immediately.
          </Section>

          <View style={styles.divider} />
          <Text style={styles.partTitle}>PART 2: TERMS OF SERVICE</Text>

          <Section title="6. Acceptable Use & Conduct">
            You agree not to misuse the Service. You are strictly prohibited from:{'\n\n'}
            • Attempting to hack, reverse-engineer, or disrupt the app’s infrastructure.{'\n'}
            • Using automated bots, scrapers, or scripts to manipulate streaks or accounts.{'\n'}
            • Impersonating others or providing false registration information.
          </Section>

          <Section title="7. User-Generated Content & Moderation">
            StreakSphere allows users to post content and interact. We have a zero-tolerance policy for objectionable content. You agree NOT to post content that is:{'\n\n'}
            • Unlawful, harassing, abusive, threatening, or defamatory.{'\n'}
            • Hate speech, discriminatory, or inciting violence.{'\n'}
            • Sexually explicit or pornographic.{'\n\n'}
            Moderation: We reserve the right to review, flag, and remove any content that violates these Terms. Users can report inappropriate content or block other users directly within the app. Violators will face immediate account suspension or termination.
          </Section>

          <Section title="8. Intellectual Property">
            You retain ownership of the content you create. By posting content, you grant StreakSphere a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content solely for the purpose of operating the Service.{'\n\n'}
            The StreakSphere app, its logo, code, and design are the intellectual property of StreakSphere and may not be copied or reproduced without permission.
          </Section>

          <Section title="9. Disclaimers & Limitation of Liability">
            "AS IS" Basis: StreakSphere is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties that the app will be error-free, completely secure, or operate without interruptions.{'\n\n'}
            Limitation of Liability: To the maximum extent permitted by law, StreakSphere and its developers shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of, or inability to use, the Service, including data loss or unauthorized access to your account.
          </Section>

          <View style={styles.divider} />
          <Text style={styles.partTitle}>PART 3: CHILD SAFETY STANDARDS</Text>

          <Section title="10. Zero Tolerance Policy">
            StreakSphere is committed to maintaining a safe environment for all users. We have a strict, zero-tolerance policy against Child Sexual Abuse Material (CSAM) and the exploitation of minors.{'\n\n'}
            Any content that depicts, encourages, promotes, or relates to the sexual exploitation or abuse of children is strictly prohibited. This includes, but is not limited to, sharing CSAM, grooming behaviors, and the sexualization of minors.
          </Section>

          <Section title="11. Enforcement & Reporting Mechanisms">
            If we discover any user violating these standards, we will take immediate action, which includes:{'\n\n'}
            • Permanent termination of the user's StreakSphere account.{'\n'}
            • Preservation of associated data for law enforcement.{'\n'}
            • Reporting the incident and user details to relevant national and international authorities, including the National Center for Missing & Exploited Children (NCMEC) and local law enforcement.{'\n\n'}
            We empower our community to help keep StreakSphere safe. Users can report inappropriate content or suspicious behavior directly within the app using the "Report" button on profiles, posts, and messages.
          </Section>

          <View style={styles.divider} />

          <Section title="12. Changes to These Terms">
            We may update this document periodically. If we make significant changes, we will notify you via the app or email. Your continued use of the Service after changes are published constitutes your acceptance of the updated Terms.
          </Section>

          <Section title="13. Contact Us">
            If you have questions regarding these terms, data privacy, or require support, please contact us at:{'\n\n'}
            • General & Privacy Inquiries: contact@streaksphere.app{'\n'}
            • Child Safety Concerns: aligee512@gmail.com{'\n\n'}
            Please include "Privacy Inquiry" or "Legal" in the subject line for faster routing.
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617', // Flat, deep dark background
  },
  kbWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 48,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  lastUpdated: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 24,
  },
  partTitle: {
    color: '#6366f1', // Indigo accent color to match 2FA screen styling
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#F9FAFB',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 22,
  },
});

export default LegalPolicyScreen;