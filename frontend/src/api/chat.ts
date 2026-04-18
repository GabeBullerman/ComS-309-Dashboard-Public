import axiosInstance from './client';

export interface ReplyPreview {
  id: number;
  senderNetid: string;
  senderName: string | null;
  content: string;
}

export interface ChatMessage {
  id: number;
  senderNetid: string;
  senderName: string | null;
  content: string;
  replyToId: number | null;
  replyTo: ReplyPreview | null;
  mentionedNetids: string[];
  mentionedRoles: string[];
  edited: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export const getMessages = async (before?: number, limit = 50): Promise<ChatMessage[]> => {
  const params: Record<string, string | number> = { limit };
  if (before !== undefined) params.before = before;
  const res = await axiosInstance.get('/api/chat/messages', { params });
  return res.data as ChatMessage[];
};

export const sendMessage = async (data: {
  content: string;
  replyToId?: number;
  mentionedNetids: string[];
  mentionedRoles: string[];
}): Promise<ChatMessage> => {
  const res = await axiosInstance.post('/api/chat/messages', data);
  return res.data as ChatMessage;
};

export const editMessage = async (id: number, data: {
  content: string;
  mentionedNetids: string[];
  mentionedRoles: string[];
}): Promise<ChatMessage> => {
  const res = await axiosInstance.put(`/api/chat/messages/${id}`, data);
  return res.data as ChatMessage;
};

export const deleteMessage = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/chat/messages/${id}`);
};

export const getUnreadCount = async (): Promise<number> => {
  const res = await axiosInstance.get('/api/chat/unread');
  return (res.data as { count: number }).count;
};

export const markRead = async (lastMessageId: number): Promise<void> => {
  await axiosInstance.post('/api/chat/mark-read', { lastMessageId });
};
