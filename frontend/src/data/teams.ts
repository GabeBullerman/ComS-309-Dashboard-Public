import { Image } from "react-native";

export interface TeamMember {
  name: string;
  initials: string;
  color: string;
  photo: ReturnType<typeof Image.resolveAssetSource> | string;
}

export interface Team {
  name: string;
  description: string;
  memberCount: number;
  semester: string;
  ta: string;
  section: number;
  status: 'Good' | 'Moderate' | 'Poor';
  members: TeamMember[];
}

export const teamsData: Team[] = [
  {
    name: 'Team Cyclone',
    description: 'IoT Smart Home System',
    memberCount: 4,
    semester: 'Spring 2026',
    ta: 'John Doe',
    section: 1,
    status: 'Good',
    members: [
      { name: 'Alex Johnson', initials: 'AJ', color: 'bg-[#F1BE48] text-gray-800' , photo: require('../Images/PersonIcon.png')},
      { name: 'Emma Chen', initials: 'EC', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Michael Brown', initials: 'MB', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Sarah Davis', initials: 'SD', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
    ],
  },
  {
    name: 'Cardinal Engineers',
    description: 'Machine Learning Optimization',
    memberCount: 3,
    semester: 'Spring 2026',
    ta: 'Jane Smith',
    section: 2,
    status: 'Good',
    members: [
      { name: 'David Wilson', initials: 'DW', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'James Miller', initials: 'JM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Robert Taylor', initials: 'RT', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
    ],
  },
  {
    name: 'Gold Rush',
    description: 'Sustainable Energy Dashboard',
    memberCount: 5,
    semester: 'Spring 2026',
    ta: 'John Smith',
    section: 5,
    status: 'Moderate',
    members: [
      { name: 'Alice Wang', initials: 'AW', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Caleb Anderson', initials: 'CA', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Nina Thompson', initials: 'NT', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Olivia Martinez', initials: 'OM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Thomas Johnson', initials: 'TJ', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
    ],
  },
  {
    name: 'Red Storm',
    description: 'Agricultural Data Analytics',
    memberCount: 2,
    semester: 'Spring 2026',
    ta: 'David Lee',
    section: 1,
    status: 'Good',
    members: [
      { name: 'Benjamin Moore', initials: 'BM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'James Johnson', initials: 'JJ', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
    ],
  },
  {
    name: 'Innovators United',
    description: 'Campus Navigation App',
    memberCount: 4,
    semester: 'Fall 2025',
    ta: 'John Smith',
    section: 2,
    status: 'Poor',
    members: [
      { name: 'Derek Hill', initials: 'DH', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Olivia Martinez', initials: 'OM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Mason Thompson', initials: 'MT', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Jasmine Smith', initials: 'JS', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
    ],
  },
  {
    name: 'Code Crafters',
    description: 'Blockchain Voting System',
    memberCount: 3,
    semester: 'Spring 2026',
    ta: 'John Smith',
    section: 3,
    status: 'Good',
    members: [
      { name: 'William Chen', initials: 'WC', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Ethan Rodriguez', initials: 'ER', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
      { name: 'Jack Liu', initials: 'JL', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png') },
    ],
  },
];
