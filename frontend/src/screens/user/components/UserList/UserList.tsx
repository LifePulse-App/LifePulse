import {
  Alert,
  FlatList,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useContext, useEffect, useState } from 'react';

import styles from './UserListstyles';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppText from '../../../../components/Layout/AppText/AppText';
import UserListItem from '../UserListItem/UserListItem';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../../../../shared/styling/colors';
import AuthContext from '../../../../auth/user/UserContext';
import defaultstyles from '../../../../shared/styling/styles';
import { RoleName } from '../../../../shared/config/enum';
import api_User from '../../services/api_User';
import { UserListResponse } from '../../models/UserListResponse';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import MainLayout from '../../../../shared/components/MainLayout';
import WheelPickerModal from '../../../../shared/components/Wheel';
import Toast from 'react-native-toast-message';

const UserList = ({ navigation }: any) => {
  const [InitialUserList, setInitialUserList] = useState<UserListResponse>([]);
  const [UserList, setUserList] = useState<UserListResponse>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const authContext = useContext(AuthContext);

  const [items, setItems] = useState<{ label: string; value: string }[]>([]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [dataFetched, setDataFetched] = useState<boolean>(false);

  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSearch = (query: string) => {
    const lower = query.toLowerCase();
    const filtered = InitialUserList.filter(user =>
      user.FirstName.toLowerCase().includes(lower) ||
      user.LastName.toLowerCase().includes(lower) ||
      user.RoleName.toLowerCase().includes(lower) ||
      user.Email.toLowerCase().includes(lower) ||
      user.UserName.toLowerCase().includes(lower) ||
      user.PhoneNumber.toLowerCase().includes(lower) ||
      user.Id.toString().includes(lower)
    );

    setUserList(filtered);
    setSearchQuery(query);
  };

  // ✅ Fetch User List
  const getUserListByBranch = async (branchId: string) => {
    setLoading(true);

    const response = await api_User.getUserList(
      authContext?.User?.InstituteId || 0,
      branchId,
      1000
    );

    if (!response.ok) {
      setLoading(false);
      
      return Toast.show({ type: 'error', text1: "Error getting user list."});
    }

    if (Array.isArray(response.data)) {
      setInitialUserList(response.data);
      setUserList(response.data);
    }

    setDataFetched(true);
    setLoading(false);
  };

  // ✅ Get Branches & Auto-select for SchoolAdmin
  const getBranchList = async () => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin && authContext?.BranchList) {
      const branchData = authContext.BranchList.map(branch => ({
        label: branch.BranchName,
        value: branch.BranchId.toString(),
      }));
      setItems(branchData);

      const defaultBranchId = authContext?.User?.InstituteProfile.DefaultBranchId?.toString() ?? '';
      if (defaultBranchId) {
        setValue(defaultBranchId);
        authContext?.setSelectedBranch(defaultBranchId);
        await getUserListByBranch(defaultBranchId);
      }
    }
  };

  const handleSelectBranch = (val: string) => {
    setValue(val);
    authContext?.setSelectedBranch(val);
    setPickerVisible(false);
    getUserListByBranch(val);
  };

  useEffect(() => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin) {
      getBranchList();
    } else {
      const defaultBranchId = authContext?.User?.InstituteProfile.DefaultBranchId?.toString() ?? '';
      if (defaultBranchId) getUserListByBranch(defaultBranchId);
    }
  }, []);

  const shouldShowList =
    authContext?.User?.RoleName !== RoleName.SchoolAdmin || !!value;

  return (
    <MainLayout>
      <AppScreen style={styles.container}>
        <AppActivityIndicator visible={loading} />

        {/* Top Bar */}
        <View style={styles.topcontainer}>
          <View style={styles.Iconcontainer}>
            <Icon
              color={colors.primary}
              size={30}
              name="menu"
              onPress={() => navigation.openDrawer()}
            />
          </View>

          {/* Branch Selector */}
          {authContext?.User?.RoleName === RoleName.SchoolAdmin && (
            <View style={styles.dropdowncontainer}>
              <TouchableOpacity
                style={[styles.searchInput, { justifyContent: 'center' }]}
                onPress={() => setPickerVisible(true)}
              >
                <AppText style={styles.dropdownText}>
                  {items.find(i => i.value === value)?.label || 'Select Branch'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Input */}
        {shouldShowList && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        )}

        {/* List Rendering */}
        {!shouldShowList ? (
          <View style={styles.noDataContainer}>
            <AppText style={styles.noDataText}>Please select a branch</AppText>
          </View>
        ) : dataFetched && UserList.length === 0 ? (
          <View style={styles.noDataContainer}>
            <AppText style={styles.noDataText}>No users found</AppText>
          </View>
        ) : (
          <FlatList
            data={UserList}
            keyExtractor={user => user.Id.toString()}
            renderItem={({ item }) => (
              <Pressable>
                <UserListItem
                  FirstName={item.FirstName}
                  LastName={item.LastName}
                  Status={item.LockoutEnabled}
                  UserName={item.UserName}
                  RoleName={item.RoleName}
                  Email={item.Email}
                  ImagePath={item.ImagePath}
                  PhoneNumber={item.PhoneNumber}
                />
              </Pressable>
            )}
          />
        )}

        {/* Wheel Picker Modal */}
        <WheelPickerModal
          visible={pickerVisible}
          items={items}
          selectedValue={value}
          onSelect={handleSelectBranch}
          onClose={() => setPickerVisible(false)}
        />
      </AppScreen>
    </MainLayout>
  );
};

export default UserList;
