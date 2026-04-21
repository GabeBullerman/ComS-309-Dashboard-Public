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
  channelName: string;
}

export const CHANNELS = [
  { id: 'general',         defaultLabel: 'General',        icon: 'chatbubble-ellipses-outline' as const },
  { id: 'system-feedback', defaultLabel: 'System Feedback', icon: 'construct-outline' as const },
  { id: 'announcements',   defaultLabel: 'Announcements',   icon: 'megaphone-outline' as const },
];

export interface ChannelMeta {
  id: string;
  displayName: string;
  description: string | null;
}

export const getChannels = async (): Promise<ChannelMeta[]> => {
  const res = await axiosInstance.get('/api/chat/channels');
  return res.data as ChannelMeta[];
};

export const updateChannel = async (id: string, data: { displayName: string; description: string | null }): Promise<ChannelMeta> => {
  const res = await axiosInstance.put(`/api/chat/channels/${id}`, data);
  return res.data as ChannelMeta;
};

export const getMessages = async (channel: string, before?: number, limit = 50): Promise<ChatMessage[]> => {
  const params: Record<string, string | number> = { limit, channel };
  if (before !== undefined) params.before = before;
  const res = await axiosInstance.get('/api/chat/messages', { params });
  return res.data as ChatMessage[];
};

export const sendMessage = async (data: {
  content: string;
  channel: string;
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

export const getAllUnreadCounts = async (): Promise<Record<string, number>> => {
  const res = await axiosInstance.get('/api/chat/unread/all');
  return res.data as Record<string, number>;
};

export const markRead = async (lastMessageId: number, channel: string): Promise<void> => {
  await axiosInstance.post('/api/chat/mark-read', { lastMessageId, channel });
};

export const sendTyping = async (channel: string): Promise<void> => {
  await axiosInstance.post('/api/chat/typing', { channel });
};

export const getTyping = async (channel: string): Promise<string[]> => {
  const res = await axiosInstance.get('/api/chat/typing', { params: { channel } });
  return res.data as string[];
};
