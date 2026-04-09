import axiosInstance from './client';

export interface DemoPerformanceRecord {
  id: number;
  studentNetid: string;
  demoNumber: number;    // 1-4
  codeScore: number;     // 0=poor, 1=moderate, 2=good
  teamworkScore: number;
}

export const getDemoPerformanceForStudent = async (netid: string): Promise<DemoPerformanceRecord[]> => {
  const res = await axiosInstance.get(`/api/demo-performance/student/${netid}`);
  return res.data;
};

export const createDemoPerformance = async (
  studentNetid: string,
  demoNumber: number,
  codeScore: number,
  teamworkScore: number
): Promise<DemoPerformanceRecord> => {
  const res = await axiosInstance.post('/api/demo-performance', {
    studentNetid,
    demoNumber,
    codeScore,
    teamworkScore,
  });
  return res.data;
};

export const updateDemoPerformance = async (
  id: number,
  studentNetid: string,
  demoNumber: number,
  codeScore: number,
  teamworkScore: number
): Promise<DemoPerformanceRecord> => {
  const res = await axiosInstance.put(`/api/demo-performance/${id}`, {
    studentNetid,
    demoNumber,
    codeScore,
    teamworkScore,
  });
  return res.data;
};
