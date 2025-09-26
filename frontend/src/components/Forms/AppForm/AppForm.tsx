import {Formik, FormikValues} from 'formik';
import React from 'react';

interface AppFormProps {
  initialValues: FormikValues;
  onSubmit: any;
  validationSchema: any;
  children: React.ReactNode;
}

function AppForm(props: AppFormProps) {
  return (
    <Formik
      initialValues={props.initialValues}
      onSubmit={props.onSubmit}
      validationSchema={props.validationSchema}>
      {() => <>{props.children}</>}
    </Formik>
  );
}

export default AppForm;
