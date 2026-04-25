import axiosInstance from './client';

export interface Announcement {
  id: number;
  message: string;
  createdByNetid: string;
  createdByName?: string;
  createdAt: string;
}

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const res = await axiosInstance.get('/api/announcements');
  return Array.isArray(res.data) ? res.data : [];
};

export const createAnnouncement = async (message: string): Promise<Announcement> => {
  const res = await axiosInstance.post('/api/announcements', { message });
  return res.data;
};

export const deleteAnnouncement = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/announcements/${id}`);
};
