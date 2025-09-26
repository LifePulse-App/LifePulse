import {TextInput, View, TextInputProps} from 'react-native';

import styles from './AppTextInputstyles';
import defaultStyles from '../../../shared/styling/styles';
import React from 'react';
import Icon  from 'react-native-vector-icons/MaterialCommunityIcons';

interface AppTextInputProps extends TextInputProps {
  icon?: string;
}

const AppTextInput = (props: AppTextInputProps) => {
  return (
    <View style={styles.container}>
      {props.icon && (
        <Icon
          name={props.icon}
          size={20}
          color={defaultStyles.colors.medium}
          style={styles.icon}
        />
      )}
      <TextInput style={defaultStyles.text} {...props} />
    </View>
  );
};

export default AppTextInput;
