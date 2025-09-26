import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Appbar, Menu, Avatar, Text, useTheme } from 'react-native-paper';

interface HeaderProps {
  username: string;
  userAvatarUrl?: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ username, userAvatarUrl, onLogout }) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  return (
    <Appbar.Header style={styles.header}>
      {/* Left: Logo */}
      <View style={styles.leftSection}>
        <Image
          source={require('../assets/logo.png')} // Replace with your logo path
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Center: Title */}
      <View style={styles.centerSection}>
        <Text style={styles.portalText}>Portal</Text>
      </View>

      {/* Right: Menu */}
      <View style={styles.rightSection}>
        <Menu
          visible={visible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity style={styles.userInfo} onPress={openMenu}>
              <Avatar.Image
                size={32}
                source={
                  userAvatarUrl
                    ? { uri: userAvatarUrl }
                    : require('../assets/default-user.png') // fallback avatar
                }
              />
              <Text style={styles.username}>{username}</Text>
            </TouchableOpacity>
          }
        >
          <Menu.Item onPress={onLogout} title="Logout" leadingIcon="logout" />
        </Menu>
      </View>
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#314299',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 70,
    elevation: 4,
  },
  leftSection: {
    flex: 1,
  },
  logo: {
    height: 40,
    width: 40,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  portalText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    color: 'white',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default Header;
