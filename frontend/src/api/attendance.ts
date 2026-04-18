import axiosInstance from './client';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type AttendanceType = 'LECTURE' | 'MEETING';

export interface AttendanceRecord {
  id: number;
  studentNetid: string;
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
  type: AttendanceType;
}

export const getAttendanceForStudent = async (netid: string): Promise<AttendanceRecord[]> => {
  const res = await axiosInstance.get(`/api/attendance/student/${netid}`);
  return res.data;
};

export const createAttendance = async (
  studentNetid: string,
  attendanceDate: string,
  status: AttendanceStatus,
  type: AttendanceType = 'LECTURE'
): Promise<AttendanceRecord> => {
  const res = await axiosInstance.post('/api/attendance', { studentNetid, attendanceDate, status, type });
  return res.data;
};

export const updateAttendance = async (
  id: number,
  studentNetid: string,
  attendanceDate: string,
  status: AttendanceStatus,
  type: AttendanceType = 'LECTURE'
): Promise<AttendanceRecord> => {
  const res = await axiosInstance.put(`/api/attendance/${id}`, { studentNetid, attendanceDate, status, type });
  return res.data;
};

export const deleteAttendance = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/attendance/${id}`);
};
