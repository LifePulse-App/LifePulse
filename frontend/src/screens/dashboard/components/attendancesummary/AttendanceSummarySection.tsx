import React, { useRef, useState } from 'react';
import { View, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Card } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppText from '../../../../components/Layout/AppText/AppText';
import { DashboardEmployeeSummaryResponse } from '../../models/dashboard/DashboardEmployeeSummaryResponse';
import { DashboardStudentSummaryResponse } from '../../models/dashboard/DashboardStudentSummaryResponse';
import styles from "../../../../shared/styling/styles"

interface Props {
  EmployeeSummary?: DashboardEmployeeSummaryResponse;
  StudentSummary?: DashboardStudentSummaryResponse;
  swipeEnabled: boolean; // 👈 new prop added
}

const AttendanceSummarySection: React.FC<Props> = ({
  EmployeeSummary,
  StudentSummary,
  swipeEnabled
}) => {
  const width = Dimensions.get('window').width;

  const [expanded, setExpanded] = useState(false); // collapsed by default
  const carouselRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const data = [
    {
      key: 'student-daily',
      heading: 'Student Daily Summary',
      icon: 'school',
      values: [
        { label: 'Total Students', value: StudentSummary?.DailyAttendanceSummary.TotalPersons },
        { label: 'Presents', value: StudentSummary?.DailyAttendanceSummary.TotalPresents },
        { label: 'Absents', value: StudentSummary?.DailyAttendanceSummary.TotalAbsents },
        { label: 'Half Leave', value: StudentSummary?.DailyAttendanceSummary.TotalHalfLeave },
        { label: 'Leave', value: StudentSummary?.DailyAttendanceSummary.TotalLeave },
      ],
    },
    {
      key: 'student-monthly',
      heading: 'Student Monthly Summary',
      icon: 'school',
      values: [
        { label: 'Total Students', value: StudentSummary?.MonthlyAttendanceSummary.TotalPersons },
        { label: 'Presents', value: StudentSummary?.MonthlyAttendanceSummary.TotalPresents },
        { label: 'Absents', value: StudentSummary?.MonthlyAttendanceSummary.TotalAbsents },
        { label: 'Half Leave', value: StudentSummary?.MonthlyAttendanceSummary.TotalHalfLeave },
        { label: 'Leave', value: StudentSummary?.MonthlyAttendanceSummary.TotalLeave },
      ],
    },
    {
      key: 'employee-daily',
      heading: 'Employee Daily Summary',
      icon: 'groups',
      values: [
        { label: 'Total Employees', value: EmployeeSummary?.DailyAttendanceSummary.TotalPersons },
        { label: 'Presents', value: EmployeeSummary?.DailyAttendanceSummary.TotalPresents },
        { label: 'Absents', value: EmployeeSummary?.DailyAttendanceSummary.TotalAbsents },
        { label: 'Half Leave', value: EmployeeSummary?.DailyAttendanceSummary.TotalHalfLeave },
        { label: 'Leave', value: EmployeeSummary?.DailyAttendanceSummary.TotalLeave },
      ],
    },
    {
      key: 'employee-monthly',
      heading: 'Employee Monthly Summary',
      icon: 'groups',
      values: [
        { label: 'Total Employees', value: EmployeeSummary?.MonthlyAttendanceSummary.TotalPersons },
        { label: 'Presents', value: EmployeeSummary?.MonthlyAttendanceSummary.TotalPresents },
        { label: 'Absents', value: EmployeeSummary?.MonthlyAttendanceSummary.TotalAbsents },
        { label: 'Half Leave', value: EmployeeSummary?.MonthlyAttendanceSummary.TotalHalfLeave },
        { label: 'Leave', value: EmployeeSummary?.MonthlyAttendanceSummary.TotalLeave },
      ],
    },
  ];

  return (
    <Card containerStyle={styles.cardCarosal}>
      <TouchableOpacity style={styles.mainHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.cardHeadingContainer}>
          <Icon name="today" size={22} color="black" style={styles.iconStyle} />
          <AppText style={styles.cardHeading}>Attendance Summary</AppText>
          <Icon
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={26}
            color="black"
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View>
        <Carousel
        ref={carouselRef}
        width={width - 30}
        height={215}
        data={data}
        pagingEnabled
        loop
        autoPlay={true}
        enabled={swipeEnabled} // 👈 dynamic control // 🚫 disables swipe gestures!
        scrollAnimationDuration={1500}
        style={{ alignSelf: 'center' }}
        onSnapToItem={(index) => setCurrentIndex(index)}
          renderItem={({ item }) => (
            <Card containerStyle={styles.innercardCarosal} key={item.key}>
              <View style={styles.summaryHeader}>
                <View style={styles.leftBadge}>
                  <AppText style={styles.badgeText}>{item.heading}</AppText>
                </View>
                <View style={styles.rightBadge}>
                  <Icon name={item.icon} size={15} color="white" />
                </View>
              </View>

              {item.values.map((entry, index) => (
                <View style={styles.blockPadding} key={index}>
                  <View style={styles.textConatiner}>
                    <AppText style={styles.textHeading}>{entry.label}:</AppText>
                    <AppText style={styles.textSubheading}>{entry.value ?? '-'}</AppText>
                  </View>
                </View>
              ))}
            </Card>
          )}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 20 }}>
      <TouchableOpacity 
      disabled={currentIndex === 0}
              onPress={() => {
                const prevIndex = Math.max(currentIndex - 1, 0);
                carouselRef.current?.scrollTo({ index: prevIndex });
                setCurrentIndex(prevIndex);
              }}
>
        <Icon name="chevron-left" size={24} />
      </TouchableOpacity>
      <TouchableOpacity  
      disabled={currentIndex === data.length - 1}
              onPress={() => {
                const nextIndex = Math.min(currentIndex + 1, data.length - 1);
                carouselRef.current?.scrollTo({ index: nextIndex });
                setCurrentIndex(nextIndex);
              }}>
        <Icon name="chevron-right" size={24} />
      </TouchableOpacity>
    </View>
        </View>
      )}
    </Card>
  );
};

export default AttendanceSummarySection;
