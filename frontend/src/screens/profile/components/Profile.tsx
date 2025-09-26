import React, { useContext } from 'react';
import { View, Image } from 'react-native';
import { Card } from '@rneui/base';
import AppText from '../../../components/Layout/AppText/AppText';
import AuthContext from '../../../auth/user/UserContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import styles from './Profilestyles';
import MainLayout from '../../../shared/components/MainLayout';
import colors from '../../../shared/styling/colors';
import { IMAGE_BASE_URL } from '@env';

const ProfileScreen = ({ navigation }: any) => {
  const authContext = useContext(AuthContext);

  const renderAvatar = () => {
    const baseURL = IMAGE_BASE_URL + authContext?.User?.ImagePath;
    console.log(IMAGE_BASE_URL + authContext?.User?.ImagePath);

    if (authContext?.User?.ImagePath != '') {
      return <Image source={{ uri: baseURL }} style={styles.image} />;
    } else {
      return (
        <Image source={require('../../../shared/assets/default-logo.jpg')} style={styles.image} resizeMode="cover"/>
      );
    }
  };

  return (
    <MainLayout>
      <View style={styles.container}>
      <View style={styles.uppercontainer}>
          <View style={styles.Iconcontainer}>
            <Icon
              color={colors.white}
              size={25}
              name="menu"
              onPress={() => navigation.openDrawer()}
            />
          </View>
          <AppText style={{textAlign: "start", color: "white", fontWeight: "bold", fontSize: 18, marginRight: "10%"}}>Welcome To Dashboard</AppText>
        </View>
        <Card containerStyle={styles.card}>
          <View style={styles.profileContainer}>
            <View style={styles.imageContainer}>{renderAvatar()}</View>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Icon name="account" size={20} style={styles.icon} />
                <AppText style={styles.infoText}>
                  {authContext?.User?.FirstName} {authContext?.User?.LastName}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <Icon name="phone" size={20} style={styles.icon} />
                <AppText style={styles.infoText}>
                  {authContext?.User?.PhoneNumber}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <Icon name="email" size={20} style={styles.icon} />
                <AppText style={styles.infoText}>
                  {authContext?.User?.Email}
                </AppText>
              </View>
              <View style={styles.infoRow}>
                <Icon name="office-building-marker" size={20} style={styles.icon} />
                <AppText style={styles.infoText}>
                  {authContext?.User?.InstituteProfile?.BranchName}
                </AppText>
              </View>
            </View>
          </View>
        </Card>
      </View>
    </MainLayout>
  );
};

export default ProfileScreen;
