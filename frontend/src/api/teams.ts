import axiosInstance from './client';

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
  discord?: string | null;
}

export const getTeams = async (taNetid?: string): Promise<TeamApiResponse[]> => {
  const baseParams = taNetid ? { taNetid } : {};
  const first = await axiosInstance.get('/api/teams', { params: baseParams });

  if (Array.isArray(first.data)) return first.data;

  if (first.data && Array.isArray(first.data.content)) {
    const totalPages = Number(first.data.totalPages ?? 1);
    if (totalPages <= 1) return first.data.content;

    const allTeams: TeamApiResponse[] = [...first.data.content];
    for (let page = 1; page < totalPages; page += 1) {
      const next = await axiosInstance.get('/api/teams', { params: { ...baseParams, page } });
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

export const updateTeamInfo = async (teamId: number, data: { name?: string; gitlab?: string; discord?: string }): Promise<void> => {
  await axiosInstance.put(`/api/teams/${teamId}`, data);
};
