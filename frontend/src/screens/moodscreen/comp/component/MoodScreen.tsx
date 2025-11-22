import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import MainLayout from "../../../../shared/components/MainLayout";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import GlassyErrorModal from "../../../../shared/components/GlassyErrorModal";
import MoodService from "../../services/api_mood"; // <-- new service

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";
const ICON_GLASS_BG = "rgba(15, 23, 42, 0)";

const MOOD_GROUPS = [
  {
    id: "positive",
    title: "Feeling good",
    description: "Positive, energized, or calm",
    moods: [
      { id: "ecstatic", label: "Ecstatic", icon: "emoticon-excited-outline" },
      { id: "happy", label: "Happy", icon: "emoticon-happy-outline" },
      { id: "grateful", label: "Grateful", icon: "hand-heart-outline" },
      { id: "calm", label: "Calm", icon: "meditation" },
      { id: "relaxed", label: "Relaxed", icon: "emoticon-neutral-outline" },
      { id: "lovely", label: "Lovely", icon: "heart-outline" }, // your new mood
    ],
  },
  {
    id: "neutral",
    title: "In the middle",
    description: "Neutral or mixed feelings",
    moods: [
      { id: "neutral", label: "Okay", icon: "emoticon-neutral-outline" },
      { id: "meh", label: "Meh", icon: "minus-circle-outline" },
      { id: "tired", label: "Tired", icon: "sleep" },
      { id: "confused", label: "Confused", icon: "help-circle-outline" },
    ],
  },
  {
    id: "low",
    title: "Feeling low",
    description: "Sad, lonely, or down",
    moods: [
      { id: "sad", label: "Sad", icon: "emoticon-sad-outline" },
      { id: "lonely", label: "Lonely", icon: "account-off-outline" },
      {
        id: "discouraged",
        label: "Discouraged",
        icon: "arrow-down-bold-circle-outline",
      },
      { id: "numb", label: "Numb", icon: "emoticon-dead-outline" },
    ],
  },
  {
    id: "anxious",
    title: "On edge",
    description: "Stressed, anxious, overwhelmed",
    moods: [
      { id: "anxious", label: "Anxious", icon: "alert-circle-outline" },
      { id: "stressed", label: "Stressed", icon: "clock-alert-outline" },
      { id: "overwhelmed", label: "Overwhelmed", icon: "water" },
    ],
  },
  {
    id: "angry",
    title: "Irritated or angry",
    description: "Irritated, frustrated, or mad",
    moods: [
      { id: "annoyed", label: "Annoyed", icon: "emoticon-angry-outline" },
      { id: "frustrated", label: "Frustrated", icon: "emoticon-angry-outline" },
      { id: "angry", label: "Angry", icon: "emoticon-angry-outline" },
    ],
  },
];

const MoodScreen = ({ navigation }: any) => {
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSelectMood = (moodId: string) => {
    setSelectedMoodId(moodId);
  };

  const handleSubmit = async () => {
    if (!selectedMoodId) {
      showError("Please pick how you feel right now.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await MoodService.logMood(selectedMoodId);

      if (!res.data?.success) {
        showError(res.data?.message || "Failed to save mood");
        return;
      }

      // success -> go back to dashboard, which will recalc XP and show latest mood
      navigation.goBack?.();
    } catch (err: any) {
      console.log("Mood save error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save mood";
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <MainLayout>
        <AppScreen style={styles.root}>
          <View style={styles.baseBackground} />
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          <StatusBar
            barStyle="light-content"
            translucent
            backgroundColor="transparent"
          />

          <View style={styles.overlay}>
            <View style={styles.topBar}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.iconGlass}
                onPress={() => navigation.goBack?.()}
              >
                <Icon name="arrow-left" size={22} color="#E5E7EB" />
              </TouchableOpacity>

              <View style={styles.topBarRight}>
                <Text style={styles.topTitle}>Share your mood</Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.mainTitle}>How are you feeling today?</Text>
              <Text style={styles.subtitle}>
                Tap one mood that best matches your current state. This helps us
                track your mood journey over time.
              </Text>

              {MOOD_GROUPS.map((group) => (
                <View key={group.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.sectionTitle}>{group.title}</Text>
                      <Text style={styles.sectionHint}>
                        {group.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.moodGrid}>
                    {group.moods.map((mood) => {
                      const isSelected = selectedMoodId === mood.id;
                      return (
                        <TouchableOpacity
                          key={mood.id}
                          activeOpacity={0.85}
                          style={[
                            styles.moodItem,
                            isSelected && styles.moodItemSelected,
                          ]}
                          onPress={() => handleSelectMood(mood.id)}
                        >
                          <View style={styles.moodIconWrap}>
                            <Icon
                              name={mood.icon}
                              size={24}
                              color={isSelected ? "#F9FAFB" : "#C4B5FD"}
                            />
                          </View>
                          <Text
                            style={[
                              styles.moodLabel,
                              isSelected && styles.moodLabelSelected,
                            ]}
                          >
                            {mood.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.glassButton,
                  (!selectedMoodId || submitting) && { opacity: 0.7 },
                ]}
                onPress={submitting ? undefined : handleSubmit}
              >
                <View style={styles.glassButtonInner}>
                  <Icon
                    name={submitting ? "loading" : "check-circle-outline"}
                    size={22}
                    color="#F9FAFB"
                  />
                  <Text style={styles.glassButtonText}>
                    {submitting ? "Saving..." : "Save mood"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </AppScreen>
      </MainLayout>

      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage || ""}
        onClose={hideError}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  baseBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(168, 85, 247, 0.35)",
  },
  overlay: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? "3%" : "5%",
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "3%",
  },
  topBarRight: {
    flex: 1,
    alignItems: "center",
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: ICON_GLASS_BG,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 0,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  topTitle: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "700",
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 18,
  },
  card: {
    backgroundColor: GLASS_BG,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  sectionHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  moodItem: {
    width: "31%",
    marginHorizontal: "1.5%",
    marginBottom: 10,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.5)",
    alignItems: "center",
  },
  moodItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.95)",
    borderColor: "rgba(191, 219, 254, 0.9)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  moodIconWrap: {
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 11,
    color: "#E5E7EB",
    textAlign: "center",
  },
  moodLabelSelected: {
    color: "#F9FAFB",
    fontWeight: "700",
  },
  glassButton: {
    marginTop: 4,
    marginBottom: 1,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(30, 64, 175, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.7)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  glassButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  glassButtonText: {
    color: "#F9FAFB",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },
});

export default MoodScreen;