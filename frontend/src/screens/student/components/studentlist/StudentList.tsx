import React, { useContext, useEffect, useState } from 'react';
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AppText from '../../../../components/Layout/AppText/AppText';
import AppScreen from '../../../../components/Layout/AppScreen/AppScreen';
import AppActivityIndicator from '../../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import StudentListItem from '../studentlist-item/StudentListItem';
import styles from './StudentListstyles';
import colors from '../../../../shared/styling/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api_Branch from '../../../../shared/services/shared-api';
import api_Student from '../../services/api_Student';
import { StudentListResponse } from '../../models/StudentListResponse';
import { BranchClassListResponse } from '../../../../shared/models/BranchClassListResponse';
import { ClassSectionListResponse } from '../../../../shared/models/ClassSectionListResponse';
import AuthContext from '../../../../auth/user/UserContext';
import { RoleName } from '../../../../shared/config/enum';
import MainLayout from '../../../../shared/components/MainLayout';
import WheelPickerModal from '../../../../shared/components/Wheel';

const StudentList = ({ navigation }: any) => {
  const [initialStudentList, setinitialStudentList] = useState<StudentListResponse>([]);
  const [studentList, setStudentList] = useState<StudentListResponse>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [Branchvalue, setBranchValue] = useState('');
  const [ClassValue, setClassValue] = useState('');
  const [SectionValue, setSectionValue] = useState('');
  const [Branchitems, setBranchItems] = useState<any[]>([]);
  const [Classitems, setClassItems] = useState<any[]>([]);
  const [Sectionitems, setSectionItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataFetched, setdataFetched] = useState(false);
  const [BranchClass, setBranchClass] = useState<BranchClassListResponse>([]);
  const [ClassSection, setClassSection] = useState<ClassSectionListResponse>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [currentPicker, setCurrentPicker] = useState<'branch' | 'class' | 'section' | null>(null);

  // 🔽 Dropdown state to control which item is open
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const authContext = useContext(AuthContext);

  const handleSearch = (query: string) => {
    const filteredStudents = initialStudentList.filter(student =>
      [student.FirstName, student.FatherName, student.ClassSectionName, student.BranchClassName]
        .some(field => field.toLowerCase().includes(query.toLowerCase()))
    );
    setStudentList(filteredStudents);
    setSearchQuery(query);
  };

  const getAll = async () => {
    if (authContext?.User?.RoleName === RoleName.SchoolAdmin) {
      const branches = authContext?.BranchList?.map(item => ({
        label: item.BranchName,
        value: item.BranchId.toString(),
      })) || [];
      setBranchItems(branches);
    }

    const defaultBranchId = authContext?.User?.InstituteProfile?.DefaultBranchId?.toString() || '';
    if (!defaultBranchId) return;

    setBranchValue(defaultBranchId);

    const [classes, section] = await Promise.all([
      api_Branch.getBranchClassList(authContext?.User?.InstituteId || 0, defaultBranchId),
      api_Branch.getClassSectionList(authContext?.User?.InstituteId || 0, defaultBranchId, 0),
    ]);

    if (classes.ok && typeof classes.data === 'object') {
      setBranchClass(classes.data);
      const classItems = classes.data.map((item: any) => ({
        label: item.BranchClassName,
        value: item.BranchClassId.toString(),
      }));
      setClassItems(classItems);
    }

    if (section.ok && typeof section.data === 'object') {
      setClassSection(section.data);
    }
  };

  const getBranchClassList = () => {
    const data = BranchClass.filter(c => c.BranchId.toString() === Branchvalue)
      .map(item => ({ label: item.BranchClassName, value: item.BranchClassId.toString() }));
    setClassItems(data);
  };

  const getClassSectionList = () => {
    const data = ClassSection.filter(s => s.BranchClassId.toString() === ClassValue)
      .map(item => ({ label: item.SectionName, value: item.ClassSectionId.toString() }));
    setSectionItems(data);
  };

  const getStudentList = async () => {
    setLoading(true);
    const BranchID: string = authContext?.User?.RoleName === RoleName.SchoolAdmin
      ? Branchvalue
      : authContext?.User?.InstituteProfile.DefaultBranchId.toString() || '';

    const response = await api_Student.getStudentList(
      parseInt(BranchID),
      authContext?.User?.InstituteId || 0,
      BranchID,
      '', '', '', '',
      ClassValue,
      SectionValue,
      '',
      'Active',
    );

    if (response.ok && typeof response.data === 'object') {
      setinitialStudentList(response.data);
      setStudentList(response.data);
      setdataFetched(true);
    }
    setLoading(false);
  };

  useEffect(() => { getAll(); }, []);
  useEffect(() => { getClassSectionList(); }, [ClassValue]);
  useEffect(() => { getStudentList(); }, [SectionValue]);

  const handleSelect = (value: string) => {
    if (currentPicker === 'branch') {
      setBranchValue(value);
      setClassValue('');
      setSectionValue('');
      getBranchClassList();
      getClassSectionList();
    } else if (currentPicker === 'class') {
      setClassValue(value);
      setSectionValue('');
      getClassSectionList();
    } else {
      setSectionValue(value);
    }
    setPickerVisible(false);
  };

  const dismissAll = () => {
    Keyboard.dismiss();
    setOpenDropdownId(null);
  };

  const currentItems =
    currentPicker === 'branch' ? Branchitems :
    currentPicker === 'class' ? Classitems :
    Sectionitems;

  return (
    <MainLayout>
      <AppScreen style={styles.container}>
        <AppActivityIndicator visible={loading} />

        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          setOpenDropdownId(null); // ✅ Close dropdown on outside click
        }}>
          <View style={{ flex: 1 }}>
            <View style={styles.topBar}>
              <Icon name="menu" size={30} color={colors.primary} onPress={() => navigation.openDrawer()} />
            </View>

            {/* Row 1: Branch */}
            <View style={styles.singleDropdownRow}>
              <TouchableOpacity
                style={styles.dropdownButtonn}
                onPress={() => {
                  setCurrentPicker('branch');
                  setPickerVisible(true);
                }}
              >
                <AppText style={styles.dropdownText}>
                  {Branchitems.find(i => i.value === Branchvalue)?.label || 'Select Branch'}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Row 2: Class & Section */}
            <View style={styles.dropdownRow}>
              {(['class', 'section'] as const).map((key) => {
                const disabled = (key === 'class' && !Branchvalue) || (key === 'section' && !ClassValue);
                const label = key === 'class'
                  ? Classitems.find(i => i.value === ClassValue)?.label
                  : Sectionitems.find(i => i.value === SectionValue)?.label;

                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.dropdownButton, disabled && styles.disabled]}
                    disabled={disabled}
                    onPress={() => {
                      setCurrentPicker(key);
                      setPickerVisible(true);
                    }}
                  >
                    <AppText style={styles.dropdownText}>
                      {label || `Select ${key.charAt(0).toUpperCase() + key.slice(1)}`}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {SectionValue && (
              <TextInput
                style={styles.searchInput}
                placeholder="🔍 Search students..."
                value={searchQuery}
                onChangeText={handleSearch}
              />
            )}

            {(!loading && dataFetched && studentList.length === 0) ? (
              <View style={styles.noDataContainer}><AppText>No students found</AppText></View>
            ) : (
              <TouchableWithoutFeedback onPress={dismissAll}>
              <View style={{ flex: 1 }}>
              <FlatList
                data={studentList}
                keyExtractor={s => s.StudentBasicId.toString()}
                renderItem={({ item }) => (
                  <StudentListItem
                    {...item}
                    navigation={navigation}
                    openDropdownId={openDropdownId}
                    setOpenDropdownId={setOpenDropdownId}
                  />
                )}
              />
              </View>
        </TouchableWithoutFeedback>
            )}

            <WheelPickerModal
              visible={pickerVisible}
              items={currentItems}
              selectedValue={
                currentPicker === 'branch' ? Branchvalue :
                currentPicker === 'class' ? ClassValue :
                SectionValue
              }
              onSelect={handleSelect}
              onClose={() => setPickerVisible(false)}
            />
          </View>
        </TouchableWithoutFeedback>
      </AppScreen>
    </MainLayout>
  );
};

export default StudentList;
