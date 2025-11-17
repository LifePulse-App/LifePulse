import { create } from 'apisauce';
import { HTTP_Headers } from '../../shared/config/enum';
import UserStorage from '../user/UserStorage';

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
  baseURL: "http://10.244.226.197:40000/api",
  headers: { "Content-Type": "application/json" }
});

// Set static secret key
export const setSecretKey = () => {
  apiClient.setHeader("api-key", HTTP_Headers["key"]);
};

// Manually set token (optional)
export const setAuthHeaders = async (token: string) => {
  apiClient.setHeader("Authorization", `Bearer ${token}`);
};

// =============================
// REQUEST INTERCEPTOR
// =============================
apiClient.axiosInstance.interceptors.request.use(async config => {
  const token = await UserStorage.getAccessToken();

  // Skip attaching Authorization header for refresh request
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

    // ✅ Check if user is logged in
    const accessToken = await UserStorage.getAccessToken();

    // ✅ If no accessToken exists → user NOT logged in → DO NOT refresh
    if (!accessToken) {
      return Promise.reject(error);
    }

    // ✅ If request already retried, do not retry again
    if (error.response?.status === 401 && !originalRequest._retry) {

      // ✅ If refresh-token route itself failed → logout user
      if (originalRequest.url.includes("/auth/refresh-token")) {
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait until refresh completes
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient.axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await UserStorage.getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token available");

        // ✅ No Authorization header required for refresh
        const refreshResponse = await apiClient.post("/auth/refresh-token", {
          refreshToken
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          refreshResponse.data;

        // ✅ Store new tokens
        await UserStorage.setAccessToken(newAccessToken);
        await UserStorage.setRefreshToken(newRefreshToken);

        // ✅ Process queued failed requests
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // ✅ Retry original request
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return apiClient.axiosInstance(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Logout user completely
        await UserStorage.clearTokens();
        await UserStorage.deleteUser();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
