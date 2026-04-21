import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://coms-4020-006.class.las.iastate.edu:8080';

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
});

// ── Token helpers ─────────────────────────────────────────────────────────────

export const storeToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const storeRefreshToken = async (token: string) => {
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

export const clearToken = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

// ── Request interceptor — attach Bearer token ─────────────────────────────────

axiosInstance.interceptors.request.use(async (config) => {
  try {
    const skipAuth = ['/api/auth/login', '/api/auth/refresh', '/api/users/testing/hashAllPasswords'];
    if (skipAuth.some((u) => config.url?.startsWith(u))) return config;
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

// ── Force-logout callback (set by App.tsx so interceptor can trigger nav) ─────

let onForceLogout: (() => void) | null = null;
export const setForceLogoutHandler = (handler: () => void) => {
  onForceLogout = handler;
};

// ── Response interceptor — transparent token refresh on 401 ──────────────────

let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const drainQueue = (err: unknown, token?: string) => {
  refreshQueue.forEach((cb) => (err ? cb.reject(err) : cb.resolve(token!)));
  refreshQueue = [];
};

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const skipRefresh = ['/api/auth/login', '/api/auth/refresh'];
    const status = error.response?.status;
    // Only refresh on 401 (token expired); 403 means forbidden/wrong role — don't loop
    if (
      status === 401 &&
      !original._retry &&
      !skipRefresh.some((u) => original.url?.startsWith(u))
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return axiosInstance(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        const res = await axiosInstance.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data;
        await storeToken(accessToken);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        drainQueue(null, accessToken);
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return axiosInstance(original);
      } catch (refreshErr) {
        drainQueue(refreshErr);
        await clearToken();
        onForceLogout?.();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
