export interface TeamMember {
  initials: string;
  color: string;
}

export interface Team {
  name: string;
  description: string;
  memberCount: number;
  semester: string;
  status: 'Good' | 'Moderate' | 'Poor';
  members: TeamMember[];
  extraMembers?: number;
}

export const teamsData: Team[] = [
  {
    name: 'Team Cyclone',
    description: 'IoT Smart Home System',
    memberCount: 4,
    semester: 'Spring 2026',
    status: 'Good',
    members: [
      { initials: 'AJ', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'EC', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'MB', color: 'bg-[#F1BE48] text-gray-800' },
    ],
    extraMembers: 1,
  },
  {
    name: 'Cardinal Engineers',
    description: 'Machine Learning Optimization',
    memberCount: 3,
    semester: 'Spring 2026',
    status: 'Good',
    members: [
      { initials: 'DW', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'JM', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'RT', color: 'bg-[#F1BE48] text-gray-800' },
    ],
  },
  {
    name: 'Gold Rush',
    description: 'Sustainable Energy Dashboard',
    memberCount: 5,
    semester: 'Spring 2026',
    status: 'Moderate',
    members: [
      { initials: 'AW', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'CA', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'NT', color: 'bg-[#F1BE48] text-gray-800' },
    ],
    extraMembers: 2,
  },
  {
    name: 'Red Storm',
    description: 'Agricultural Data Analytics',
    memberCount: 2,
    semester: 'Spring 2026',
    status: 'Good',
    members: [
      { initials: 'BM', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'JJ', color: 'bg-[#F1BE48] text-gray-800' },
    ],
  },
  {
    name: 'Innovators United',
    description: 'Campus Navigation App',
    memberCount: 4,
    semester: 'Fall 2025',
    status: 'Poor',
    members: [
      { initials: 'DH', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'OM', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'MT', color: 'bg-[#F1BE48] text-gray-800' },
    ],
    extraMembers: 1,
  },
  {
    name: 'Code Crafters',
    description: 'Blockchain Voting System',
    memberCount: 3,
    semester: 'Spring 2026',
    status: 'Good',
    members: [
      { initials: 'WC', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'ER', color: 'bg-[#F1BE48] text-gray-800' },
      { initials: 'JL', color: 'bg-[#F1BE48] text-gray-800' },
    ],
  },
];
