import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Team, TeamMember } from '../types/Teams';
import { getUserPermissions, normalizeRole, UserRole } from '../utils/auth';
import { getCurrentUser } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { AtRiskStudentCard } from '@/components/AtRiskStudentCard';

interface Props {
  userRole: UserRole;
}

export default function AtRiskStudentsScreen({ userRole }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const numColumns = width < 640 ? 1 : width < 960 ? 2 : width < 1280 ? 3 : 4;
  const isMobile = width < 640;
  const effectiveRole = normalizeRole(String(userRole));
  const permissions = getUserPermissions(effectiveRole);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const toInitials = (name?: string) => {
      if (!name) return 'NA';
      return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'NA';
    };

    const mapStatus = (status?: number | null): Team['status'] => {
      if (status == null) return 'Moderate';
      if (status <= 0) return 'Poor';
      if (status === 1) return 'Moderate';
      return 'Good';
    };

    const mapTeam = (team: TeamApiResponse): Team => {
      const members: TeamMember[] = (team.students ?? []).map((student) => ({
        id: student.id,
        name: student.name || student.netid || 'Unknown Student',
        netid: student.netid,
        initials: toInitials(student.name || student.netid),
        color: 'bg-[#F1BE48] text-gray-800',
        photo: require('../Images/PersonIcon.png'),
        demoResults: [],
      }));

      return {
        id: team.id,
        name: team.name || 'Unnamed Team',
        description: (team.taNotes && team.taNotes.trim().length > 0) ? team.taNotes : 'No description available',
        memberCount: members.length,
        semester: 'Spring 2026',
        ta: team.taNetid || 'Unassigned',
        section: team.section ?? 0,
        status: mapStatus(team.status),
        members,
        gitlab: team.gitlab ?? undefined,
      };
    };

    const loadTeams = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const currentUser = await getCurrentUser();
        const netid = currentUser?.netid;
        if (!netid) {
          setErrorMessage('Could not identify current user.');
          setIsLoading(false);
          return;
        }
        const normalizedRole = normalizeRole(String(effectiveRole));
        let rawTeams: TeamApiResponse[] = [];
        if (normalizedRole === 'TA') {
          rawTeams = await getTeams(netid);
        } else {
          rawTeams = await getTeams();
        }
        if (normalizedRole === 'Student') {
          rawTeams = rawTeams.filter((team) =>
            (team.students ?? []).some((s) => s.netid === netid)
          );
        }
        setTeams(rawTeams.map(mapTeam));
      } catch {
        setErrorMessage('Failed to load teams from backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeams();
  }, [effectiveRole]);

  const isStudentView   = effectiveRole === 'Student';
  const canFilterSemester = effectiveRole === 'Instructor' || effectiveRole === 'HTA';
  const canFilterSection  = effectiveRole === 'Instructor' || effectiveRole === 'HTA' || effectiveRole === 'TA';
  const searchPlaceholder = 'Search students name, TA, or section...';

  const filteredTeams = useMemo(() => {
    return teams
      .filter((team) => {
        const matchesSearch = isStudentView || (
          team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          team.section.toString().includes(searchQuery) ||
          team.ta.toLowerCase().includes(searchQuery.toLowerCase()) ||
          team.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          team.members.some((m) =>
            m.initials.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
        const matchesRole     = effectiveRole === 'Student' || permissions.canViewPastSemesters || team.semester === 'Spring 2026';
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, searchQuery, effectiveRole, permissions, isStudentView, canFilterSemester, canFilterSection]);

  // — Loading —
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#C8102E" />
        <Text className="text-gray-500 mt-3">Loading students...</Text>
      </View>
    );
  }

  // — Error —
  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Unable to load students</Text>
        <Text className="text-gray-500 mt-2 text-center">{errorMessage}</Text>
      </View>
    );
  }

  const remainder = numColumns > 1 ? filteredTeams.length % numColumns : 0;
  const padded: (Team | null)[] = remainder === 0
    ? filteredTeams
    : [...filteredTeams, ...Array(numColumns - remainder).fill(null)];

  return (
    <View className="flex-1 bg-gray-50">
      <View className={`flex-1 ${isMobile ? 'px-3 pt-3' : 'px-6 pt-6'}`}>

        <Text className={`font-bold text-gray-900 mb-2.5 ${isMobile ? 'text-[22px]' : 'text-[28px]'}`}>
            At-Risk Students
        </Text>

        {(
          <>
            {/* Search */}
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-2.5 py-2 mb-2">
              <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-sm text-slate-800"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </>
        )}

        {/* Student list */}
        <FlatList
          className="flex-1"
          key={numColumns}
          data={padded}
          keyExtractor={(_, i) => i.toString()}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 8, alignItems: 'stretch' } : undefined}
          contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item === null ? (
              <View className="flex-1" />
            ) : (
              <View className="flex-1">
                <AtRiskStudentCard
                    atRiskReason={'hello world'} {...item}
                    onPress={() => navigation.navigate('TeamDetail', { team: item, userRole: effectiveRole })}/>
              </View>
            )
          }
        />
      </View>
    </View>
  );
}