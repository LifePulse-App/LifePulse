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
  console.log('[QUEUE] Processing queue. Error:', !!error, 'Token present:', !!token);
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
  console.log('[API] Setting api-key header');
  apiClient.setHeader('api-key', HTTP_Headers['key']);
};

// Manually set token (optional)
export const setAuthHeaders = async (token: string) => {
  console.log('[API] Manually setting Authorization header');
  apiClient.setHeader('Authorization', `Bearer ${token}`);
};

// =============================
// REQUEST INTERCEPTOR
// =============================
apiClient.axiosInstance.interceptors.request.use(async config => {
  const token = await UserStorage.getAccessToken();
  const url = config.url || '';

  console.log('[REQ] ->', url, '| hasAccessToken:', !!token);

  // Skip attaching Authorization header for refresh request
  if (!url.includes('/auth/refresh-token')) {
    if (token) {
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
      console.log('[REQ] Attached Authorization header for', url);
    } else {
      console.log('[REQ] No access token, not attaching Authorization for', url);
    }
  } else {
    console.log('[REQ] Skipping Authorization header for refresh-token endpoint');
  }

  return config;
});

// =============================
// RESPONSE INTERCEPTOR
// =============================
apiClient.axiosInstance.interceptors.response.use(
  response => {
    console.log(
      '[RES] <-',
      response.config?.url,
      '| status:',
      response.status,
    );
    return response;
  },

  async error => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || 'UNKNOWN_URL';

    console.log('[RES-ERR]', status, 'for', url);
    console.log('[RES-ERR] Full error response data:', error.response?.data);

    // ✅ If no accessToken exists → user NOT logged in → DO NOT refresh
    const accessToken = await UserStorage.getAccessToken();
    console.log('[AUTH] Current accessToken exists:', !!accessToken);

    if (!accessToken) {
      console.log('[AUTH] No access token in storage, skipping refresh logic');
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      console.log('[AUTH] 401 detected for', url);

      // ✅ If refresh-token route itself failed → logout user
      if (url.includes('/auth/refresh-token')) {
        console.log('[AUTH] 401 on /auth/refresh-token, logging out user');
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();
        resetToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log('[AUTH] Already refreshing, queuing request for', url);
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            console.log('[AUTH] Retrying queued request with new token for', url);
            (originalRequest.headers as any)['Authorization'] =
              'Bearer ' + token;
            return apiClient.axiosInstance(originalRequest);
          })
          .catch(err => {
            console.log('[AUTH] Error while retrying queued request for', url, err);
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      console.log('[AUTH] Starting refresh flow');

      try {
        const refreshToken = await UserStorage.getRefreshToken();
        console.log('[AUTH] Refresh token exists:', !!refreshToken);
        if (!refreshToken) throw new Error('No refresh token available');

        console.log('[AUTH] Calling /auth/refresh-token');
        const refreshResponse = await apiClient.post('/auth/refresh-token', {
          token: refreshToken,
        });

        console.log(
          '[AUTH] Refresh response status:',
          refreshResponse.status,
          '| data:',
          refreshResponse.data,
        );

        // ⚠️ Adjust this destructure to match your backend response shape
        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        } = refreshResponse.data;

        console.log(
          '[AUTH] Parsed tokens from refresh -> newAccessToken:',
          !!newAccessToken,
          '| newRefreshToken:',
          !!newRefreshToken,
        );

        if (!newAccessToken) {
          throw new Error('No new access token returned from refresh');
        }

        if (newAccessToken) {
          await UserStorage.setAccessToken(newAccessToken);
          console.log('[AUTH] Saved new access token to storage');
        }
        if (newRefreshToken) {
          await UserStorage.setRefreshToken(newRefreshToken);
          console.log('[AUTH] Saved new refresh token to storage');
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        (originalRequest.headers as any)['Authorization'] =
          `Bearer ${newAccessToken}`;
        console.log('[AUTH] Retrying original request after refresh for', url);
        return apiClient.axiosInstance(originalRequest);
      } catch (refreshError) {
        console.log('[AUTH] Refresh failed, logging out. Error:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;

        await UserStorage.clearTokens();
        await UserStorage.deleteUser();
        resetToLogin();

        return Promise.reject(refreshError);
      }
    }

    console.log(
      '[RES-ERR] Non-401 or already retried. Status:',
      status,
      'URL:',
      url,
    );
    return Promise.reject(error);
  },
);

export default apiClient;