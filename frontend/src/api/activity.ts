import axiosInstance from './client';

export type ActivityStatus = 'online' | 'away' | 'offline';

export async function sendHeartbeat(): Promise<void> {
  await axiosInstance.post('/api/users/heartbeat');
}

export async function getActivityStatuses(): Promise<Record<string, ActivityStatus>> {
  const { data } = await axiosInstance.get('/api/users/activity-status');
  return data ?? {};
}
