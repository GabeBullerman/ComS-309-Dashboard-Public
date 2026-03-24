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
  receiverNetid: string | null;   // null for general team comments
  receiverTeamId: number | null;  // set for general team comments
  teamId: number;
  createdAt: string;
}

function mapComment(raw: Record<string, unknown>): Comment {
  return { ...(raw as Omit<Comment, 'status'>), status: INT_TO_STATUS[raw.status as number] ?? 'Good' };
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
}): Promise<Comment> => {
  const res = await axiosInstance.post('/api/comments', {
    commentBody: data.commentBody,
    status: STATUS_TO_INT[data.status],
    receiverNetid: data.receiverNetid,
    teamId: data.teamId,
  });
  return mapComment(res.data as Record<string, unknown>);
};

// POST /api/comments/team/{teamId}/general  (sender must be the team's assigned TA)
export const createTeamComment = async (teamId: number, data: {
  commentBody: string;
  status: CommentStatus;
}): Promise<Comment> => {
  const res = await axiosInstance.post(`/api/comments/team/${teamId}/general`, {
    commentBody: data.commentBody,
    status: STATUS_TO_INT[data.status],
  });
  return mapComment(res.data as Record<string, unknown>);
};
