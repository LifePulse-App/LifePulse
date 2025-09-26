import {Text, Pressable, PressableProps} from 'react-native';

import styles from './AppButtonstyles';

interface AppButtonProps extends PressableProps {
  title?: string;
}

const AppButton = (props : AppButtonProps) => {
  return (
    <Pressable style={styles.button} {...props}>
      <Text style={styles.text}>{props.title}</Text>
    </Pressable>
  );
};

export default AppButton;
