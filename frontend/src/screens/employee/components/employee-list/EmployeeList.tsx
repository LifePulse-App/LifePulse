import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import MainLayout from '../../../../shared/components/MainLayout';
import colors from '../../../../shared/styling/lightModeColors';
import { DashboardResponse } from '../../../dashboard/models/dashboard/DashboardResponse';
import api_Login from '../../../login/services/api_Login';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const EmployeeList = ({navigation}: any) => {
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
      //console.log(dashboard.student.dashboard.classes);
      
      return dashboard.student.dashboard.classes;
    }

    setLoading(false);
    return [];
  };

  useEffect(() => {
    const load = async () => {
      const data = await fetchClasses();
      setClasses(data);
    };
    load();
  }, []);

  const renderItem = ({ item,index }: any) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('User', {
            screen: 'UserList',
            params: { subjectName: item.course_name },
          })
        }
      >
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.title}>{index + 1}. {item.course_name}</AppText>
            <AppText style={styles.subtitle}>{item.instructor}</AppText>

            <View style={styles.row}>
              <AppText style={styles.detail}>{item.course_code}</AppText>
              <AppText style={styles.detail}>{item.semester}</AppText>
              <AppText style={styles.detail}>Credit Hrs: {item.credits}</AppText>
            </View>
          </View>

          {/* Right Arrow Icon */}
          <Icon name="chevron-right" size={28} color={colors.primary} />
        </View>
      </TouchableOpacity>
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
              marginLeft: '6%',
            }}
          >
            Courses & Results
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

export default EmployeeList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  uppercontainer: {
    backgroundColor: colors.primary,
    height: 50,
    marginBottom: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 0 : 20,
  },
  card: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    padding: 15,
    marginBottom: 12,
    borderBottomColor: colors.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
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
    marginTop: 5,
  },
  detail: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: "bold"
  },
});
