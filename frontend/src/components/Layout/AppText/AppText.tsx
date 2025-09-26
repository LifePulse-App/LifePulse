import {Text, TextProps} from 'react-native';

import DefaultStyles from '../../../shared/styling/styles';

interface Props extends TextProps{
  children: React.ReactNode;
  style?: any;
}

const AppText = (props: Props) => {
  return (
    <Text {...props} style={{...DefaultStyles.text, ...props.style}}>
      {' '}{props.children}{' '}
    </Text>
  );
};

export default AppText;
