import axiosInstance from './client';

export type CommentStatus = 'Good' | 'Moderate' | 'Poor';

// A comment targeting a specific team member (individual comment)
export interface MemberComment {
  id: number;
  message: string;
  status: CommentStatus;
  authorNetid: string;       // who wrote the comment (TA / Instructor)
  recipientNetid: string;    // the student this comment is about
  createdAt: string;         // ISO 8601
}

// A comment targeting a whole team (team comment)
export interface TeamComment {
  id: number;
  message: string;
  status: CommentStatus;
  authorNetid: string;       // who wrote the comment
  teamId: number;            // the team this comment is about
  createdAt: string;         // ISO 8601
}

export interface CreateMemberCommentRequest {
  message: string;
  status: CommentStatus;
  authorNetid: string;
  recipientNetid: string;
}

export interface CreateTeamCommentRequest {
  message: string;
  status: CommentStatus;
  authorNetid: string;
  teamId: number;
}

// --- Individual (member) comments ---

// GET /api/comments/user/{netid}
// Returns all comments written about a specific student
export const getMemberComments = async (netid: string): Promise<MemberComment[]> => {
  // TODO: wire up once Brandon adds the endpoint
  // const res = await axiosInstance.get(`/api/comments/user/${netid}`);
  // return res.data;
  return [];
};

// POST /api/comments/user
// Creates a new comment about a specific student
export const createMemberComment = async (data: CreateMemberCommentRequest): Promise<MemberComment> => {
  // TODO: wire up once Brandon adds the endpoint
  // const res = await axiosInstance.post('/api/comments/user', data);
  // return res.data;
  throw new Error('Not implemented');
};

// --- Team comments ---

// GET /api/comments/team/{teamId}
// Returns all comments written about a specific team
export const getTeamComments = async (teamId: number): Promise<TeamComment[]> => {
  // TODO: wire up once Brandon adds the endpoint
  // const res = await axiosInstance.get(`/api/comments/team/${teamId}`);
  // return res.data;
  return [];
};

// POST /api/comments/team
// Creates a new comment about a specific team
export const createTeamComment = async (data: CreateTeamCommentRequest): Promise<TeamComment> => {
  // TODO: wire up once Brandon adds the endpoint
  // const res = await axiosInstance.post('/api/comments/team', data);
  // return res.data;
  throw new Error('Not implemented');
};

// DELETE /api/comments/{id}
export const deleteComment = async (id: number): Promise<void> => {
  // TODO: wire up once Brandon adds the endpoint
  // await axiosInstance.delete(`/api/comments/${id}`);
};
