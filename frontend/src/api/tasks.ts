import axiosInstance from './client';

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

export const updateTask = async (id: number, data: Partial<Pick<TaskCreateRequest, 'title' | 'description' | 'dueDate'>>): Promise<TaskApiResponse> => {
  const payload = {
    ...data,
    dueDate: data.dueDate ? `${data.dueDate}T00:00:00` : undefined,
  };
  const res = await axiosInstance.put(`/api/tasks/${id}`, payload);
  return res.data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/tasks/${id}`);
};
