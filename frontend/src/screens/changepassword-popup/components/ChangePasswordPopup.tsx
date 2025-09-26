import React, {useState, useContext} from 'react';
import {
  View,
  TextInput,
  Modal,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import AuthContext from '../../../auth/user/UserContext';
import styles from '../../../shared/styling/styles';
import api_User from '../../user/services/api_User';
import Toast from 'react-native-toast-message';

const ChangePasswordModal = ({visible, onClose}: any) => {
  const authContext = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const resetState = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
  };

  const validatePassword = (password: string) => {
    if (password.length < 6 || password.length > 15) {
      return 'Password must be between 6 and 15 characters';
    }
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,15}$/;
    if (!passwordRegex.test(password)) {
      return 'Password must have 1 Upper, 1 Lower, 1 Digit, and 1 Special Character (Min 6-15 characters)';
    }
    return '';
  };

  const handleChangePassword = async () => {
    let isValid = true;

    if (currentPassword !== authContext?.User?.Password) {
      setCurrentPasswordError('Current Password do not match.');
      isValid = false;
    } else {
      setCurrentPasswordError('');
    }

    const newPasswordValidationError = validatePassword(newPassword);
    if (newPasswordValidationError) {
      setNewPasswordError(newPasswordValidationError);
      isValid = false;
    } else {
      setNewPasswordError('');
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(
        'New Password and Confirm Password do not match.',
      );
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    if (!isValid) return;

    // Call Change Password API
    try {
      const response = await api_User.getMainUserChangePassword(
        authContext?.User?.UserName || '',
        currentPassword,
        newPassword,
      );

      if (response.ok) {
         Toast.show({ type: 'success', text1: 'Password changed successfully.'});
        resetState();
        onClose();
      } else {
        Toast.show({ type: 'error', text1: 'Failed to change password.'});
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'An error occurred.'});
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        resetState();
        onClose();
      }}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TextInput
            placeholder="Current Password"
            secureTextEntry={true}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={styles.input}
          />
          {currentPasswordError && (
            <Text style={styles.errorText}>{currentPasswordError}</Text>
          )}
          <TextInput
            placeholder="New Password"
            secureTextEntry={true}
            value={newPassword}
            onChangeText={setNewPassword}
            onBlur={() => setNewPasswordError(validatePassword(newPassword))}
            style={styles.input}
          />
          {newPasswordError && (
            <Text style={styles.errorText}>{newPasswordError}</Text>
          )}
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry={true}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
          />
          {confirmPasswordError && (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleChangePassword}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                resetState();
                onClose();
              }}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ChangePasswordModal;
