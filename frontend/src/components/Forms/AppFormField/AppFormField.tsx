import React from 'react';
import { TextInputProps } from 'react-native';
import { useFormikContext } from 'formik';

import AppTextInput from '../../Layout/AppTextInput/AppTextInput';
import ErrorMessage from '../ErrorMessage/ErrorMessage';

interface AppFormFieldProps extends TextInputProps {
  name: string;
  icon?: string;
}

function AppFormField({ name, icon, ...otherProps }: AppFormFieldProps) {
  const {
    handleChange,
    setFieldTouched,
    errors,
    touched,
    values,
  } = useFormikContext<Record<string, any>>();

  return (
    <>
      <AppTextInput
        icon={icon}
        value={values[name]}
        onBlur={() => setFieldTouched(name)}
        onChangeText={handleChange(name)}
        {...otherProps}
      />
      <ErrorMessage
        error={errors[name] as string}
        visible={touched[name] as boolean}
      />
    </>
  );
}

export default AppFormField;
