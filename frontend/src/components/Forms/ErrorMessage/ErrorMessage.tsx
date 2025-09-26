import {ViewStyle} from 'react-native';

import styles from './ErrorMessagestyles';
import AppText from '../../Layout/AppText/AppText';

interface Props {
  error: string;
  visible: boolean;
  style?: ViewStyle;
}

const ErrorMessage = (props: Props) => {
  if (!props.visible || !props.error) return null;
  return (
    <AppText {...props} style={{...styles.error, ...props.style}}>
      {props.error}
    </AppText>
  );
};

export default ErrorMessage;
