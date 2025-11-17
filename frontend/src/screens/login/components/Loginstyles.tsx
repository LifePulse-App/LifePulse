import { Dimensions, StyleSheet, useColorScheme } from 'react-native';
import colors from '../../../shared/styling/colors';

const { width, height } = Dimensions.get('window');

export const loginStyles = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000',
      overflow: 'hidden',
    },

    // Glassy, colorful background blobs
    gradientLayer1: {
      position: 'absolute',
      width: width * 1.8,
      height: width * 1.8,
      borderRadius: width * 0.8,
      backgroundColor: '#34d399',
      opacity: 0.7,
      top: -width * 0.6,
      left: -width * 0.3,
    },
    gradientLayer2: {
      position: 'absolute',
      width: width * 1.6,
      height: width * 1.6,
      borderRadius: width * 0.8,
      backgroundColor: '#facc15',
      opacity: 0.5,
      top: height * 0.15,
      right: -width * 0.5,
    },
    gradientLayer3: {
      position: 'absolute',
      width: width * 1.8,
      height: width * 1.8,
      borderRadius: width * 0.9,
      backgroundColor: '#a855f7',
      opacity: 0.55,
      bottom: -width * 0.6,
      left: -width * 0.4,
    },

    kbWrapper: {
      flex: 1,
      paddingHorizontal: 24,
      paddingBottom: 32,
    },

    // App name at top, like screenshot
    appNameWrapper: {
      flex: 1.2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appName: {
      fontSize: 32,
      fontWeight: '700',
      color: '#A8FFF8',
    },

    // Glass card near bottom
    glassWrapper: {
      flex: 3,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingBottom: 16,
    },
    glassBlur: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 24,
    },
    glassContent: {
      width: '100%',
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 28,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.35)',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },

    mainTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#000',
      textAlign: 'center',
      marginBottom: 8,
    },
    mainSubtitle: {
      fontSize: 15,
      color: '#000',
      textAlign: 'center',
      marginBottom: 10,
    },

    input: {
      width: '100%',
      height: 52,
      borderTopStartRadius: 12,
      borderTopEndRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    passwordInput: {
      width: '100%',
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.85)',
      paddingHorizontal: 12,
      marginBottom: 14,
    },

    primaryButton: {
      width: '100%',
      height: 52,
      borderRadius: 12,
      backgroundColor: '#000000',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 10,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },

    secondaryButton: {
      marginTop: 12,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.6)',
    },
    secondaryButtonText: {
      color: '#E5E7EB',
      fontSize: 14,
      fontWeight: '500',
    },

    loadingOverlay: {
      width: '100%',
      height: 52,
      borderRadius: 12,
      backgroundColor: '#000000',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: '#FFFFFF',
      marginLeft: 8,
    },

    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      width: '100%',
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.7)',
    },
    dividerText: {
      marginHorizontal: 10,
      color: '#fff',
      fontSize: 14,
    },

    socialButton: {
      width: '100%',
      height: 52,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.96)',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: 16,
    },
    googleIcon: {
      width: 20,
      height: 20,
      marginRight: 10,
    },
    socialText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#111827',
    },

    termsText: {
      fontSize: 12,
      color: '#000',
      textAlign: 'center',
      lineHeight: 17,
      marginTop: 4,
    },
  });
};