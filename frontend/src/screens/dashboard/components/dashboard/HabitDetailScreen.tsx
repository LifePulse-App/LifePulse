import React from "react";
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  StatusBar,
  KeyboardAvoidingView,
  Dimensions,
  StyleSheet // ← ADD THIS
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");

const STATUS_LABELS = {
  verified: { text: "Verified", color: "#22C55E" },
  rejected: { text: "Rejected", color: "#EF4444" },
  pending: { text: "Pending", color: "#F59E42" },
};

// Colors matching Enable2FAScreen
const COLORS = {
  bg: "#020617",
  glowTop: "rgba(59, 130, 246, 0.22)",
  glowBottom: "rgba(168, 85, 247, 0.22)",
  glassBorder: "rgba(148, 163, 184, 0.25)",
  glassBg: "rgba(255, 255, 255, 0.06)",
  textPrimary: "#F9FAFB",
  textSecondary: "#E5E7EB",
  textMuted: "#94A3B8",
  primary: "#6366F1",
};

export default function HabitDetailScreen({ route, navigation }) {
  const habit = route?.params?.habit || {};

  const statusInfo = STATUS_LABELS[habit.status] || { 
    text: habit.status, 
    color: COLORS.textMuted 
  };

  const renderHeader = () => (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 20, 
      marginTop: Platform.OS === 'ios' ? 50 : 30 
    }}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          width: 40, 
          height: 40, 
          borderRadius: 16,
          backgroundColor: 'rgba(15,23,42,0.0)',
          borderWidth: 1, 
          borderColor: 'rgba(148,163,184,0.4)',
          justifyContent: 'center', 
          alignItems: 'center', 
          marginLeft: 4,
        }}
        onPress={() => navigation.goBack?.()}
      >
        <Icon name="arrow-left" size={24} color="#E5E7EB" />
      </TouchableOpacity>
      <Text style={{
        flex: 1, 
        textAlign: 'center', 
        fontSize: 18, 
        fontWeight: '700',
        color: '#F9FAFB', 
        marginRight: 40,
      }}>
        Habit Details
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["left", "right"]}>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {/* Background & Glow Effects - Same as Enable2FAScreen */}
        <View style={StyleSheet.absoluteFillObject} />
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: COLORS.bg,
        }} />
        
        {/* Top Glow Blob */}
        <View style={{
          position: "absolute",
          top: -120,
          left: -40,
          width: 220,
          height: 220,
          borderRadius: 220,
          backgroundColor: COLORS.glowTop,
        }} />
        
        {/* Bottom Glow Blob */}
        <View style={{
          position: "absolute",
          bottom: -140,
          right: -40,
          width: 240,
          height: 240,
          borderRadius: 240,
          backgroundColor: COLORS.glowBottom,
        }} />

        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {renderHeader()}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 40,
            }}
          >
            {/* Glassy Card - Same style as Enable2FAScreen */}
            <View style={{
              borderRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
              backgroundColor: COLORS.glassBg,
              overflow: 'hidden',
              // Glassmorphism shadow
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}>
              <View style={{
                padding: 20,
                backgroundColor: 'rgba(255,255,255,0.95)',
              }}>
                {/* Main Title */}
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#0F172A',
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  {habit.label || habit.habitName || "Habit"}
                </Text>

                {/* Subtitle */}
                <Text style={{
                  fontSize: 14,
                  color: '#475569',
                  textAlign: 'center',
                  marginBottom: 20,
                  lineHeight: 20,
                }}>
                  {habit.description || "Review your daily habit submission and its status."}
                </Text>

                {/* Habit Icon */}
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: COLORS.primary + "15",
                    borderColor: COLORS.primary,
                    borderWidth: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Icon name={habit.icon || "check"} size={40} color={COLORS.primary} />
                  </View>
                </View>

                {/* Status Badge */}
                {habit.status && (
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <View style={{
                      borderRadius: 20,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      backgroundColor: statusInfo.color + "20",
                      borderWidth: 1,
                      borderColor: statusInfo.color + "40",
                    }}>
                      <Text style={{
                        color: statusInfo.color,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                        fontSize: 16,
                      }}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Info Section */}
                <View style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  {/* Points */}
                  {(typeof habit.points === "number") && (
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E2E8F0',
                    }}>
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>
                        Points Earned
                      </Text>
                      <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '700' }}>
                        +{habit.points}
                      </Text>
                    </View>
                  )}

                  {/* Verified by */}
                  {habit.verifier && (
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottomWidth: habit.time ? 1 : 0,
                      borderBottomColor: '#E2E8F0',
                    }}>
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>
                        Verified By
                      </Text>
                      <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '600' }}>
                        {habit.verifier.name || habit.verifier.username}
                      </Text>
                    </View>
                  )}

                  {/* Submission time */}
                  {habit.time && (
                    <View style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: '#64748B', fontSize: 14, fontWeight: '500' }}>
                        Submitted At
                      </Text>
                      <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '500' }}>
                        {habit.time}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Proof image */}
                {habit.proofUrl && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{
                      color: '#0F172A',
                      fontWeight: '600',
                      marginBottom: 12,
                      fontSize: 16,
                    }}>
                      Your Submission
                    </Text>
                    <View style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: COLORS.primary + '30',
                    }}>
                      <Image
                        source={{ uri: habit.proofUrl }}
                        style={{
                          width: '100%',
                          height: 250,
                          backgroundColor: '#F1F5F9',
                        }}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                )}

                {/* Spacer */}
                <View style={{ height: 20 }} />
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}