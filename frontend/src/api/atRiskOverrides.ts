import axiosInstance from './client';

export interface AtRiskOverride {
  id: number;
  studentNetid: string;
  reason: string;
  flaggedByNetid: string;
  createdAt: string;
}

export const getAllAtRiskOverrides = async (): Promise<AtRiskOverride[]> => {
  const res = await axiosInstance.get('/api/at-risk-overrides');
  return res.data;
};

export const getAtRiskOverridesForStudent = async (netid: string): Promise<AtRiskOverride[]> => {
  const res = await axiosInstance.get(`/api/at-risk-overrides/student/${netid}`);
  return res.data;
};

export const createAtRiskOverride = async (studentNetid: string, reason: string): Promise<AtRiskOverride> => {
  const res = await axiosInstance.post('/api/at-risk-overrides', { studentNetid, reason });
  return res.data;
};

export const deleteAtRiskOverride = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/at-risk-overrides/${id}`);
};

export const clearAtRiskOverridesForStudent = async (netid: string): Promise<void> => {
  await axiosInstance.delete(`/api/at-risk-overrides/student/${netid}`);
};
