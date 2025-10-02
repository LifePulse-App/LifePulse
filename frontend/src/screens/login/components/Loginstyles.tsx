import { StyleSheet, useColorScheme } from 'react-native';
import colors from '../../../shared/styling/colors';

export const loginStyles = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDark ? colors.black : "#F9FAFB", // very light gray background
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: isDark ? colors.white : "#111827", // dark text
      marginBottom: 4,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? "#9CA3AF" : "#6B7280", // subtle gray
      marginBottom: 24,
      textAlign: "center",
    },
    socialButton: {
      width: "100%",
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E5E7EB",
      backgroundColor: "#FFFFFF",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginBottom: 12,
      elevation: 1
    },
    appleButton: {
      width: "100%",
      height: 50,
      borderRadius: 12,
      backgroundColor: "#000000",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      marginBottom: 5,
      elevation: 1
    },
    socialText: {
      fontSize: 16,
      fontWeight: "500",
      marginLeft: 8,
      color: "#111827",
    },
    appleText: {
      fontSize: 16,
      fontWeight: "500",
      marginLeft: 15,
      color: "#FFFFFF",
    },
    forgotPasswordText: {
      color: '#5a75c2',   // same color you used for checkbox tick
      fontSize: 14,
      marginLeft: "50%",
      marginBottom: 5
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
      width: "100%",
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: "#E5E7EB",
    },
    dividerText: {
      marginHorizontal: 10,
      color: "#6B7280",
      fontSize: 14,
    },
    input: {
      width: "100%",
      height: 50,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      marginBottom: 10,
    },
    button: {
      width: "100%",
      height: 52,
      borderRadius: 12,
      backgroundColor: "#1D4ED8", // blue-600
      justifyContent: "center",
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    footer: {
      marginTop: 20,
      flexDirection: "row",
      justifyContent: "center",
    },
    footerText: {
      color: "#6B7280",
      fontSize: 14,
    },
    footerLink: {
      color: "#2563EB", // blue link
      fontWeight: "500",
      marginLeft: 4,
    },
  });
};
