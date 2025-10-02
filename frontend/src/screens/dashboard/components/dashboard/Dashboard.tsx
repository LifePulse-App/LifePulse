// screens/Dashboard/Dashboard.tsx

import React, { useContext, useEffect, useState } from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

import {
  Alert,
  ScrollView,
  View,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import MainLayout from '../../../../shared/components/MainLayout';

import BranchSummarySection from '../branchsummary/BranchSummarySection';
import FinanceSummarySection from '../financesummary/FinanceSummarySection';
import AttendanceSummarySection from '../attendancesummary/AttendanceSummarySection';
import api from "../../services/api_dashboard"
import AuthContext from '../../../../auth/user/UserContext';
import styles from '../../../../shared/styling/styles';
import defaultstyles from '../../../../shared/styling/styles';
import colors from '../../../../shared/styling/lightModeColors';
import { RoleName } from '../../../../shared/config/enum';
import { DashboardEmployeeSummaryResponse } from '../../models/dashboard/DashboardEmployeeSummaryResponse';
import { DashboardStudentSummaryResponse } from '../../models/dashboard/DashboardStudentSummaryResponse';
import sharedApi from '../../../../shared/services/shared-api';
import Toast from 'react-native-toast-message';
import api_Login from '../../../login/services/api_Login';
import { DashboardResponse } from '../../models/dashboard/DashboardResponse';
import { Image } from '@rneui/base';


const Dashboard = ({ navigation }: any) => {
  interface ItemType {
    label: string;
    value: string;
  }

  const authContext = useContext(AuthContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string[]>([]);
  const [items, setItems] = useState<ItemType[]>([]);
  const [Dashboard_Summary, setDashboard_Summary] =
    useState<DashboardResponse>();
    const [carouselSwipeEnabled, setCarouselSwipeEnabled] = useState(false); // ❌ Disabled at start


  const getDashboardSummary = async () => {

    setLoading(true);

    const Dashboard_Response = await api_Login.GetProfile();

    if (!Dashboard_Response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: 'Error Getting Data'});
      
    }

    if (
      typeof Dashboard_Response.data === 'object' &&
      Dashboard_Response.data !== null
    ) {
      setDashboard_Summary(Dashboard_Response.data);
    }

    setLoading(false);
  };

  useEffect(() => {
      getDashboardSummary();
  }, []);
  
  return (
    <MainLayout>
        <View style={{ flex: 1 }}>
          <AppScreen style={styles.container}>
          <View style={styles.uppercontainer}>
  <Image
    source={require('../../../../shared/assets/logoo.png')} // ✅ replace with your logo path
    style={styles.logo}
    resizeMode="contain"
  />
  <AppText style={styles.welcomeText}>
    Nust Student Portal
  </AppText>
</View>

            <AppActivityIndicator visible={loading} />
  
            <ScrollView>
         
                <BranchSummarySection
                  StudentSummary={Dashboard_Summary?.student?.student_info}
                  DashboardSummary={Dashboard_Summary?.student?.dashboard}
                  swipeEnabled={carouselSwipeEnabled}
                />
                  <FinanceSummarySection
                  DashboardSummary={Dashboard_Summary?.student?.dashboard}
                  swipeEnabled={carouselSwipeEnabled}
                />
                  <AttendanceSummarySection
                  DashboardSummary={Dashboard_Summary?.student?.dashboard}
                  swipeEnabled={carouselSwipeEnabled}
                /> 
          
            </ScrollView>
          </AppScreen>
        </View>
    </MainLayout>
  );
  
};

export default Dashboard;
