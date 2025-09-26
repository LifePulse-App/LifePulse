import {
  View,
  Image,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import React, {useState} from 'react';
import styles from './EmployeeListItemstyles';
import AppText from '../../../../components/Layout/AppText/AppText';
import {Card} from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/Ionicons';
import Icon3 from 'react-native-vector-icons/MaterialIcons';
import Icon4 from 'react-native-vector-icons/Foundation';
import api_Employee from '../../services/api_Employee';
import Toast from 'react-native-toast-message';
import { IMAGE_BASE_URL } from '@env';

interface EmployeeListItemProp {
  EmployeeId: number;
  EmployeeOldId: string;
  EmployeeStatus: boolean;
  FirstName: string;
  LastName: string;
  FatherName?: string;
  HusbandName?: string;
  DepartmentName: string;
  ImagePath: string;
  Gender: string;
  BranchName: string;
  ContactNumber: string;
  Status: boolean;
  JoiningDate: string;
  MaritalStatus: string;
  navigation: any;
  openDropdownId: number | null; // 👈 Add this
  setOpenDropdownId: React.Dispatch<React.SetStateAction<number | null>>; // 👈 Add this too
}

const EmployeeListItem = (props: EmployeeListItemProp) => {
  const [status, setStatus] = useState(props.Status);
  const [open, setOpen] = useState(false);
  const isOpen = props.openDropdownId === props.EmployeeId;


  const items = [
    {label: 'Change Status', value: true},
    {label: 'Change Status', value: false},
    {label: 'View Loans', value: 'loans'}, // 👈 new entry
  ];  

  const handleStatusChange = async (newStatus: boolean) => {
    const response = await api_Employee.MultipleActiveInactiveEmployee(
      newStatus,
      [props.EmployeeId],
    );

    if (!response.ok || response.data === null) {
      Toast.show({ type: 'error', text1: 'Error Updating Employee Status'});
      return;
    }

    setStatus(newStatus);
    Toast.show({ type: 'success', text1: "Employee status updated successfully."});
  };

  
  const onDotsPress = () => {
    props.setOpenDropdownId(isOpen ? null : props.EmployeeId);
  };
  

  const confirmStatusChange = (newStatus: boolean) => {
    Alert.alert(
      'Confirm Status Change',
      `Do you want to mark this employee as ${newStatus ? 'Active' : 'Inactive'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Yes',
          onPress: () => {
            setOpen(false);
            handleStatusChange(newStatus);
          },
        },
      ],
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const joiningDate = formatDate(props.JoiningDate);

  const renderLogo = () => {
    
    if (props.ImagePath != '') {
      return <Image source={{ uri: IMAGE_BASE_URL + props.ImagePath }} style={styles.image} />;
    } else {
      // Render default image instead of letter
      return (
        <Image source={require('../../../../shared/assets/default-logo.jpg')} style={styles.image} />
      );
    }
  };
  

  return (
    <TouchableWithoutFeedback onPress={() => setOpen(false)}>
      <View>
        <Card containerStyle={styles.card}>
          {/* Status Badge (hide if no status is provided) */}
          {typeof status === 'boolean' && (
            <View style={styles.statusBadge}>
              <AppText style={styles.statusText}>
                {status ? 'Active' : 'Inactive'}
              </AppText>
            </View>
          )}

          <View style={styles.container}>
            {renderLogo()}

            <View style={styles.innercontainer}>
              <View style={styles.rowGroup}>
                <Icon1 name="id-card" size={15} color="#617DC5" />
                <AppText style={styles.heading}>{props.EmployeeId}</AppText>
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
                <AppText style={styles.heading}>{props.DepartmentName}</AppText>
              </View>
              <View style={styles.rowGroup}>
                <Icon2 name="calendar" size={19} color="#617DC5" />
                <AppText style={styles.heading}>{joiningDate}</AppText>
              </View>
            </View>
          </View>
        </Card>

        {/* Dots Menu Button */}
        <View style={styles.rightMenu}>
          <TouchableOpacity onPress={onDotsPress}>
            <Icon name="dots-vertical" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Dropdown List */}
        {isOpen && (
          <View style={[styles.dropdownOutside, {top: 75, right: 23}]}>
            {items
  .filter(item => {
    if (typeof item.value === 'boolean') {
      return item.value !== status;
    }
    return true; // Always include 'loans'
  })
  .map(item => (
    <TouchableOpacity
      key={item.label + item.value}
      onPress={() => {
        setOpen(false);
        if (item.value === 'loans') {
          props.navigation.navigate('EmployeeLoan', {
            EmployeeId: props.EmployeeId,
          });
        } else if (typeof item.value === 'boolean') {
          confirmStatusChange(item.value);
        }
      }}
      style={styles.dropdownItem}>
      <AppText style={styles.dropdownText}>{item.label}</AppText>
    </TouchableOpacity>
  ))}



          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default EmployeeListItem;
