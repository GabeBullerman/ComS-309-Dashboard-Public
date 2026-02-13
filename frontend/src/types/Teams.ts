export type TeamStatus = "Active" | "Pending" | "Completed";

export interface Team {
  id: string;
  name: string;
  project: string;
  members: number;
  status: TeamStatus;
  semester: string;
  lastActive: string;
}