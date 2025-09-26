import {
  View,
  Image,
  Alert,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import React, {useState} from 'react';
import styles from './UserListItemstyles';
import AppText from '../../../../components/Layout/AppText/AppText';
import {Card} from '@rneui/themed';
import colors from '../../../../shared/styling/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon1 from 'react-native-vector-icons/FontAwesome';
import Icon2 from 'react-native-vector-icons/Ionicons';
import Icon3 from 'react-native-vector-icons/MaterialIcons';
import api_User from '../../services/api_User';
import Toast from 'react-native-toast-message';
import { IMAGE_BASE_URL } from '@env';

interface UserListItemProp {
  FirstName: string;
  LastName: string;
  RoleName: string;
  ImagePath: string;
  Email: string;
  PhoneNumber: string;
  UserName: string;
  Status: boolean;
}

const UserListItem = (props: UserListItemProp) => {
  const [status, setStatus] = useState(props.Status);
  const [open, setOpen] = useState(false);

  const renderLogo = () => {
    console.log(IMAGE_BASE_URL + props.ImagePath);
    
    if (props.ImagePath != '') {
      return <Image source={{ uri: IMAGE_BASE_URL + props.ImagePath }} style={styles.image} />;
    } else {
      // Render default image instead of letter
      return (
        <Image source={require('../../../../shared/assets/default-logo.jpg')} style={styles.image} />
      );
    }
  };
  

  const handleStatusChange = async (newStatus: boolean) => {
    const response = await api_User.updateUserStatus(props.UserName);

    if (!response.ok || response.data === null) {
      Toast.show({ type: 'error', text1: "Error Updating Status."});
      return;
    }

    setStatus(newStatus);
    Toast.show({ type: 'success', text1: "User status updated."});
  };

  const onDotsPress = () => {
    setOpen(!open);
  };

  const confirmStatusChange = (newStatus: boolean) => {
    Alert.alert(
      'Confirm Status Change',
      `Do you want to mark this user as ${newStatus ? 'Active' : 'Inactive'}?`,
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

  return (
    <>
      <TouchableWithoutFeedback onPress={() => setOpen(false)}>
        <View>
          <Card containerStyle={styles.card}>
            <View style={styles.statusBadge}>
              <AppText style={styles.statusText}>
                {status ? 'Active' : 'Inactive'}
              </AppText>
            </View>

            <View style={styles.container}>
              {renderLogo()}
              <View style={styles.innercontainer}>
                <View style={styles.rowGroup}>
                  <Icon1 name="id-card" size={13} color={colors.primary} />
                  <AppText style={styles.heading}>{props.UserName}</AppText>
                </View>
                <View style={styles.rowGroup}>
                  <Icon2 name="person" size={13} color={colors.primary} />
                  <AppText style={styles.heading}>
                    {props.FirstName} {props.LastName}
                  </AppText>
                </View>
                <View style={styles.rowGroup}>
                  <Icon3 name="admin-panel-settings" size={13} color={colors.primary} />
                  <AppText style={styles.heading}>{props.RoleName}</AppText>
                </View>
                <View style={styles.rowGroup}>
                  <Icon name="email" size={13} color={colors.primary} />
                  <AppText style={styles.heading}>{props.Email}</AppText>
                </View>
              </View>
            </View>
          </Card>

          <View style={styles.rightMenu}>
            <TouchableOpacity onPress={onDotsPress}>
              <Icon name="dots-vertical" size={23} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {open && (
        <View style={[styles.dropdownOutside, {top: 100, right: 15}]}>
          {[
            {label: 'Active', value: true},
            {label: 'Inactive', value: false},
          ]
            .filter(i => i.value !== status)
            .map(item => (
              <TouchableOpacity
                key={item.label}
                onPress={() => confirmStatusChange(item.value)}
                style={styles.dropdownItem}>
                <AppText style={styles.dropdownText}>{item.label}</AppText>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </>
  );
};

export default UserListItem;
