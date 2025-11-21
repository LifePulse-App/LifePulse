import { create } from 'apisauce';
import { HTTP_Headers } from '../../shared/config/enum';
import UserStorage from '../user/UserStorage';
import { resetToLogin } from '../../navigation/main/RootNavigation';

let isRefreshing = false;
let failedQueue: any[] = [];

// =============================
// QUEUE PROCESSOR
// =============================
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// =============================
// API CLIENT
// =============================
const apiClient = create({
  baseURL: 'http://10.244.226.197:40000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Set static secret key
export const setSecretKey = () => {
  apiClient.setHeader('api-key', HTTP_Headers['key']);
};

// Manually set token (optional)
export const setAuthHeaders = async (token: string) => {
  apiClient.setHeader('Authorization', `Bearer ${token}`);
};

// =============================
// REQUEST INTERCEPTOR
// =============================
apiClient.axiosInstance.interceptors.request.use(async config => {
  const token = await UserStorage.getAccessToken();

  // Skip attaching Authorization header for refresh request
  if (!config.url?.includes('/auth/refresh-token')) {
    if (token) {
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
  }

  return config;
});

// =============================
// RESPONSE INTERCEPTOR
// =============================
apiClient.axiosInstance.interceptors.response.use(
  response => response,

  async error => {
    const originalRequest = error.config;

    // ✅ If no accessToken exists → user NOT logged in → DO NOT refresh
    const accessToken = await UserStorage.getAccessToken();
    if (!accessToken) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // ✅ If refresh-token route itself failed → logout user
      if (originalRequest.url.includes('/auth/refresh-token')) {
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();
        resetToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait until refresh completes
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            (originalRequest.headers as any)['Authorization'] =
              'Bearer ' + token;
            return apiClient.axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await UserStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token available');

        // ✅ No Authorization header required for refresh
        const refreshResponse = await apiClient.post('/auth/refresh-token', {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data;

if (newAccessToken) {
  await UserStorage.setAccessToken(newAccessToken);
}
if (newRefreshToken) {
  await UserStorage.setRefreshToken(newRefreshToken);
}

        // ✅ Process queued failed requests
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // ✅ Retry original request
        (originalRequest.headers as any)['Authorization'] =
          `Bearer ${newAccessToken}`;
        return apiClient.axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // 🔴 Refresh token invalid/expired -> full logout + go to Login
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();
        resetToLogin();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;