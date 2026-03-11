// src/utils/auth.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'Student' | 'TA' | 'Instructor' | 'HTA' | string;

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
  name?: string;
  netid?: string;
  email?: string;
  role?: UserRole;
  permissions?: UserPermissions;
}

export interface TeamApiUser {
  id?: number;
  name?: string;
  netid?: string;
  projectRole?: string;
}

export interface TeamApiResponse {
  id?: number;
  name?: string;
  section?: number;
  taNetid?: string | null;
  students?: TeamApiUser[];
  status?: number | null;
  taNotes?: string | null;
  gitlab?: string | null;
}

const TOKEN_KEY = 'auth_token';

let apiBaseUrl = 'http://coms-4020-006.class.las.iastate.edu:8080';

export const setApiBaseUrl = (url: string) => {
  apiBaseUrl = url;
  axiosInstance.defaults.baseURL = apiBaseUrl;
};

const axiosInstance = axios.create({ baseURL: apiBaseUrl });

// Attach token to outgoing requests if present (skip for login so a stale token doesn't block re-authentication)
axiosInstance.interceptors.request.use(async (config) => {
  try {
    if (config.url === '/api/auth/login') return config;
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

// Decode JWT token to extract user role
export const decodeToken = (token: string): { roles?: string[]; sub?: string } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    
    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (e) {
    console.error('Failed to decode token:', e);
    return {};
  }
};

// Get the first role from the decoded token
export const getRoleFromToken = (token: string): UserRole => {
  const decoded = decodeToken(token);
  const roles = decoded.roles || [];
  return normalizeRole(roles.length > 0 ? String(roles[0]) : 'Student');
};

export const normalizeRole = (role?: string | null): UserRole => {
  const normalized = (role ?? '').trim().toUpperCase();

  switch (normalized) {
    case 'STUDENT':
      return 'Student';
    case 'TA':
      return 'TA';
    case 'HEAD_TA':
    case 'HTA':
      return 'HTA';
    case 'INSTRUCTOR':
    case 'PROFESSOR':
      return 'Instructor';
    default:
      return role && role.length > 0 ? role : 'Student';
  }
};

// POST /api/auth/login -> { netid, password } -> returns token string
export const login = async (netid: string, password: string): Promise<{ token: string; user?: UserSummary }> => {
  const res = await axiosInstance.post('/api/auth/login', { netid, password });
  const token: string = res.data;
  await storeToken(token);
  
  // Extract role from JWT token
  const role = getRoleFromToken(token);
  
  // fetch user summary
  let user: UserSummary | undefined;
  try {
    const userRes = await axiosInstance.get('/api/users/self');
    user = userRes.data;
    const userRoleFromApi = Array.isArray((user as any)?.role)
      ? (user as any).role[0]
      : user?.role;
    if (user) user.role = normalizeRole((userRoleFromApi as string | undefined) ?? String(role));
  } catch (e) {
    // If fetchng user fails, create a basic user object with role from token
    user = { role: normalizeRole(String(role)) };
  }
  
  // persist simple user info for sync with app state
  try {
    if (user?.netid) await AsyncStorage.setItem('userEmail', user.netid);
    if (user?.role) {
      await AsyncStorage.setItem('user_role', String(user.role));
    } else if (role) {
      await AsyncStorage.setItem('user_role', String(normalizeRole(String(role))));
    }
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
    const userData = res.data;
    const userRoleFromApi = Array.isArray(userData?.role) ? userData.role[0] : userData?.role;
    return {
      ...userData,
      role: normalizeRole(userRoleFromApi),
    };
  } catch (e) {
    return null;
  }
};

export const getUserByNetid = async (netid: string): Promise<UserSummary | null> => {
  try {
    const res = await axiosInstance.get(`/api/users/netid/${netid}`);
    const userData = res.data;
    const userRoleFromApi = Array.isArray(userData?.role) ? userData.role[0] : userData?.role;
    return { ...userData, role: normalizeRole(userRoleFromApi) };
  } catch {
    return null;
  }
};

export const getTeams = async (taNetid?: string): Promise<TeamApiResponse[]> => {
  const baseParams = taNetid ? { taNetid } : {};
  const first = await axiosInstance.get('/api/teams', {
    params: baseParams,
  });

  if (Array.isArray(first.data)) {
    return first.data;
  }

  if (first.data && Array.isArray(first.data.content)) {
    const totalPages = Number(first.data.totalPages ?? 1);
    if (totalPages <= 1) {
      return first.data.content;
    }

    const allTeams: TeamApiResponse[] = [...first.data.content];
    for (let page = 1; page < totalPages; page += 1) {
      const next = await axiosInstance.get('/api/teams', {
        params: { ...baseParams, page },
      });
      if (next.data && Array.isArray(next.data.content)) {
        allTeams.push(...next.data.content);
      }
    }
    return allTeams;
  }

  return [];
};

export const getTeam = async (teamId: number): Promise<TeamApiResponse> => {
  const res = await axiosInstance.get(`/api/teams/${teamId}`);
  return res.data;
};

export const updateTeamInfo = async (teamId: number, data: { name?: string; gitlab?: string }): Promise<void> => {
  await axiosInstance.put(`/api/teams/${teamId}`, data);
};

export const setUserProjectRole = async (userId: number, projectRole: string): Promise<void> => {
  await axiosInstance.put(`/api/users/${userId}/project-role`, { projectRole });
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskApiResponse {
  id: number;
  title: string;
  description?: string;
  assignedDate?: string;
  dueDate?: string;
  assignedToNetid?: string;
  assignedByNetid?: string;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  dueDate?: string;
  assignedToNetid: string;
  assignedByNetid: string;
}

export const getTasksAssignedTo = async (netid: string): Promise<TaskApiResponse[]> => {
  const res = await axiosInstance.get(`/api/tasks/assigned-to/${netid}`);
  return Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
};

export const getTasksAssignedBy = async (netid: string): Promise<TaskApiResponse[]> => {
  const res = await axiosInstance.get(`/api/tasks/assigned-by/${netid}`);
  return Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
};

export const createTask = async (data: TaskCreateRequest): Promise<TaskApiResponse> => {
  // Backend expects LocalDateTime — convert YYYY-MM-DD to YYYY-MM-DDTHH:mm:ss
  const payload = {
    ...data,
    dueDate: data.dueDate ? `${data.dueDate}T00:00:00` : undefined,
  };
  const res = await axiosInstance.post('/api/tasks', payload);
  return res.data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/tasks/${id}`);
};

export const getUsersByRole = async (role: string): Promise<UserSummary[]> => {
  const res = await axiosInstance.get(`/api/users/role/${encodeURIComponent(role)}`);
  return Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
};

// ─────────────────────────────────────────────────────────────────────────────

export const getCurrentUserRole = (): UserRole => {
  // synchronous accessor for App state initialization; returns stored role if available
  try {
    // Note: AsyncStorage is async but we keep a best-effort synchronous read using a cached value not available here.
    // This function is synchronous, so it can't directly use AsyncStorage.
    // The App component should handle loading the role from storage in useEffect.
    // Fallback to 'Student' — App will update role after login/load completes.
    // Consumers should prefer `getCurrentUser()` for authoritative async fetch.
    return 'Student';
  } catch {
    return 'Student';
  }
};

export const getUserPermissions = (role: UserRole): UserPermissions => {
  const normalizedRole = normalizeRole(String(role));

  switch (normalizedRole) {
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
    case 'HTA':
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