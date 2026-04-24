import axiosInstance from './client';

export async function getSemesterStartDate(): Promise<string | null> {
  const res = await axiosInstance.get<{ semesterStartDate: string }>('/api/settings/semester-start');
  return res.data.semesterStartDate || null;
}

export async function setSemesterStartDate(isoDate: string): Promise<string> {
  const res = await axiosInstance.put<{ semesterStartDate: string }>('/api/settings/semester-start', {
    semesterStartDate: isoDate,
  });
  return res.data.semesterStartDate;
}
