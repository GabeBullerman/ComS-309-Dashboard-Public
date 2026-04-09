import axiosInstance from './client';

export interface WeeklyPerformanceRecord {
  id: number;
  studentNetid: string;
  weekStartDate: string; // YYYY-MM-DD (Monday of that week)
  codeScore: number;     // 0=poor, 1=moderate, 2=good
  teamworkScore: number;
}

export const getWeeklyPerformanceForStudent = async (netid: string): Promise<WeeklyPerformanceRecord[]> => {
  const res = await axiosInstance.get(`/api/weekly-performance/student/${netid}`);
  return res.data;
};

export const createWeeklyPerformance = async (
  studentNetid: string,
  weekStartDate: string,
  codeScore: number,
  teamworkScore: number
): Promise<WeeklyPerformanceRecord> => {
  const res = await axiosInstance.post('/api/weekly-performance', {
    studentNetid,
    weekStartDate,
    codeScore,
    teamworkScore,
  });
  return res.data;
};

export const updateWeeklyPerformance = async (
  id: number,
  studentNetid: string,
  weekStartDate: string,
  codeScore: number,
  teamworkScore: number
): Promise<WeeklyPerformanceRecord> => {
  const res = await axiosInstance.put(`/api/weekly-performance/${id}`, {
    studentNetid,
    weekStartDate,
    codeScore,
    teamworkScore,
  });
  return res.data;
};
