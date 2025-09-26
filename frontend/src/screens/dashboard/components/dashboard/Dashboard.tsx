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
import colors from '../../../../shared/styling/colors';
import { RoleName } from '../../../../shared/config/enum';
import { DashboardEmployeeSummaryResponse } from '../../models/dashboard/DashboardEmployeeSummaryResponse';
import { DashboardStudentSummaryResponse } from '../../models/dashboard/DashboardStudentSummaryResponse';
import sharedApi from '../../../../shared/services/shared-api';
import Toast from 'react-native-toast-message';


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
  const [Employee_Summary, setEmployee_Summary] =
    useState<DashboardEmployeeSummaryResponse>();
  const [Student_Summary, setStudent_Summary] =
    useState<DashboardStudentSummaryResponse>();
    const [carouselSwipeEnabled, setCarouselSwipeEnabled] = useState(false); // ❌ Disabled at start


  const getDashboardSummary = async () => {
    let Branches = '';
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin) {
      Branches = value.toString();
    } else {
      Branches =
        authContext?.User?.InstituteProfile.DefaultBranchId?.toString() ?? '';
    }

    setLoading(true);

    const Employee_Response = await api.getDashboardEmployeeSummary(
      authContext?.User?.InstituteId || 0,
      Branches,
    );

    // const requestResponse = await sharedApi.RefreshToken();
    // console.log(requestResponse);
    

    if (!Employee_Response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: 'Error Getting Employee Data'});
      
    }

    if (
      typeof Employee_Response.data === 'object' &&
      Employee_Response.data !== null
    ) {
      setEmployee_Summary(Employee_Response.data);
    }

    const Student_Response = await api.getDashboardStudentSummary(
      authContext?.User?.InstituteId || 0,
      Branches,
    );

    if (!Student_Response.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: 'Error Getting Student Data'});
    }

    if (
      typeof Student_Response.data === 'object' &&
      Student_Response.data !== null
    ) {
      setStudent_Summary(Student_Response.data);
    }

    setLoading(false);
  };

  const getBranchList = async () => {
   // console.log(authContext?.BranchList);
    if (
      authContext?.User?.RoleName === RoleName.SchoolAdmin
    ) {
      const response = await sharedApi.getBranchList(
        authContext?.User?.InstituteId,
        '',
      );
      

      if (!response.ok) {
        setLoading(false);
        return Toast.show({ type: 'error', text1: 'Error Getting Branch List'});
      }

      if (typeof response.data === 'object' && response.data !== null) {
        const data = response.data.map(item => ({
          label: item.BranchName,
          value: item.BranchId.toString(),
        }));

        //data.unshift({ label: 'Select All', value: 'all' });
        

        setItems(data);
        
        

        authContext?.setBranchList(response.data);
      }
    }

    setValue([authContext?.User?.BranchId?.toString() || '']);
    authContext?.setSelectedBranch([
      authContext?.User?.BranchId.toString() || '',
    ]);
  };

  useEffect(() => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin) {
      getBranchList();
      getDashboardSummary();
    } else {
      getBranchList();
      getDashboardSummary();
    }
  }, []);

  useEffect(() => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin) {
      if (
        !open &&
        value.length > 0 &&
        JSON.stringify(value) !==
          JSON.stringify(authContext?.SelectedBranch)
      ) {
        authContext?.setSelectedBranch(value);
        getDashboardSummary();
      } else if (!open &&
        value.length > 0 &&
        JSON.stringify(value) ===
        JSON.stringify(authContext?.SelectedBranch)){
        authContext?.setSelectedBranch(value);
        getDashboardSummary();
      }
    }
  }, [open, value]);
  

  return (
    <MainLayout>
        <View style={{ flex: 1 }}>
          <AppScreen style={styles.container}>
            <View style={styles.uppercontainer}>
              <View style={styles.Iconcontainer}>
                <Icon
                  color={colors.white}
                  size={25}
                  name="menu"
                  onPress={() => navigation.openDrawer()}
                />
              </View>
              <AppText
                style={{
                  textAlign: 'start',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginRight: '10%',
                }}
              >
                Welcome To Dashboard
              </AppText>
            </View>
  
            {authContext?.User?.RoleName === RoleName.SchoolAdmin && (
              <DropDownPicker
                textStyle={{
                  fontFamily: defaultstyles.text.fontFamily,
                  fontSize: 12,
                  fontWeight: '500',
                }}
                multiple={true}
                min={1}
                open={open}
                value={value}
                items={items}
                setOpen={setOpen}
                setValue={setValue}
                setItems={setItems}
                maxHeight={300}
                searchable={true}
                showTickIcon={true}
                listMode="FLATLIST"
                mode="BADGE"
                placeholder="Select Branch..."
                disabled={loading}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                listItemContainerStyle={styles.dropdownItem}
                labelStyle={styles.dropdownLabel}
                placeholderStyle={styles.dropdownPlaceholder}
              />
            )}
  
            <AppActivityIndicator visible={loading} />
  
            <ScrollView>
         
                <BranchSummarySection
                  StudentSummary={Student_Summary}
                  EmployeeSummary={Employee_Summary}
                  swipeEnabled={carouselSwipeEnabled}
                />
                <FinanceSummarySection
                  financeSummary={Student_Summary?.DashboardFinanceSummary}
                  payrollSummary={Employee_Summary?.PayrollSummary}
                  swipeEnabled={carouselSwipeEnabled}
                />
                <AttendanceSummarySection
                  StudentSummary={Student_Summary}
                  EmployeeSummary={Employee_Summary}
                  swipeEnabled={carouselSwipeEnabled}
                />
          
            </ScrollView>
          </AppScreen>
        </View>
    </MainLayout>
  );
  
};

export default Dashboard;
