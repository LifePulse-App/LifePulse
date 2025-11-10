import { create } from 'apisauce';
import { HTTP_Headers } from '../../shared/config/enum';
import UserStorage from '../user/UserStorage';

let isRefreshing = false;
let failedQueue: any[] = [];

// Process retry queue
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

const apiClient = create({
  baseURL: "http://10.90.19.216:40000/api",
  headers: { 'Content-Type': 'application/json' },
});

// Set static secret key
export const setSecretKey = () => {
  apiClient.setHeader('api-key', HTTP_Headers['key']);
};

// Set token manually (optional)
export const setAuthHeaders = async (token: string) => {
  apiClient.setHeader('Authorization', `Bearer ${token}`);
};

// =============================
// REQUEST INTERCEPTOR
// =============================
apiClient.axiosInstance.interceptors.request.use(async config => {
  const token = await UserStorage.getAccessToken();

  // Don't attach Authorization header for refresh request
  if (!config.url?.includes('/auth/refresh-token')) {
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
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

    // If token expired (401)
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Avoid retry loop
      if (originalRequest.url.includes('/auth/refresh-token')) {
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient.axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await UserStorage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        // CALL REFRESH WITHOUT AUTH HEADER
        const refreshResponse = await apiClient.post('/auth/refresh-token', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

        await UserStorage.setAccessToken(accessToken);
        await UserStorage.setRefreshToken(newRefreshToken);

        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return apiClient.axiosInstance(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        await UserStorage.clearTokens();
        await UserStorage.deleteUser();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
