import axiosInstance from './client';

export type CalendarEventType = 'PERSONAL' | 'REMINDER' | 'MEETING' | 'OTHER';

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  eventDate: string;   // 'YYYY-MM-DD'
  eventTime?: string;  // 'HH:MM:SS' or null
  netid: string;
  eventType: CalendarEventType;
  createdAt: string;
}

export interface CalendarEventCreateRequest {
  title: string;
  description?: string;
  eventDate: string;
  eventTime?: string;
  eventType: CalendarEventType;
}

export async function getCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const { data } = await axiosInstance.get('/api/calendar/events', { params: { start, end } });
  return Array.isArray(data) ? data : [];
}

export async function getTodayEventCount(): Promise<number> {
  const { data } = await axiosInstance.get('/api/calendar/events/today-count');
  return typeof data?.count === 'number' ? data.count : 0;
}

export async function createCalendarEvent(req: CalendarEventCreateRequest): Promise<CalendarEvent> {
  const { data } = await axiosInstance.post('/api/calendar/events', req);
  return data;
}

export async function updateCalendarEvent(id: number, req: CalendarEventCreateRequest): Promise<CalendarEvent> {
  const { data } = await axiosInstance.put(`/api/calendar/events/${id}`, req);
  return data;
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  await axiosInstance.delete(`/api/calendar/events/${id}`);
}
