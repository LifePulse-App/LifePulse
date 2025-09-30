import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();
console.log('RN Biometrics instance:', rnBiometrics);


export const checkBiometricAvailability = async () => {
  try {
    const result = await rnBiometrics.isSensorAvailable();
    console.log("Biometric availability:", result);
    return result;
  } catch (e) {
    console.log("Biometric check failed:", e);
    return { available: false, biometryType: null };
  }
};

export const authenticateBiometric = async () => {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Authenticate to continue',
    });
    console.log("Biometric auth result:", success);
    return success;
  } catch (e) {
    console.log('Biometric auth error:', e);
    return false;
  }
};
