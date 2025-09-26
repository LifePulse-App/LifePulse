import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Overdues from '../../screens/student/components/overdues/Overdues';
import Fee from '../../screens/student/components/fee/Fee';
import { TouchableOpacity } from 'react-native';
import AppText from '../../components/Layout/AppText/AppText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createMaterialTopTabNavigator();

interface StudentTabNavigatorProps {
  route: {
    params: {
      StudentBasicId: number;
    };
  },
  navigation: any
}

const StudentTabNavigator = ({ route, navigation }: StudentTabNavigatorProps) => {
  const { StudentBasicId } = route.params;

  return (
    <>
    <TouchableOpacity
    onPress={() => navigation.goBack()}
    style={{ flexDirection: 'row', alignItems: 'center', margin: 15 }}
  >
    <Icon name="arrow-left" size={20} color="black" />
    <AppText style={{ fontSize: 16, color: 'black', marginLeft: 8, fontWeight: 'bold' }}>
      Fee & Overdues
    </AppText>
  </TouchableOpacity>
  
    <Tab.Navigator
      screenOptions={{
        tabBarLabelStyle: { fontSize: 14 },
        tabBarStyle: { backgroundColor: '#f2f2f2' },
        swipeEnabled: true,
      }}
    >
      <Tab.Screen
        name="Fee"
        component={Fee}
        initialParams={{ StudentBasicId }}
      />
      <Tab.Screen
        name="Overdues"
        component={Overdues}
        initialParams={{ StudentBasicId }}
      />
    </Tab.Navigator>
    </>
  );
};

export default StudentTabNavigator;
