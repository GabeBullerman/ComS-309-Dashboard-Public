import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Team, TeamMember } from '../types/Teams';
import { TeamCard } from '../components/TeamCard';
import { getUserPermissions, normalizeRole, UserRole } from '../utils/auth';
import { getCurrentUser, getUsersByRole } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Picker } from '@react-native-picker/picker';

type StatusFilter = 'All' | 'Good' | 'Moderate' | 'Poor';
type SemesterFilter = 'All' | 'Spring 2026' | 'Fall 2025';

interface Props {
  userRole: UserRole;
}

function CycleChip<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  const idx = options.indexOf(value);
  const next = () => onChange(options[(idx + 1) % options.length]);
  const isActive = value !== options[0];
  return (
    <TouchableOpacity
      onPress={next}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isActive ? '#b91c1c' : '#f3f4f6',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
      }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 12, color: isActive ? '#fff' : '#374151', fontWeight: '500' }}>
        {label}: {value}
      </Text>
      <Ionicons name="chevron-down" size={11} color={isActive ? '#fff' : '#6B7280'} />
    </TouchableOpacity>
  );
}

export default function ClassTeamsScreen({ userRole }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const numColumns = width < 640 ? 1 : width < 960 ? 2 : width < 1280 ? 3 : 4;
  const isMobile = width < 640;
  const effectiveRole = normalizeRole(String(userRole));
  const permissions = getUserPermissions(effectiveRole);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

    let taNames = new Map<string, string>();

    const mapTeam = (team: TeamApiResponse): Team => {
      const members: TeamMember[] = (team.students ?? [])
        .slice()
        .sort((a, b) => (a.name || a.netid || '').localeCompare(b.name || b.netid || ''))
        .map((student) => ({
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
        ta: (team.taNetid && taNames.get(team.taNetid)) || team.taNetid || 'Unassigned',
        section: team.section ?? 0,
        status: mapStatus(team.status),
        members,
        gitlab: team.gitlab ?? undefined,
        discord: team.discord ?? undefined,
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

        // Build netid → full name map for TAs/HTAs
        const [tas, htas] = await Promise.all([
          getUsersByRole('TA').catch(() => []),
          getUsersByRole('HTA').catch(() => []),
        ]);
        for (const u of [...tas, ...htas]) {
          if (u.netid && u.name) taNames.set(u.netid, u.name);
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

  const teamStats = useMemo(() => ({
    total: teams.length,
    good: teams.filter((t) => t.status === 'Good').length,
    moderate: teams.filter((t) => t.status === 'Moderate').length,
    poor: teams.filter((t) => t.status === 'Poor').length,
    unassigned: teams.filter((t) => t.ta === 'Unassigned').length,
  }), [teams]);

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

      const matchesRole =
        effectiveRole === 'Student'
          ? true
          : permissions.canViewPastSemesters || team.semester === 'Spring 2026';

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#C8102E" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading teams...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#DC2626' }}>Unable to load teams</Text>
        <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center' }}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 24, paddingTop: isMobile ? 12 : 24 }}>
        {/* Title row — stats sit on the same line for HTA/Instructor, stacked on mobile */}
        <View style={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 10,
        }}>
          <Text style={{ fontSize: isMobile ? 24 : 32, fontWeight: '800', color: '#111827' }}>
            Class Teams
          </Text>

          {canFilterSemester && teams.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Good',     value: teamStats.good,     icon: 'checkmark-circle-outline' as const, color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
                { label: 'Moderate', value: teamStats.moderate, icon: 'remove-circle-outline' as const,    color: '#92400e', bg: '#fefce8', border: '#fde047' },
                { label: 'Poor',     value: teamStats.poor,     icon: 'alert-circle-outline' as const,     color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
              ].map(({ label, value, icon, color, bg, border }) => (
                <View key={label} style={{ backgroundColor: bg, borderRadius: 10, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={icon} size={16} color={color} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color }}>{value}</Text>
                  <Text style={{ fontSize: 12, color, opacity: 0.7, fontWeight: '500' }}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!isStudentView && (
          <>
            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
              <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, fontSize: 14, color: '#1e293b' }}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Filters — native: chip row | web: row of pickers */}
            {Platform.OS !== 'web' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <CycleChip
                  label="Status"
                  value={statusFilter}
                  options={['All', 'Poor', 'Moderate', 'Good'] as StatusFilter[]}
                  onChange={setStatusFilter}
                />
                {canFilterSection && (
                  <CycleChip
                    label="Section"
                    value={sectionFilter}
                    options={sectionOptions}
                    onChange={setSectionFilter}
                  />
                )}
                {canFilterSemester && (
                  <CycleChip
                    label="Semester"
                    value={semesterFilter}
                    options={['All', 'Spring 2026', 'Fall 2025'] as SemesterFilter[]}
                    onChange={setSemesterFilter}
                  />
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {/* Status */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Status</Text>
                  <View style={{ backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, overflow: 'hidden', width: 130 }}>
                    <Picker
                      selectedValue={statusFilter}
                      onValueChange={(value: string) => setStatusFilter(value as StatusFilter)}
                      dropdownIconColor="#000"
                      style={{ height: 36, borderWidth: 0 }}
                    >
                      {(['All', 'Poor', 'Moderate', 'Good'] as StatusFilter[]).map((status) => (
                        <Picker.Item key={status} label={status} value={status} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {canFilterSection && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Section</Text>
                    <View style={{ backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, overflow: 'hidden', width: 110 }}>
                      <Picker
                        selectedValue={sectionFilter}
                        onValueChange={(value: string) => setSectionFilter(value)}
                        dropdownIconColor="#000"
                        style={{ height: 36, borderWidth: 0 }}
                      >
                        {sectionOptions.map((section) => (
                          <Picker.Item key={section} label={section} value={section} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                {canFilterSemester && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Semester</Text>
                    <View style={{ backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8, overflow: 'hidden', width: 150 }}>
                      <Picker
                        selectedValue={semesterFilter}
                        onValueChange={(value: string) => setSemesterFilter(value as SemesterFilter)}
                        dropdownIconColor="#000"
                        style={{ height: 36, borderWidth: 0 }}
                      >
                        {(['All', 'Spring 2026', 'Fall 2025'] as SemesterFilter[]).map((semester) => (
                          <Picker.Item key={semester} label={semester} value={semester} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Stats row */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: '#6B7280' }}>
            Showing {filteredTeams.length} of {teams.length} team{teams.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Teams List — pad last row so all cards stay equal width */}
        {(() => {
          const remainder = numColumns > 1 ? filteredTeams.length % numColumns : 0;
          const padded: (Team | null)[] = remainder === 0
            ? filteredTeams
            : [...filteredTeams, ...Array(numColumns - remainder).fill(null)];
          return (
            <FlatList
              style={{ flex: 1 }}
              key={numColumns}
              data={padded}
              keyExtractor={(_, index) => index.toString()}
              numColumns={numColumns}
              columnWrapperStyle={numColumns > 1 ? { gap: 8, alignItems: 'stretch' } : undefined}
              contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
              renderItem={({ item }) =>
                item === null ? (
                  <View style={{ flex: 1 }} />
                ) : (
                  <View style={{ flex: 1 }}>
                    <TeamCard {...item} onPress={() => {
                      navigation.navigate('TeamDetail', { team: item, userRole: effectiveRole });
                    }} />
                  </View>
                )
              }
              showsVerticalScrollIndicator={false}
            />
          );
        })()}
      </View>
    </View>
  );
}
