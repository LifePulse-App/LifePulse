import {
  Alert,
  FlatList,
  TextInput,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import React, { useContext, useEffect, useState } from 'react';

import styles from '../../../../shared/styling/styles';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../../../../shared/styling/colors';
import AuthContext from '../../../../auth/user/UserContext';
import defaultstyles from '../../../../shared/styling/styles';
import { RoleName } from '../../../../shared/config/enum';
import api_Employee from '../../services/api_Employee';
import EmployeeListItem from '../employee-list-items/EmployeeListItem';
import { EmployeeListResponse } from '../../models/EmployeeListResponse';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import MainLayout from '../../../../shared/components/MainLayout';
import WheelPickerModal from '../../../../shared/components/Wheel';
import Toast from 'react-native-toast-message';

const EmployeeList = ({ navigation }: any) => {
  const [EmployeeList, setEmployeeList] = useState<EmployeeListResponse>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [InitialEmployeeList, setInitialEmployeeList] = useState<EmployeeListResponse>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<{ label: string; value: string }[]>([]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [dataFetched, setDataFetched] = useState<boolean>(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentPicker, setCurrentPicker] = useState<'branch' | null>(null);

  const authContext = useContext(AuthContext);

  const handleSearch = (query: string) => {
    const filtered = InitialEmployeeList.filter(emp => {
      const q = query.toLowerCase();
      return (
        emp.FirstName.toLowerCase().includes(q) ||
        emp.LastName.toLowerCase().includes(q) ||
        emp.DepartmentName.toLowerCase().includes(q) ||
        emp.BranchName.toLowerCase().includes(q) ||
        emp.ContactNumber.toLowerCase().includes(q) ||
        emp.EmployeeId.toString().includes(q) ||
        emp.Gender.toLowerCase().includes(q)
      );
    });

    setEmployeeList(filtered);
    setSearchQuery(query);
  };

  const getEmployeeListById = async (branchId: string) => {
    setLoading(true);

    const res = await api_Employee.getEmployeeList(
      authContext?.User?.InstituteId || 0,
      branchId,
      1,
      1000
    );

    if (!res.ok) {
      setLoading(false);
      return Toast.show({ type: 'error', text1: 'Error Getting Employee List'});
    }

    if (Array.isArray(res.data)) {
      setInitialEmployeeList(res.data);
      setEmployeeList(res.data);
    }

    setDataFetched(true);
    setLoading(false);
  };

  const getBranchList = async () => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin && authContext?.BranchList) {
      const branchData = authContext.BranchList.map(b => ({
        label: b.BranchName,
        value: b.BranchId.toString(),
      }));
      setItems(branchData);

      const defaultBranchId = authContext?.User?.InstituteProfile.DefaultBranchId?.toString() || '';
      if (defaultBranchId) {
        setValue(defaultBranchId);
        authContext?.setSelectedBranch(defaultBranchId);
        await getEmployeeListById(defaultBranchId);
      }
    }
  };

  const getEmployeeList = async () => {
    const BranchID =
      authContext?.User?.RoleName === RoleName.SchoolAdmin
        ? value
        : authContext?.User?.InstituteProfile.DefaultBranchId?.toString() ?? '';

    if (!BranchID) {
      setEmployeeList([]);
      setInitialEmployeeList([]);
      setLoading(false);
      setDataFetched(false);
      return;
    }

    await getEmployeeListById(BranchID);
  };

  const handleSelect = (val: string) => {
    setValue(val);
    authContext?.setSelectedBranch(val);
    setPickerVisible(false);
    if (val) {
      getEmployeeListById(val);
    } else {
      setEmployeeList([]);
      setInitialEmployeeList([]);
      setDataFetched(false);
    }
  };

  useEffect(() => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin) {
      getBranchList();
    }
    if (authContext?.User?.RoleName !== RoleName.SchoolAdmin) {
      getEmployeeList();
    }
  }, []);

  const shouldShowList =
    authContext?.User?.RoleName !== RoleName.SchoolAdmin || !!value;

  return (
    <MainLayout>
      <AppScreen style={styles.containerEmployeeList}>
        <AppActivityIndicator visible={loading} />

        {/* Top Bar */}
        <View style={styles.topBar}>
          <Icon
            color={colors.primary}
            size={30}
            name="menu"
            onPress={() => navigation.openDrawer()}
          />
        </View>

        {/* Branch Selector for Admin */}
        {authContext?.User?.RoleName === RoleName.SchoolAdmin && (
          <View style={styles.dropdownRow}>
            <TouchableOpacity
              style={[styles.dropdownButton, !items.length && styles.disabled]}
              onPress={() => {
                setCurrentPicker('branch');
                setPickerVisible(true);
              }}
              disabled={!items.length}
            >
              <AppText style={styles.dropdownText}>
                {items.find(i => i.value === value)?.label || 'Select Branch'}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Box */}
        {shouldShowList && (
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search employees..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        )}

        {/* List */}
        {!shouldShowList ? (
          <View style={styles.noDataContainer}>
            <AppText style={styles.noDataText}>Please select a branch</AppText>
          </View>
        ) : dataFetched && EmployeeList.length === 0 ? (
          <View style={styles.noDataContainer}>
            <AppText style={styles.noDataText}>No employees found</AppText>
          </View>
        ) : (
          <Pressable onPress={() => setOpenDropdownId(null)} style={{ flex: 1 }}>
  <FlatList
    data={EmployeeList}
    keyExtractor={item => item.EmployeeId.toString()}
    renderItem={({ item }) => (
      <EmployeeListItem
        FirstName={item.FirstName}
        DepartmentName={item.DepartmentName}
        BranchName={item.BranchName}
        ContactNumber={item.ContactNumber}
        ImagePath={item.ImagePath}
        Status={item.IsActive}
        EmployeeId={item.EmployeeId}
        EmployeeOldId={item.OldEmployeeId}
        EmployeeStatus={item.EmployeeStatus}
        LastName={item.LastName}
        HusbandName={item.HusbandName}
        FatherName={item.FatherName}
        Gender={item.Gender}
        JoiningDate={item.JoiningDate}
        MaritalStatus={item.MaritalStatus}
        navigation={navigation}
        openDropdownId={openDropdownId} // 👈 NEW
        setOpenDropdownId={setOpenDropdownId} // 👈 NEW
      />
    )}
  />
</Pressable>

        )}

        {/* Wheel Picker Modal */}
        <WheelPickerModal
          visible={pickerVisible}
          items={items}
          selectedValue={value}
          onSelect={handleSelect}
          onClose={() => setPickerVisible(false)}
        />
      </AppScreen>
    </MainLayout>
  );
};

export default EmployeeList;
