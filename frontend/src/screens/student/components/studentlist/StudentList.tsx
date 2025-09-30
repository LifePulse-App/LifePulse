import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import MainLayout from '../../../../shared/components/MainLayout';
import * as Progress from 'react-native-progress';
import colors from '../../../../shared/styling/colors';
import { DashboardResponse } from '../../../dashboard/models/dashboard/DashboardResponse';
import api_Login from '../../../login/services/api_Login';
import Toast from 'react-native-toast-message';

const StudentList = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    const Dashboard_Response = await api_Login.GetProfile();
    

    if (!Dashboard_Response.ok) {
      setLoading(false);
      Toast.show({ type: 'error', text1: 'Error Getting Data' });
      return [];
    }
    
    if (
      typeof Dashboard_Response.data === 'object'
    ) {
      const dashboard = Dashboard_Response.data as DashboardResponse;
      setLoading(false);
      return dashboard.student.dashboard.classes; // ✅ return classes here
    }

    setLoading(false);
     return []
    // {  _id: '67dbc670805df0eb70672a5f',
    //   course_name: 'Database Systems',
    //   instructor: 'Aamna Saeed',
    //   course_code: 'CS-220',
    //   credits: 4,
    //   attendance: '100.0%',
    //   semester: 'Spring 2025',
    //   href: 'https://qalam.nust.edu.pk/student/course/gradebook/1985684',
    // },
    // {
    //   _id: '67dbc670805df0eb70672a5f',
    //   course_name: 'skmnsnkj',
    //   instructor: 'Aamna Saeed',
    //   course_code: 'CS-220',
    //   credits: 4,
    //   attendance: '76.0%',
    //   semester: 'Spring 2025',
    //   href: 'https://qalam.nust.edu.pk/student/course/gradebook/1985684',
    // },
    // {
    //   _id: '67dbc670805df0eb70672a5g',
    //   course_name: 'Object Oriented Programming',
    //   instructor: 'Muhammad Shahzad',
    //   course_code: 'CS-212',
    //   credits: 4,
    //   attendance: '72.0%',
    //   semester: 'Spring 2025',
    //   href: 'https://qalam.nust.edu.pk/student/course/gradebook/1985685',
    // },];
  };

  useEffect(() => {
    const load = async () => {
      const data = await fetchClasses();
      setClasses(data);
    };
    load();
  }, []);
  

  const renderItem = ({ item }: any) => {
    const percentage = parseFloat(item.attendance.replace('%', '')) / 100;

    return (
      <View style={styles.card}>
        {/* Course + Instructor */}
        <AppText style={styles.title}>{item.course_name}</AppText>
        <AppText style={styles.subtitle}>{item.instructor}</AppText>

        {/* Details */}
        <View style={styles.row}>
          <AppText style={styles.detail}>{item.course_code}</AppText>
          <AppText style={styles.detail}>{item.semester}</AppText>
          <AppText style={styles.detail}>Credit Hrs: {item.credits}</AppText>
        </View>

        {/* Attendance Bar */}
        <View style={styles.progressRow}>
          <Progress.Bar
            progress={percentage}
            width={200}
            height={12}
            borderRadius={8}
            borderColor="grey"
            color={
              percentage >= 0.8
                ? colors.success
                : percentage >= 0.73
                ? colors.warning
                : colors.danger
            }
            unfilledColor="#e0e0e0"
          />
          <AppText style={styles.attendanceText}>{item.attendance}</AppText>
        </View>

        {/* Clickable link */}

      </View>
    );
  };

  return (
    <MainLayout>
      <AppScreen style={styles.container}>
        <AppActivityIndicator visible={loading} />

        <View style={styles.uppercontainer}>
          <AppText
            style={{
              textAlign: 'start',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18,
              marginLeft: '0%',
            }}
          >
            Semester Attendance
          </AppText>
        </View>

        {!loading && (
          <FlatList
            data={classes}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </AppScreen>
    </MainLayout>
  );
};

export default StudentList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  uppercontainer: {
    backgroundColor: colors.primary,
    height: 60,
    marginBottom: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 0 : 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 7,
    marginBottom: 5,
    elevation: 3,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.medium,
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detail: {
    fontSize: 12,
    color: colors.dark,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 0,
  },
  attendanceText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  link: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 5,
    textDecorationLine: 'underline',
  },
});
