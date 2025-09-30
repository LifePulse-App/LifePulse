// ResultScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  LayoutAnimation,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Card } from "@rneui/themed";
import Carousel from "react-native-reanimated-carousel";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import AppText from "../../../../components/Layout/AppText/AppText";
import AppActivityIndicator from "../../../../components/Layout/AppActivityIndicator/AppActivityIndicator";
import styles from "../../../student/components/adjustment-details/AdjustmentDetailScreenStyles";
import colors from "../../../../shared/styling/colors";
import api_User from "../../services/api_User";
import Toast from "react-native-toast-message";
import FontAwesome6Icon from "react-native-vector-icons/FontAwesome6";

// ✅ Dummy grouped results (backend-like response)
const dummyResults = {
  student_info: {
    name: "John Doe",
    student_id: "FA24-123",
  },
  results: {
    "Statistics": {
      Quiz: [
        {
          assessment: "Quiz 1",
          max_mark: "10",
          obtained_marks: "8.25",
          class_average: "7.0",
          percentage: "82.5",
        },
      ],
      Assignment: [
        {
          assessment: "Assignment 1",
          max_mark: "20",
          obtained_marks: "15",
          class_average: "14",
          percentage: "75",
        },
      ],
      Exam: [
        {
          assessment: "Mid Exam",
          max_mark: "50",
          obtained_marks: "40",
          class_average: "35",
          percentage: "80",
        },
        {
          assessment: "Final Exam",
          max_mark: "70",
          obtained_marks: "60",
          class_average: "55",
          percentage: "85",
        },
      ],
    },
  },
};

