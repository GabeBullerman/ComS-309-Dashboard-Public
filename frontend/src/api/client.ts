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

// ── JWT expiry helper ─────────────────────────────────────────────────────────

function getJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// ── Token refresh (uses raw fetch to bypass axios interceptors) ───────────────

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const rt = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!rt) throw new Error('No refresh token stored');

  const res = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);

  const data = await res.json();
  await storeToken(data.accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data.accessToken as string;
}

// Deduplicates concurrent refresh calls — all callers share the same promise.
function getRefreshPromise(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

// ── Force-logout callback (set by App.tsx so interceptor can trigger nav) ─────

let onForceLogout: (() => void) | null = null;
export const setForceLogoutHandler = (handler: () => void) => {
  onForceLogout = handler;
};

// ── Request interceptor — proactively refresh token when it's near expiry ─────

axiosInstance.interceptors.request.use(async (config) => {
  try {
    const skipAuth = ['/api/auth/login', '/api/auth/refresh', '/api/users/testing/hashAllPasswords'];
    if (skipAuth.some((u) => config.url?.startsWith(u))) return config;

    let token = await AsyncStorage.getItem(TOKEN_KEY);

    if (token) {
      const exp = getJwtExpiry(token);
      // Proactively refresh if the token expires within 60 seconds
      if (!exp || Date.now() >= exp - 60_000) {
        try {
          token = await getRefreshPromise();
        } catch {
          // Refresh failed — let the request proceed; the 401 handler will force-logout
        }
      }
    }

    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // ignore — request proceeds without auth header
  }
  return config;
});

// ── Response interceptor — reactive 401 fallback (clock skew / race safety) ──

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const skipRefresh = ['/api/auth/login', '/api/auth/refresh'];
    const status = error.response?.status;

    if (
      status === 401 &&
      !original._retry &&
      !skipRefresh.some((u) => original.url?.startsWith(u))
    ) {
      original._retry = true;
      try {
        const newToken = await getRefreshPromise();
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return axiosInstance(original);
      } catch (refreshErr) {
        await clearToken();
        onForceLogout?.();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
