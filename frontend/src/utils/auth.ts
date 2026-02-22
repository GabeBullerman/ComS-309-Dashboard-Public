// src/utils/auth.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'Student' | 'TA' | 'Instructor' | 'Head TA' | string;

export interface UserPermissions {
  canViewPastSemesters?: boolean;
  canViewAllTeams?: boolean;
  canAccessTAManager?: boolean;
  canAccessCourses?: boolean;
  canAccessTasks?: boolean;
  canManageTAs?: boolean;
  assignedTeam?: string;
}

export interface UserSummary {
  id?: number;
  netid?: string;
  email?: string;
  role?: UserRole;
  permissions?: UserPermissions;
}

const TOKEN_KEY = 'auth_token';

let apiBaseUrl = 'http://coms-4020-006.class.las.iastate.edu:8080';

export const setApiBaseUrl = (url: string) => {
  apiBaseUrl = url;
  axiosInstance.defaults.baseURL = apiBaseUrl;
};

const axiosInstance = axios.create({ baseURL: apiBaseUrl });

// Attach token to outgoing requests if present
axiosInstance.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

export const storeToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const clearToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

// POST /api/auth/login -> { netid, password } -> returns token string
export const login = async (netid: string, password: string): Promise<{ token: string; user?: UserSummary }> => {
  const res = await axiosInstance.post('/api/auth/login', { netid, password });
  const token: string = res.data;
  await storeToken(token);
  // fetch user summary
  let user: UserSummary | undefined;
  try {
    const userRes = await axiosInstance.get('/api/users/self');
    user = userRes.data;
  } catch (e) {
    // ignore fetching user if it fails
  }
  // persist simple user info for sync with app state
  try {
    if (user?.email) await AsyncStorage.setItem('userEmail', user.email);
    if (user?.role) await AsyncStorage.setItem('user_role', String(user.role));
  } catch (e) {
    // ignore
  }
  return { token, user };
};

// POST /api/auth/logout (requires Authorization header)
export const logout = async (): Promise<string> => {
  const res = await axiosInstance.post('/api/auth/logout');
  await clearToken();
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
};

export const getCurrentUser = async (): Promise<UserSummary | null> => {
  try {
    const res = await axiosInstance.get('/api/users/self');
    return res.data;
  } catch (e) {
    return null;
  }
};

export const getCurrentUserRole = (): UserRole => {
  // synchronous accessor for App state initialization; returns stored role if available
  try {
    // Note: AsyncStorage is async but we keep a best-effort synchronous read using a cached value not available here.
    // Fallback to 'Student' — App will update role after login completes.
    // Consumers should prefer `getCurrentUser()` for authoritative async fetch.
    return 'Student';
  } catch {
    return 'Student';
  }
};

export const getUserPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'Student':
      return {
        canViewPastSemesters: false,
        canViewAllTeams: false,
        canAccessTAManager: false,
        canAccessCourses: false,
        canAccessTasks: true,
        canManageTAs: false,
        assignedTeam: 'Gold Rush',
      };
    case 'TA':
      return {
        canViewPastSemesters: false,
        canViewAllTeams: true,
        canAccessTAManager: false,
        canAccessCourses: true,
        canAccessTasks: true,
        canManageTAs: false,
      };
    case 'Instructor':
      return {
        canViewPastSemesters: true,
        canViewAllTeams: true,
        canAccessTAManager: true,
        canAccessCourses: true,
        canAccessTasks: false,
        canManageTAs: true,
      };
    case 'Head TA':
      return {
        canViewPastSemesters: true,
        canViewAllTeams: true,
        canAccessTAManager: true,
        canAccessCourses: true,
        canAccessTasks: false,
        canManageTAs: false,
      };
    default:
      return {};
  }
};

export default axiosInstance;