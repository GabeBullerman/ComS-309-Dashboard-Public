import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'auth_token';

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://coms-4020-006.class.las.iastate.edu:8080';

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // sends/receives cookies (refresh token) on web
});

// ── Token helpers ─────────────────────────────────────────────────────────────

export const storeToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
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
    if (
      error.response?.status === 401 &&
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
        const res = await axiosInstance.post('/api/auth/refresh');
        const newToken: string = res.data;
        await storeToken(newToken);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        drainQueue(null, newToken);
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return axiosInstance(original);
      } catch (refreshErr) {
        drainQueue(refreshErr);
        await clearToken();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
