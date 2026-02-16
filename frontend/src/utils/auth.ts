// src/utils/auth.ts
export type UserRole = 'Student' | 'TA' | 'Instructor' | 'Head TA';

export interface UserPermissions {
  canViewPastSemesters: boolean;
  canViewAllTeams: boolean;
  canAccessTAManager: boolean;
  canAccessCourses: boolean;
  canAccessTasks: boolean;
  canManageTAs: boolean; // For instructors to invite/manage TAs
  assignedTeam?: string; // For students
}

// Mock function to get current user role - replace with actual auth later
export const getCurrentUserRole = (): UserRole => {
  // For now, return a hardcoded role - change this to test different user types
  // Options: 'Student' | 'TA' | 'Instructor' | 'Head TA'
  return 'Instructor'; // Change this to test different roles
};

// Mock function to get user permissions based on role
export const getUserPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'Student':
      return {
        canViewPastSemesters: false,
        canViewAllTeams: false,
        canAccessTAManager: false,
        canAccessCourses: false,
        canAccessTasks: true,
        canManageTAs: false,
        assignedTeam: 'Gold Rush', // Mock assigned team
      };
    case 'TA':
      return {
        canViewPastSemesters: false,
        canViewAllTeams: true,
        canAccessTAManager: false,
        canAccessCourses: true,
        canAccessTasks: true,
        canManageTAs: false,
      };
    case 'Instructor':
      return {
        canViewPastSemesters: true,
        canViewAllTeams: true,
        canAccessTAManager: true,
        canAccessCourses: true,
        canAccessTasks: false,
        canManageTAs: true,
      };
    case 'Head TA':
      return {
        canViewPastSemesters: true,
        canViewAllTeams: true,
        canAccessTAManager: true,
        canAccessCourses: true,
        canAccessTasks: false,
        canManageTAs: false,
      };
    default:
      return {
        canViewPastSemesters: false,
        canViewAllTeams: false,
        canAccessTAManager: false,
        canAccessCourses: false,
        canAccessTasks: false,
        canManageTAs: false,
      };
  }
};

// Mock function to get current user info - replace with actual auth later
export const getCurrentUser = () => {
  const role = getCurrentUserRole();
  const permissions = getUserPermissions(role);
  return {
    email: 'user@iastate.edu', // Mock
    role,
    permissions,
  };
};