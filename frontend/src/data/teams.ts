import { Image } from "react-native";

export interface TeamMember {
  name: string;
  initials: string;
  color: string;
  photo: ReturnType<typeof Image.resolveAssetSource> | string;
  demoResults?: Demo[];
}

export interface Demo{
  name: string;
  result: string;
  contribution: string;
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
      { name: 'Alex Johnson', initials: 'AJ', color: 'bg-[#F1BE48] text-gray-800' , photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature A', result: 'Success', contribution: 'Implemented feature A for device control.' },
        { name: 'Feature B', result: 'Moderate', contribution: 'Assisted with debugging feature B, which had some issues.' },
      ]},
      { name: 'Emma Chen', initials: 'EC', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature C', result: 'Success', contribution: 'Implemented feature C for device monitoring.' },
        { name: 'Feature D', result: 'Failed', contribution: 'Encountered issues with feature D integration.' },
      ]},
      { name: 'Michael Brown', initials: 'MB', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature E', result: 'Success', contribution: 'Implemented feature E for device automation.' },
        { name: 'Feature F', result: 'Failed', contribution: 'Encountered issues with feature F integration.' },
      ]},
      { name: 'Sarah Davis', initials: 'SD', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature G', result: 'Success', contribution: 'Implemented feature G for device security.' },
        { name: 'Feature H', result: '', contribution: '' },
      ]},
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
      { name: 'David Wilson', initials: 'DW', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature I', result: 'Success', contribution: 'Implemented feature I for device monitoring.' },
        { name: 'Feature J', result: 'Failed', contribution: 'Encountered issues with feature J integration.' },
      ]},
      { name: 'James Miller', initials: 'JM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature K', result: 'Success', contribution: 'Implemented feature K for device automation.' },
        { name: 'Feature L', result: '', contribution: '' },
      ]},
      { name: 'Robert Taylor', initials: 'RT', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: '' },
        { name: 'Feature M', result:'', contribution:'' },
        { name:'Feature N', result:'', contribution:'' },
      ]},
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
      { name: 'Alice Wang', initials: 'AW', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic IoT devices and connectivity.' },
        { name: 'Feature O', result: 'Success', contribution: 'Implemented feature O for device monitoring.' },
        { name: 'Feature P', result: '', contribution: '' },
      ]},
      { name: 'Caleb Anderson', initials: 'CA', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: '' },
        { name: 'Feature Q', result:'', contribution:'' },
        { name:'Feature R', result:'', contribution:'' },
      ]},
      { name: 'Nina Thompson', initials: 'NT', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: '' },
        { name:'Feature S', result:'', contribution:'' },
        { name:'Feature T', result:'', contribution:'' },
      ]},
      { name: 'Olivia Martinez', initials: 'OM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name:'Initial Setup', result:'', contribution:'' },
        { name:'Feature U', result:'', contribution:'' },
        { name:'Feature V', result:'', contribution:'' },
      ]},
      { name: 'Thomas Johnson', initials: 'TJ', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults:[
        { name:'Initial Setup', result:'', contribution:'' },
        { name:'Feature W', result:'', contribution:'' },
        { name:'Feature X', result:'', contribution:'' },
      ]},
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
      { name: 'Benjamin Moore', initials: 'BM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: 'Success', contribution: 'Set up basic infrastructure and team structure.' },
        { name: 'Feature Y', result: '', contribution: '' },
        { name: 'Feature Z', result: '', contribution: '' },
      ]},
      { name: 'James Johnson', initials: 'JJ', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: '' },
        { name:'Feature AA', result:'', contribution:'' },
        { name:'Feature AB', result:'', contribution:'' },
      ]},
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
      { name: 'Derek Hill', initials: 'DH', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: 'hello world' },
        { name: 'Feature AC', result: '', contribution: 'Set up the initial project structure and dependencies.' },
        { name: 'Feature AD', result: '', contribution: 'Implemented basic UI components for navigation.' },
      ]},
      { name: 'Olivia Martinez', initials: 'OM', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: 'Set up the initial project structure and dependencies.' },
        { name:'Feature AE', result:'', contribution:'Implemented the core navigation logic and UI components.' },
        { name:'Feature AF', result:'', contribution:'Added support for multiple campus locations and building layouts.' },
      ]},
      { name: 'Mason Thompson', initials: 'MT', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults:[
        { name:'Initial Setup', result:'good', contribution:'Set up the initial project structure and dependencies.' },
        { name:'Feature AG', result:'poor', contribution:'Implemented the core navigation logic and UI components.' },
        { name:'Feature AH', result:'great', contribution:'Added support for multiple campus locations and building layouts.' },
      ]},
      { name: 'Jasmine Smith', initials: 'JS', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults:[
        { name:'Initial Setup', result:'', contribution:'Set up the initial project structure and dependencies.' },
        { name:'Feature AI', result:'', contribution:'Implemented the core UI components for the application.' },
        { name:'Feature AJ', result:'', contribution:'Added support for user authentication and session management.' },
      ]},
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
      { name: 'William Chen', initials: 'WC', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults: [
        { name: 'Initial Setup', result: '', contribution: '' },
        { name: 'Feature AK', result: '', contribution: '' },
        { name: 'Feature AL', result: '', contribution: '' },
      ]},
      { name: 'Ethan Rodriguez', initials: 'ER', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults:[
        { name:'Initial Setup', result:'', contribution:'' },
        { name:'Feature AM', result:'', contribution:'' },
        { name:'Feature AN', result:'', contribution:'' },
      ]},
      { name: 'Jack Liu', initials: 'JL', color: 'bg-[#F1BE48] text-gray-800', photo: require('../Images/PersonIcon.png'), demoResults:[
        { name:'Initial Setup', result:'', contribution:'' },
        { name:'Feature AO', result:'', contribution:'' },
        { name:'Feature AP', result:'', contribution:'' },
      ]},
    ],
  },
];
