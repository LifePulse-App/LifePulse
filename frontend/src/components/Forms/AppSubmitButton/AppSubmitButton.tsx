import {PressableProps, GestureResponderEvent} from 'react-native';
import { useFormikContext } from 'formik';

import AppButton from '../../Layout/AppButton/AppButton';

interface AppButtonProps extends PressableProps {
  title?: string;
}

const AppSubmitButton = (props : AppButtonProps) => {
const {handleSubmit} = useFormikContext();

  return (
    <AppButton title={props.title} onPress={handleSubmit as unknown as (e: GestureResponderEvent) => void} />
  );
};

export default AppSubmitButton;
