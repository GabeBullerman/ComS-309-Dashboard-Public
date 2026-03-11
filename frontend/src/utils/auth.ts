import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance, { storeToken, clearToken } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// Re-export token helpers so existing callers don't break
export { storeToken, clearToken } from '../api/client';
export { getToken } from '../api/client';

// ── Role utilities ────────────────────────────────────────────────────────────

export const normalizeRole = (role?: string | null): UserRole => {
  const normalized = (role ?? '').trim().toUpperCase();
  switch (normalized) {
    case 'STUDENT':    return 'Student';
    case 'TA':         return 'TA';
    case 'HEAD_TA':
    case 'HTA':        return 'HTA';
    case 'INSTRUCTOR':
    case 'PROFESSOR':  return 'Instructor';
    default:           return role && role.length > 0 ? role : 'Student';
  }
};

export const decodeToken = (token: string): { roles?: string[]; sub?: string } => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
};

export const getRoleFromToken = (token: string): UserRole => {
  const decoded = decodeToken(token);
  const roles = decoded.roles || [];
  return normalizeRole(roles.length > 0 ? String(roles[0]) : 'Student');
};

export const getCurrentUserRole = (): UserRole => 'Student'; // sync stub; use getCurrentUser() for real value

export const getUserPermissions = (role: UserRole): UserPermissions => {
  switch (normalizeRole(String(role))) {
    case 'Student':
      return { canViewPastSemesters: false, canViewAllTeams: false, canAccessTAManager: false, canAccessCourses: false, canAccessTasks: true, canManageTAs: false };
    case 'TA':
      return { canViewPastSemesters: false, canViewAllTeams: true, canAccessTAManager: false, canAccessCourses: true, canAccessTasks: true, canManageTAs: false };
    case 'Instructor':
      return { canViewPastSemesters: true, canViewAllTeams: true, canAccessTAManager: true, canAccessCourses: true, canAccessTasks: false, canManageTAs: true };
    case 'HTA':
      return { canViewPastSemesters: true, canViewAllTeams: true, canAccessTAManager: true, canAccessCourses: true, canAccessTasks: false, canManageTAs: false };
    default:
      return {};
  }
};

// ── Auth operations ───────────────────────────────────────────────────────────

export const login = async (netid: string, password: string): Promise<{ token: string; user?: UserSummary }> => {
  const res = await axiosInstance.post('/api/auth/login', { netid, password });
  const token: string = res.data;
  await storeToken(token);

  const role = getRoleFromToken(token);
  let user: UserSummary | undefined;
  try {
    const userRes = await axiosInstance.get('/api/users/self');
    user = userRes.data;
    const userRoleFromApi = Array.isArray((user as any)?.role) ? (user as any).role[0] : user?.role;
    if (user) user.role = normalizeRole((userRoleFromApi as string | undefined) ?? String(role));
  } catch {
    user = { role: normalizeRole(String(role)) };
  }

  try {
    if (user?.netid) await AsyncStorage.setItem('userEmail', user.netid);
    if (user?.role) await AsyncStorage.setItem('user_role', String(user.role));
  } catch {
    // ignore
  }

  return { token, user };
};

export const logout = async (): Promise<string> => {
  const res = await axiosInstance.post('/api/auth/logout');
  await clearToken();
  return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
};

export default axiosInstance;
