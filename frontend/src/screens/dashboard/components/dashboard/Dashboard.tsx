// screens/Dashboard/Dashboard.tsx

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { Text } from "@rneui/themed";
import { Image } from "@rneui/base";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import MainLayout from "../../../../shared/components/MainLayout";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";

const Dashboard = () => {
  const [level, setLevel] = useState(3);
  const [xp, setXp] = useState(1200);
  const xpRequired = 2000;

  const habits = [
    { id: "1", label: "Drink Water", time: "Morning", icon: "water" },
    { id: "2", label: "Meditate", time: "Morning", icon: "meditation" },
    { id: "3", label: "Read", time: "Evening", icon: "book-open-variant" },
  ];

  return (
    <MainLayout>
      <AppScreen style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 🔥 Streak + Home */}
          <View style={styles.header}>
            <View style={styles.streakBox}>
              <Icon name="fire" size={24} color="orange" />
              <Text style={styles.streakText}>12</Text>
            </View>
            <Text style={styles.headerTitle}>Home</Text>
            
          </View>

          {/* 🎯 Level Progress */}
          <View style={styles.progressContainer}>
            <AnimatedCircularProgress
              size={150}
              width={12}
              fill={(xp / xpRequired) * 100}
              fillLineCap="round"
              rotation={0}
              tintColor="#6A0DFF"
              backgroundColor="#E0CFFF"
            >
              {() => (
                <View style={styles.levelCircle}>
                  <Text style={styles.levelText}>Level</Text>
                  <Text style={styles.levelNumber}>{level}</Text>
                </View>
              )}
            </AnimatedCircularProgress>
            <Text style={styles.levelLabel}>Mood Master</Text>
            <Text style={styles.xpText}>
              {xp} / {xpRequired} XP
            </Text>
          </View>

          {/* 😊 Log Mood Button */}
          <TouchableOpacity style={styles.logMoodButton}>
            <Icon name="emoticon-happy-outline" size={20} color="white" />
            <Text style={styles.logMoodText}>Log Today's Mood</Text>
          </TouchableOpacity>

          {/* ✅ Today’s Habits */}
          <Text style={styles.sectionTitle}>Today's Habits</Text>
          <FlatList
            data={habits}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.habitRow}>
                <View style={styles.habitLeft}>
                  <Icon
                    name={item.icon}
                    size={28}
                    color="#6A0DFF"
                    style={{ marginRight: 10 }}
                  />
                  <View>
                    <Text style={styles.habitLabel}>{item.label}</Text>
                    <Text style={styles.habitTime}>{item.time}</Text>
                  </View>
                </View>
                <View style={styles.checkbox} />
              </View>
            )}
          />
        </ScrollView>
      </AppScreen>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakText: {
    marginLeft: 5,
    fontWeight: "600",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginRight: "40%"
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  levelCircle: {
    justifyContent: "center",
    alignItems: "center",
  },
  levelText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6A0DFF",
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#6A0DFF",
  },
  levelLabel: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
  },
  xpText: {
    fontSize: 14,
    color: "#6A0DFF",
    fontWeight: "bold"
  },
  logMoodButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6A0DFF",
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 30,
    shadowColor: "#6A0DFF",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  logMoodText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
  },
  habitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  habitTime: {
    fontSize: 12,
    color: "gray",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#6A0DFF",
  },
});

export default Dashboard;
