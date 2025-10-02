import { create } from 'apisauce';
import { HTTP_Headers } from '../../shared/config/enum';
import UserStorage from '../user/UserStorage';

const apiClient = create({
  baseURL: "http://10.244.226.197:4000/api",
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set API secret key
export const setSecretKey = () => {
  apiClient.setHeader('api-key', HTTP_Headers['key']);
};

// Set bearer token manually if needed
export const setAuthHeaders = async (token: string) => {
  apiClient.setHeader('Authorization', `Bearer ${token}`);
};

// =============================
// App-wide interceptor for refresh token
// =============================
apiClient.axiosInstance.interceptors.request.use(
  async config => {
    // Always get latest access token from storage before request
    const token = await UserStorage.getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

apiClient.axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await UserStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token available');

        // Call your refresh token API
        const refreshResponse = await apiClient.post('/auth/refresh-token', { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        // Save new tokens
        await UserStorage.setAccessToken(newAccessToken);
        await UserStorage.setRefreshToken(newRefreshToken);

        // Update header for retried request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Retry original request
        return apiClient.axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();

      return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
