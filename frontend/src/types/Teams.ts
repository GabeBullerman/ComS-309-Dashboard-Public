import { Image } from 'react-native';

export interface Demo {
  name: string;
  result: string;
  contribution: string;
}

export interface TeamMember {
  id?: number;
  name: string;
  netid?: string;
  initials: string;
  color: string;
  photo: ReturnType<typeof Image.resolveAssetSource> | string;
  demoResults?: Demo[];
}

export interface Team {
  id?: number;
  name: string;
  description: string;
  memberCount: number;
  semester: string;
  ta: string;
  section: number;
  status: 'Good' | 'Moderate' | 'Poor';
  members: TeamMember[];
  gitlab?: string;
}
