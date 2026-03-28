import axiosInstance from './client';
import { normalizeRole, UserSummary } from '../utils/auth';

export const getCurrentUser = async (): Promise<UserSummary | null> => {
  try {
    const res = await axiosInstance.get('/api/users/self');
    const userData = res.data;
    const userRoleFromApi = Array.isArray(userData?.role) ? userData.role[0] : userData?.role;
    return { ...userData, role: normalizeRole(userRoleFromApi) };
  } catch {
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

export const getUsersByRole = async (role: string): Promise<UserSummary[]> => {
  const res = await axiosInstance.get(`/api/users/role/${encodeURIComponent(role)}`);
  return Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
};

export const setUserProjectRole = async (userId: number, projectRole: string): Promise<void> => {
  await axiosInstance.put(`/api/users/${userId}/project-role`, { projectRole });
};

export const getGitLabTokenFromBackend = async (): Promise<string | null> => {
  try {
    const res = await axiosInstance.get('/api/users/self/gitlab-token');
    return typeof res.data === 'string' ? res.data : (res.data?.gitlabToken ?? null);
  } catch {
    return null;
  }
};

export const saveGitLabTokenToBackend = async (token: string): Promise<void> => {
  await axiosInstance.put('/api/users/self/gitlab-token', { gitlabToken: token.trim() });
};

export const createUser = async (data: { netid: string; name: string; password: string; role: string[] }): Promise<UserSummary> => {
  const res = await axiosInstance.post('/api/users', data);
  return res.data;
};

export const updateUser = async (id: number, data: { role?: string[]; name?: string }): Promise<UserSummary> => {
  const res = await axiosInstance.put(`/api/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/users/${id}`);
};
