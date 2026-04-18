import axiosInstance from './client';

// Backend status: 0 = Good, 1 = Moderate, 2 = Poor
export type CommentStatus = 'Good' | 'Moderate' | 'Poor';

const STATUS_TO_INT: Record<CommentStatus, number> = { Good: 0, Moderate: 1, Poor: 2 };
const INT_TO_STATUS: Record<number, CommentStatus> = { 0: 'Good', 1: 'Moderate', 2: 'Poor' };

export interface Comment {
  id: number;
  commentBody: string;
  status: CommentStatus;
  senderNetid: string;
  receiverNetid: string | null;
  receiverTeamId: number | null;
  teamId: number;
  createdAt: string;
  isPrivate: boolean;
}

function mapComment(raw: Record<string, unknown>): Comment {
  return {
    ...(raw as Omit<Comment, 'status' | 'isPrivate'>),
    status: INT_TO_STATUS[raw.status as number] ?? 'Good',
    isPrivate: (raw.isPrivate as boolean) ?? false,
  };
}

// GET /api/comments/team/{teamId}/user/{receiverNetid}
export const getMemberComments = async (teamId: number, receiverNetid: string): Promise<Comment[]> => {
  const res = await axiosInstance.get(`/api/comments/team/${teamId}/user/${receiverNetid}`);
  return (res.data as Record<string, unknown>[]).map(mapComment);
};

// GET /api/comments/team/{teamId}/general
export const getTeamComments = async (teamId: number): Promise<Comment[]> => {
  const res = await axiosInstance.get(`/api/comments/team/${teamId}/general`);
  return (res.data as Record<string, unknown>[]).map(mapComment);
};

// POST /api/comments  (sender must be the team's assigned TA)
export const createMemberComment = async (data: {
  commentBody: string;
  status: CommentStatus;
  receiverNetid: string;
  teamId: number;
  isPrivate?: boolean;
}): Promise<Comment> => {
  const res = await axiosInstance.post('/api/comments', {
    commentBody: data.commentBody,
    status: STATUS_TO_INT[data.status],
    receiverNetid: data.receiverNetid,
    teamId: data.teamId,
    isPrivate: data.isPrivate ?? false,
  });
  return mapComment(res.data as Record<string, unknown>);
};

// PUT /api/comments/{id}
export const updateComment = async (id: number, data: {
  commentBody: string;
  status: CommentStatus;
  isPrivate: boolean;
}): Promise<Comment> => {
  const res = await axiosInstance.put(`/api/comments/${id}`, {
    commentBody: data.commentBody,
    status: STATUS_TO_INT[data.status],
    isPrivate: data.isPrivate,
  });
  return mapComment(res.data as Record<string, unknown>);
};

// DELETE /api/comments/{id}
export const deleteComment = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/api/comments/${id}`);
};

// POST /api/comments/team/{teamId}/general  (sender must be the team's assigned TA)
export const createTeamComment = async (teamId: number, data: {
  commentBody: string;
  status: CommentStatus;
  isPrivate?: boolean;
}): Promise<Comment> => {
  const res = await axiosInstance.post(`/api/comments/team/${teamId}/general`, {
    commentBody: data.commentBody,
    status: STATUS_TO_INT[data.status],
    isPrivate: data.isPrivate ?? false,
  });
  return mapComment(res.data as Record<string, unknown>);
};
