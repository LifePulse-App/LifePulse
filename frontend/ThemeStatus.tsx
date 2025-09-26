import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';

const ThemeStatus = () => {
  const theme = useTheme();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ color: theme.colors.primary }}>
        Current Theme: {theme.dark ? 'Dark Mode' : 'Light Mode'}
      </Text>
    </View>
  );
};

export default ThemeStatus;