const UserList = ({ route, navigation }: any) => {
  
  const course_name = route.params.subjectName;

  const [loading, setLoading] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(true);
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [isExamOpen, setIsExamOpen] = useState(false);
  const [data, setData] = useState<any>();

  const fetchResults = async (courseName: string) => {
    setLoading(true);
    try {
      const response = await api_User.getResult(courseName);
      if (!response.ok) {
        Toast.show({ type: "error", text1: "Failed to fetch results." });
      } else {
        setData(response.data);
      }
    } catch (error) {
      Toast.show({ type: "error", text1: "Server is offline, try again later." });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (route.params?.subjectName) {
      // Uncomment when API is ready
       fetchResults(route.params.subjectName);
    }
  }, [route.params?.courseName]);

  const toggleAccordion = (type: "quiz" | "assignment" | "exam") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (type === "quiz") setIsQuizOpen(!isQuizOpen);
    if (type === "assignment") setIsAssignmentOpen(!isAssignmentOpen);
    if (type === "exam") setIsExamOpen(!isExamOpen);
  };

  // ✅ Extract grouped categories from data
  const courseResults = data?.results[course_name] || {};
  const quizzes = courseResults?.Quiz || [];
  const assignments = courseResults?.Assignment || [];
  const exams = courseResults?.Exam || [];

  return (
    <AppScreen style={styles.container}>
      <AppActivityIndicator visible={loading} />

      <View style={styles.headerContainer}>
        <Icon
          name="arrow-left"
          size={22}
          color={colors.black}
          onPress={() => navigation.navigate('Employee')}
          style={styles.backIcon}
        />
        <AppText style={styles.headerTitle}>Results - {course_name}</AppText>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Quizzes */}
        <Card containerStyle={styles.card}>
          <TouchableOpacity onPress={() => toggleAccordion("quiz")}>
            <View style={styles.cardHeadingContainer}>
              <MaterialIcon
                name="quiz"
                size={23}
                color="black"
                style={styles.iconStyle}
              />
              <AppText style={styles.cardheading}>Quizzes</AppText>
              <MaterialIcon
                name={isQuizOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={26}
                color="black"
                style={{ marginLeft: "55%" }}
              />
            </View>
          </TouchableOpacity>

          {isQuizOpen && (
  Array.isArray(quizzes) && quizzes.length > 0 ? (
    <Carousel
      loop
      width={Dimensions.get("window").width - 40}
      height={160}
      autoPlay
      autoPlayInterval={3000}
      scrollAnimationDuration={1500}
      data={quizzes}
      renderItem={({ item, index }) => (
        <Card key={index} containerStyle={styles.innercard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.leftBadge, { backgroundColor: "#509D4E" }]}>
              <AppText style={styles.badgeText}>{index + 1}</AppText>
            </View>
          </View>

          <View style={styles.blockPadding}>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Marks</AppText>
              <AppText style={{ color: "#509D4E", fontWeight: "bold", fontSize: 13 }}>
                {item.obtained_marks} / {item.max_mark}
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Percentage</AppText>
              <AppText style={{ color: "#509D4E", fontWeight: "bold", fontSize: 13 }}>
                {item.percentage}%
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Class Avg</AppText>
              <AppText style={{ color: "#509D4E", fontWeight: "bold", fontSize: 13 }}>
                {item.class_average}
              </AppText>
            </View>
          </View>
        </Card>
      )}
    />
  ) : (
    <Card containerStyle={styles.innercard}>
      <View style={{ alignItems: "center", padding: 20 }}>
        <AppText style={{ fontSize: 16, fontWeight: "600", color: "#666" }}>
          Nothing to show
        </AppText>
      </View>
    </Card>
  )
)}

        </Card>

        {/* Assignments */}
        <Card containerStyle={styles.card}>
          <TouchableOpacity onPress={() => toggleAccordion("assignment")}>
            <View style={styles.cardHeadingContainer}>
              <MaterialIcon
                name="assignment"
                size={23}
                color="black"
                style={styles.iconStyle}
              />
              <AppText style={styles.cardheading}>Assignments</AppText>
              <MaterialIcon
                name={
                  isAssignmentOpen
                    ? "keyboard-arrow-up"
                    : "keyboard-arrow-down"
                }
                size={26}
                color="black"
                style={{ marginLeft: "40%" }}
              />
            </View>
          </TouchableOpacity>

          {isAssignmentOpen && (
  Array.isArray(assignments) && assignments.length > 0 ? (
    <Carousel
      loop
      width={Dimensions.get("window").width - 40}
      height={160}
      autoPlay
      autoPlayInterval={3000}
      scrollAnimationDuration={1500}
      data={assignments}
      renderItem={({ item, index }) => (
        <Card key={index} containerStyle={styles.innercard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.leftBadge, { backgroundColor: "#314299" }]}>
              <AppText style={styles.badgeText}>{index + 1}</AppText>
            </View>
          </View>

          <View style={styles.blockPadding}>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Marks</AppText>
              <AppText style={{ color: "#314299", fontWeight: "bold", fontSize: 13 }}>
                {item.obtained_marks} / {item.max_mark}
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Percentage</AppText>
              <AppText style={{ color: "#314299", fontWeight: "bold", fontSize: 13 }}>
                {item.percentage}%
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Class Avg</AppText>
              <AppText style={{ color: "#314299", fontWeight: "bold", fontSize: 13 }}>
                {item.class_average}
              </AppText>
            </View>
          </View>
        </Card>
      )}
    />
  ) : (
    <Card containerStyle={styles.innercard}>
      <View style={{ alignItems: "center", padding: 20 }}>
        <AppText style={{ fontSize: 16, fontWeight: "600", color: "#666" }}>
          Nothing to show
        </AppText>
      </View>
    </Card>
  )
)}

        </Card>

        {/* Exams */}
        <Card containerStyle={styles.card}>
          <TouchableOpacity onPress={() => toggleAccordion("exam")}>
            <View style={styles.cardHeadingContainer}>
              <MaterialIcon
                name="school"
                size={23}
                color="black"
                style={styles.iconStyle}
              />
              <AppText style={styles.cardheading}>Mid & Final Exams</AppText>
              <MaterialIcon
                name={isExamOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={26}
                color="black"
                style={{ marginLeft: "25%" }}
              />
            </View>
          </TouchableOpacity>

          {isExamOpen && (
  Array.isArray(exams) && exams.length > 0 ? (
    <Carousel
      loop
      width={Dimensions.get("window").width - 40}
      height={160}
      autoPlay
      autoPlayInterval={3000}
      scrollAnimationDuration={1500}
      data={exams}
      renderItem={({ item, index }) => (
        <Card key={index} containerStyle={styles.innercard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.leftBadge, { backgroundColor: "#314299" }]}>
              <AppText style={styles.badgeText}>{index + 1}</AppText>
            </View>

            <View style={[styles.rightBadge, { backgroundColor: "#314299" }]}>
              <AppText style={styles.badgeText}>{item.assessment}</AppText>
            </View>
          </View>

          <View style={styles.blockPadding}>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Marks</AppText>
              <AppText style={{ color: "#314299", fontWeight: "bold", fontSize: 13 }}>
                {item.obtained_marks} / {item.max_mark}
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Percentage</AppText>
              <AppText style={{ color: "#314299", fontWeight: "bold", fontSize: 13 }}>
                {item.percentage}%
              </AppText>
            </View>
            <View style={styles.textContainer}>
              <AppText style={styles.textHeading}>Class Avg</AppText>
              <AppText style={{ color: "#314299", fontWeight: "bold", fontSize: 13 }}>
                {item.class_average}
              </AppText>
            </View>
          </View>
        </Card>
      )}
    />
  ) : (
    <Card containerStyle={styles.innercard}>
      <View style={{ alignItems: "center", padding: 20 }}>
        <AppText style={{ fontSize: 16, fontWeight: "600", color: "#666" }}>
          Nothing to show
        </AppText>
      </View>
    </Card>
  )
)}

        </Card>
      </ScrollView>
    </AppScreen>
  );
};

export default UserList;
