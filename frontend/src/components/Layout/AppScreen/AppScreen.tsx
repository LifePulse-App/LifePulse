import {SafeAreaView, ViewStyle} from 'react-native';

import styles from './AppScreenstyles';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

const AppScreen = (props: Props) => {
  return (
    <SafeAreaView {...props} style={{...styles.Screen, ...props.style}}>
      {props.children}
    </SafeAreaView>
  );
};

export default AppScreen;
