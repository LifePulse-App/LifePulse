import {View, Image} from 'react-native';
import React, {useState} from 'react';
import styles from './AppListItemstyles';
import AppText from '../AppText/AppText';
import DropDownPicker from 'react-native-dropdown-picker';
import {Card} from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../../../shared/styling/colors';

interface AppListItemProp {
  title: string;
  description: string;
  image: string;
  id: number;
  class: string;
  section: string;
}

const AppListItem = (props: AppListItemProp) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    {label: 'Active', value: 'Active'},
    {label: 'InActive', value: 'InActive'},
    {label: 'PassedOut', value: 'PassedOut'},
  ]);

  const renderLogo = () => {
    if (props.image && props.image !== '') {
      return (
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.image}
        />
      );
    } else {
      // Show the first letter of InstituteName as a logo
      return (
        <View style={styles.logoContainer}>
          <AppText style={styles.logoText}>
            {props.title.charAt(0).toUpperCase()}
          </AppText>
        </View>
      );
    }
  };

  return (
    <Card containerStyle={styles.card}>
      <View style={styles.container}>
        {renderLogo()}
        <View style={styles.innercontainer}>
          <AppText style={styles.title}>
            {props.title}
            <AppText>/</AppText>
            <AppText style={styles.title}>{props.description}</AppText>
          </AppText>

          <View style={styles.lowercontainer}>
            <AppText>
              {props.id}/{props.class}/{props.section}
            </AppText>
          </View>

          <DropDownPicker
            containerStyle={{width: 125, marginLeft: 167, marginTop: -48}}
            maxHeight={115}
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            placeholder={'Select Status...'}
          />
        </View>
      </View>
      <View style={styles.buttoncontainer}>
        <Icon.Button
          name="receipt"
          size={40}
          backgroundColor={colors.primary}
          onPress={() => console.log('Button Clicked')}>
          <AppText style={{color: 'white', fontSize: 15}}>Revoke Fee</AppText>
        </Icon.Button>
        <Icon.Button
          name="receipt"
          size={40}
          backgroundColor={colors.primary}
          onPress={() => console.log('Button Clicked')}>
          <AppText style={{color: 'white', fontSize: 15}}>Overdues</AppText>
        </Icon.Button>
      </View>
    </Card>
  );
};

export default AppListItem;
