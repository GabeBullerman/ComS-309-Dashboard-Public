import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Team, TeamMember, teamsData } from '../data/teams';
import { TeamCard } from '../components/TeamCard';
import { getCurrentUser, getTeams, getUserPermissions, normalizeRole, TeamApiResponse, UserRole } from '../utils/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Picker } from '@react-native-picker/picker';

type StatusFilter = 'All' | 'Good' | 'Moderate' | 'Poor';
type SemesterFilter = 'All' | 'Spring 2026' | 'Fall 2025';

interface Props {
  userRole: UserRole;
}

export default function ClassTeamsScreen({ userRole }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const effectiveRole = normalizeRole(String(userRole));
  const permissions = getUserPermissions(effectiveRole);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [teams, setTeams] = useState<Team[]>(teamsData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<typeof teamsData[0] | null>(null);

  useEffect(() => {
    const toInitials = (name?: string) => {
      if (!name) return 'NA';
      return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'NA';
    };

    const mapStatus = (status?: number | null): Team['status'] => {
      if (status == null) return 'Moderate';
      if (status <= 0) return 'Poor';
      if (status === 1) return 'Moderate';
      return 'Good';
    };

    const mapTeam = (team: TeamApiResponse): Team => {
      const members: TeamMember[] = (team.students ?? []).map((student) => ({
        name: student.name || student.netid || 'Unknown Student',
        initials: toInitials(student.name || student.netid),
        color: 'bg-[#F1BE48] text-gray-800',
        photo: require('../Images/PersonIcon.png'),
        demoResults: [],
      }));

      return {
        name: team.name || 'Unnamed Team',
        description: (team.taNotes && team.taNotes.trim().length > 0) ? team.taNotes : (team.gitlab || 'No description available'),
        memberCount: members.length,
        semester: 'Spring 2026',
        ta: team.taNetid || 'Unassigned',
        section: team.section ?? 0,
        status: mapStatus(team.status),
        members,
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
            (team.students ?? []).some((student) => student.netid === netid)
          );
        }

        setTeams(rawTeams.map(mapTeam));
      } catch (error) {
        setErrorMessage('Failed to load teams from backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeams();
  }, [effectiveRole]);

  const isStudentView = effectiveRole === 'Student';
  const isTAView = effectiveRole === 'TA';
  const canFilterSemester = effectiveRole === 'Instructor' || effectiveRole === 'HTA';
  const canFilterSection = effectiveRole === 'Instructor' || effectiveRole === 'HTA' || effectiveRole === 'TA';
  const searchPlaceholder = isTAView
    ? 'Search teams or members...'
    : 'Search teams, TA, or members...';

  const sectionOptions = useMemo(() => {
    const sections = Array.from(new Set(teams.map((team) => team.section)))
      .filter((section) => Number.isFinite(section))
      .sort((a, b) => a - b)
      .map((section) => String(section));

    return ['All', ...sections];
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const filtered = teams.filter((team) => {
      const matchesSearch =
        isStudentView
          ? true
          : team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.section.toString().includes(searchQuery) ||
            team.ta.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.members.some((member) =>
              member.initials.toLowerCase().includes(searchQuery.toLowerCase()) ||
              member.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

      const matchesStatus =
        isStudentView || statusFilter === 'All' || team.status === statusFilter;

      const matchesSemester =
        !canFilterSemester || semesterFilter === 'All' || team.semester === semesterFilter;

      const matchesSection =
        !canFilterSection || sectionFilter === 'All' || String(team.section) === sectionFilter;

      // Role-based filtering
      const matchesRole =
        effectiveRole === 'Student'
          ? true
          : permissions.canViewPastSemesters || team.semester === 'Spring 2026'; // Others can see past if allowed

      return matchesSearch && matchesStatus && matchesSemester && matchesSection && matchesRole;
    });

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    teams,
    searchQuery,
    statusFilter,
    semesterFilter,
    sectionFilter,
    effectiveRole,
    permissions,
    isStudentView,
    canFilterSemester,
    canFilterSection,
  ]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#C8102E" />
        <Text className="text-gray-500 mt-3">Loading teams...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-lg font-semibold text-red-600">Unable to load teams</Text>
        <Text className="text-gray-500 mt-2 text-center">{errorMessage}</Text>
      </View>
    );
  }


  return (
    <View className="flex-row flex-1 bg-gray-50">
      {/* Main Content */}
      <View className="flex-1 p-6">
        <Text className="text-3xl font-bold">
          Class Teams
        </Text>
        <View className="mb-4" />

        {!isStudentView && (
          <>
            {/* Search */}
            <View className="flex-row items-center bg-white rounded-lg px-4 py-2 mb-3">
              <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="w-full pl-3 pr-4 py-3 bg-white border border-gray-300 rounded-lg"
              />
            </View>

            {/* Filters */}
            <View className="flex-row mb-4">
              <Text className="text-sm text-gray-600 mb-2 mr-2 my-2">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(value: string) => setStatusFilter(value as StatusFilter)}
                  dropdownIconColor="#000"
                  style={{ height: 44, backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8 }}
                >
                  {(['All', 'Poor', 'Moderate', 'Good'] as StatusFilter[]).map((status) => (
                    <Picker.Item key={status} label={status} value={status} />
                  ))}
                </Picker>
              </View>

              {canFilterSection && (
                <>
                  <Text className="text-sm text-gray-600 mx-2 my-2 mb-2">Section</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Picker
                      selectedValue={sectionFilter}
                      onValueChange={(value: string) => setSectionFilter(value)}
                      dropdownIconColor="#000"
                      style={{ height: 44, backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8 }}
                    >
                      {sectionOptions.map((section) => (
                        <Picker.Item key={section} label={section} value={section} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              {canFilterSemester && (
                <>
                  <Text className="text-sm text-gray-600 mx-2 my-2 mb-2">Semester</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Picker
                      selectedValue={semesterFilter}
                      onValueChange={(value: string) => setSemesterFilter(value as SemesterFilter)}
                      dropdownIconColor="#000"
                      style={{ height: 44, backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8 }}
                    >
                      {(['All', 'Spring 2026', 'Fall 2025'] as SemesterFilter[]).map((semester) => (
                        <Picker.Item key={semester} label={semester} value={semester} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

            </View>
          </>
        )}

      <Text className="text-gray-500 mb-4">
        Showing {filteredTeams.length} of {teams.length} teams
      </Text>

        {/* Teams List */}
        <FlatList
          data={filteredTeams}
          keyExtractor={(_, index) => index.toString()}
          numColumns={4}
          columnWrapperStyle={{ gap: 8 }}   // spacing between columns
          contentContainerStyle={{
            paddingBottom: 40,
            gap: 8,                          // spacing between rows
          }}
          renderItem={({ item }) => (
            <View style={{ width: '24.5%' }}>
              <TeamCard {...item} onPress={() => {  
                setSelectedTeam(item);
                navigation.navigate('TeamDetail', { team: item });
              }}/>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}