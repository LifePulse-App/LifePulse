import { createNavigationContainerRef } from '@react-navigation/native';
import UserStorage from '../../auth/user/UserStorage';
import sharedApi from '../../shared/services/shared-api';

export const navigationRef = createNavigationContainerRef<any>();

export const resetToLogin = () => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' as never }],
    });
  }
};

export const logout = async (currentUserId: string) => {
  try {
    const refreshToken = await UserStorage.getRefreshToken();
    if (currentUserId && refreshToken) {
      await sharedApi.LogoutUser(currentUserId, refreshToken);
    }
    await UserStorage.clearTokens();
    await UserStorage.deleteUser();
    resetToLogin();
  } catch (err) {
    console.log(err);
    await UserStorage.clearTokens();
    await UserStorage.deleteUser();
    resetToLogin();
  }
};