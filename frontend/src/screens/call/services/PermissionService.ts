import { Platform, PermissionsAndroid } from 'react-native';

export class PermissionService {
  public static async checkAndRequestAudioPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true; // Handled dynamically via native WebRTC triggers or AVCaptureDevice
    }

    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ...(Platform.Version >= 31 ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] : []),
      ]);

      return (
        grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }
}