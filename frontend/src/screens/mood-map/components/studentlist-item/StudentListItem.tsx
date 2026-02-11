import React, {useEffect, useRef} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import styles from './StudentListItemstyles';
import AppText from '../../../../components/Layout/AppText/AppText';
import {Card} from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/Ionicons';
import Icon3 from 'react-native-vector-icons/MaterialIcons';
import Icon4 from 'react-native-vector-icons/Foundation';
import {useNavigation} from '@react-navigation/native';
import api_Student from '../../services/api_Student';
import Toast from 'react-native-toast-message';
import { IMAGE_BASE_URL  } from '@env';

interface StudentListItemProp {
  FirstName: string;
  FatherName: string;
  StudentImagePath: string;
  StudentBasicId: number;
  OldStudentBasicId: string;
  ClassSectionName: string;
  FamilyInfoId: number;
  OldFamilyInfoId: string;
  Gender: string;
  BranchClassName: string;
  StudentStatus: string;
  openDropdownId: number | null;
  setOpenDropdownId: (id: number | null) => void;
  navigation: any;
}

const StudentListItem = (props: StudentListItemProp) => {
  const navigation = useNavigation();
  const isOpen = props.openDropdownId === props.StudentBasicId;
  const [value, setValue] = React.useState(props.StudentStatus);

  const items = [
    {label: 'Fee/Overdues', value: 'fee'},
    {label: 'Change Status', value: 'Active'},
    {label: 'Change Status', value: 'Inactive'},
  ];

  const handleStatusChange = async (status: string) => {
    if (status === 'fee') {
      props.navigation.navigate({
        name: 'StudentTabNavigator',
        params: {StudentBasicId: props.StudentBasicId},
        merge: true,
      });
      return;
    }

    try {
      await api_Student.MultipleActiveInactiveStudent(status, [
        props.StudentBasicId,
      ]);
    } catch (error) {
      Toast.show({ type: 'error', text1: "An error occurred while changing student status."});

    }
  };

  const confirmStatusChange = (status: string) => {
    if (status === 'fee') {
      handleStatusChange(status);
      return;
    }

    Alert.alert(
      'Confirm Status Change',
      `Do you really want to change the status to ${status}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes',
          onPress: () => {
            setValue(status);
            handleStatusChange(status);
          },
        },
      ],
    );
  };

  const renderLogo = () => {

      
    if (props.StudentImagePath != '') {
      return (
        <Image
          style={styles.image}
          source={{ uri: IMAGE_BASE_URL + props.StudentImagePath }}
          resizeMode="cover"
        />
      );
    } else {
      return (
        <Image
          style={styles.image}
          source={require('../../../../shared/assets/default-logo.jpg')} // 👈 Use your actual default image path
          resizeMode="cover"
        />
      );
    }
  };
  

  const handleOutsidePress = () => {
    if (isOpen) props.setOpenDropdownId(null);
  };

  return (
      <Pressable onPress={handleOutsidePress} style={{ flex: 1 }}>
        <View>
          <Card containerStyle={styles.card}>
            {/* Status Badge */}
            {value ? (
              <View style={styles.statusBadge}>
                <AppText style={styles.statusText}>{value}</AppText>
              </View>
            ) : null}
    
            <View style={styles.container}>
              {renderLogo()}
    
              <View style={styles.innercontainer}>
                <View style={styles.rowGroup}>
                  <Icon1 name="id-card" size={15} color="#617DC5" />
                  <AppText style={styles.heading}>
                    {props.StudentBasicId}
                  </AppText>
                </View>
                <View style={styles.rowGroup}>
                  <Icon2 name="person" size={15} color="#617DC5" />
                  <AppText style={styles.heading}>{props.FirstName}</AppText>
                </View>
                <View style={styles.rowGroup}>
                  <Icon4 name="male-female" size={15} color="#617DC5" />
                  <AppText style={styles.heading}>{props.FatherName}</AppText>
                </View>
                <View style={styles.rowGroup}>
                  <Icon3 name="class" size={15} color="#617DC5" />
                  <AppText style={styles.heading}>
                    {props.BranchClassName} {props.ClassSectionName}
                  </AppText>
                </View>
              </View>
            </View>
          </Card>
    
          <View style={styles.rightMenu}>
            <TouchableOpacity
              onPress={() => {
                if (isOpen) {
                  props.setOpenDropdownId(null);
                } else {
                  props.setOpenDropdownId(props.StudentBasicId);
                }
              }}>
              <Icon
                name="dots-vertical"
                size={22}
                color="white"
                style={{
                  transform: [{ rotate: isOpen ? '90deg' : '0deg' }],
                }}
              />
            </TouchableOpacity>
          </View>
    
          {isOpen && (
            <View
              style={[
                styles.dropdownOutside,
                {
                  position: 'absolute',
                  top: 50,
                  right: 35,
                  zIndex: 9999,
                },
              ]}>
              {items
                .filter(item => item.value !== value)
                .map(item => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => {
                      props.setOpenDropdownId(null);
                      confirmStatusChange(item.value);
                    }}
                    style={styles.dropdownItem}>
                    <AppText style={styles.dropdownText}>{item.label}</AppText>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </View>
      </Pressable>
    );
};

export default StudentListItem;
