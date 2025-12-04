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
        <Icon name="arrow-left" size={24} color="#111827" />
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
        >
          <Section title="1. Introduction">
            These Terms of Service and Privacy Policy (&quot;Terms&quot;)
            govern your use of the StreakSphere mobile application and related
            services (collectively, the &quot;Service&quot;). By creating an
            account or using the Service, you agree to be bound by these Terms.
            If you do not agree, you must not use the Service.
          </Section>

          <Section title="2. Eligibility & Account">
            To use StreakSphere, you must be at least 13 years of age (or older
            if required by local law). You are responsible for:
            {'\n\n'}
            • Providing accurate registration information (e.g., email,
            username).{'\n'}
            • Maintaining the confidentiality of your login credentials.{'\n'}
            • All activity that occurs under your account.{'\n\n'}
            You should notify us immediately if you suspect any unauthorized
            access to your account.
          </Section>

          <Section title="3. Acceptable Use">
            You agree not to misuse the Service. This includes, but is not
            limited to:{'\n\n'}
            • Posting or sharing content that is unlawful, harmful, abusive,
            harassing, defamatory, or discriminatory.{'\n'}
            • Attempting to gain unauthorized access to other users&apos;
            accounts or our systems.{'\n'}
            • Reverse engineering, decompiling, or otherwise attempting to
            extract the source code of the app.{'\n'}
            • Using automated scripts, bots, or scrapers in a way that overloads
            or interferes with the Service.{'\n\n'}
            We reserve the right to remove content or suspend accounts that
            violate these rules.
          </Section>

          <Section title="4. Content & Ownership">
            You retain ownership of the content you create and share on
            StreakSphere. By posting content, you grant us a non‑exclusive,
            worldwide, royalty‑free license to store, display, and process that
            content solely for operating and improving the Service.
            {'\n\n'}
            We do not sell your content. We may remove or restrict content that
            violates these Terms or applicable law.
          </Section>

          <Section title="5. Data We Collect">
            To provide and secure the Service, we may collect the following
            types of information:{'\n\n'}
            • Account information: email, username, profile details.{'\n'}
            • Usage information: how you use features such as streak tracking,
            challenges, or social interactions.{'\n'}
            • Device information: device model, brand, operating system
            version, unique device ID, and approximate location based on IP to
            detect suspicious login activity.{'\n'}
            • Security data: login timestamps, 2FA status, and authorized
            devices to keep your account safe.
          </Section>

          <Section title="6. How We Use Your Data">
            We use your information to:{'\n\n'}
            • Operate and maintain your account and streak data.{'\n'}
            • Provide core app features such as reminders, notifications,
            streaks, and social interactions (if enabled).{'\n'}
            • Help secure your account with tools such as two‑factor
            authentication and device management.{'\n'}
            • Analyze anonymized usage patterns to improve app performance and
            user experience.{'\n\n'}
            We do not sell your personal data. We may share limited information
            with trusted service providers (e.g., email delivery, analytics)
            strictly to operate the Service.
          </Section>

          <Section title="7. Two-Factor Authentication & Devices">
            StreakSphere supports two‑factor authentication (2FA) to give your
            account extra protection. When 2FA is enabled, you may be asked for
            a 6‑digit code or backup code after entering your password.
            {'\n\n'}
            We also track authorized devices for your account. For each device,
            we may store the device ID, model, brand, last login time, and
            approximate IP‑based location. This information is used only to:{'\n\n'}
            • Display a list of devices where you are currently logged in.{'\n'}
            • Allow you to manually log out specific devices.{'\n'}
            • Help detect unusual or suspicious login behavior.
          </Section>

          <Section title="8. Data Retention & Deletion">
            We retain your account data for as long as your account is active.
            You may delete your account from within the app. When you do, we
            will:{'\n\n'}
            • Remove or anonymize your personal information within a reasonable
            timeframe, except where retention is required by law.{'\n'}
            • Delete active sessions and revoke tokens associated with your
            account.{'\n\n'}
            Some aggregated or anonymized data (for analytics and security) may
            be retained, but it cannot be used to identify you.
          </Section>

          <Section title="9. Security">
            We implement industry‑standard security measures, including
            encryption in transit and secure password storage. However, no
            system is 100% secure. You are encouraged to:{'\n\n'}
            • Use a strong, unique password for your account.{'\n'}
            • Enable two‑factor authentication when available.{'\n'}
            • Review your authorized devices regularly and log out devices you
            do not recognize.
          </Section>

          <Section title="10. Changes to These Terms">
            We may update these Terms from time to time to reflect changes in
            our app, legal requirements, or best practices. When we make
            significant changes, we will notify you through the app or by
            email. Continued use of the Service after such updates means you
            accept the new Terms.
          </Section>

          <Section title="11. Contact Us">
            If you have questions about these Terms, your privacy, or how your
            data is handled, you can contact us at:
            {'\n\n'}
            infostreaksphere@gmail.com
            {'\n\n'}
            Please include &quot;Legal Request&quot; or &quot;Privacy Request&quot; in
            the subject line so we can route your message appropriately.
          </Section>

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
  headerRightSpacer: {
    width: 40,
    height: 40,
  },
  scroll: {
    flex: 1,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 20,
  },
});

export default LegalPolicyScreen;