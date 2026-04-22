import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
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
import { getCurrentUser, getUsersByRole, getGitLabTokenFromBackend } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getWeeklyPerformanceForStudent } from '../api/weeklyPerformance';
import { getDemoPerformanceForStudent } from '../api/demoPerformance';

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
  const { colors } = useTheme();
  const idx = options.indexOf(value);
  const next = () => onChange(options[(idx + 1) % options.length]);
  const isActive = value !== options[0];
  return (
    <TouchableOpacity
      onPress={next}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isActive ? colors.statusPoorText : colors.borderLight,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
      }}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 12, color: isActive ? colors.textInverse : colors.textSecondary, fontWeight: '500' }}>
        {label}: {value}
      </Text>
      <Ionicons name="chevron-down" size={11} color={isActive ? colors.textInverse : colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ClassTeamsScreen({ userRole }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
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
  const [hasGitlabToken, setHasGitlabToken] = useState<boolean>(true);

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

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    const taNames = new Map<string, string>();

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

    try {
      const currentUser = await getCurrentUser();
      const netid = currentUser?.netid;
      if (!netid) { setErrorMessage('Could not identify current user.'); setIsLoading(false); return; }

      const normalizedRole = normalizeRole(String(effectiveRole));
      let rawTeams: TeamApiResponse[] = normalizedRole === 'TA' ? await getTeams(netid) : await getTeams();
      if (normalizedRole === 'Student') {
        rawTeams = rawTeams.filter((team) => (team.students ?? []).some((s) => s.netid === netid));
        const token = await getGitLabTokenFromBackend().catch(() => null);
        setHasGitlabToken(!!token);
      }

      const [tas, htas] = await Promise.all([getUsersByRole('TA').catch(() => []), getUsersByRole('HTA').catch(() => [])]);
      for (const u of [...tas, ...htas]) { if (u.netid && u.name) taNames.set(u.netid, u.name); }

      const mappedTeams = rawTeams.map(mapTeam);
      setTeams(mappedTeams);

      const enrichedTeams = await Promise.all(mappedTeams.map(async (team) => {
        const netids = team.members.map(m => m.netid).filter(Boolean) as string[];
        if (netids.length === 0) return team;

        const [weeklyArrays, demoArrays] = await Promise.all([
          Promise.all(netids.map(n => getWeeklyPerformanceForStudent(n).catch(() => []))),
          Promise.all(netids.map(n => getDemoPerformanceForStudent(n).catch(() => []))),
        ]);
        const weekly = weeklyArrays.flat();
        const demos = demoArrays.flat();

        const demoScores: Team['demoScores'] = [1, 2, 3, 4].map(demoNum => {
          const recs = demos.filter(d => d.demoNumber === demoNum);
          if (recs.length === 0) return { code: null, teamwork: null };
          return { code: Math.round(recs.reduce((s, r) => s + r.codeScore, 0) / recs.length), teamwork: Math.round(recs.reduce((s, r) => s + r.teamworkScore, 0) / recs.length) };
        });

        let status: Team['status'] = team.status;
        if (weekly.length > 0) {
          const latestWeek = weekly.reduce((max, r) => r.weekStartDate > max ? r.weekStartDate : max, weekly[0].weekStartDate);
          const current = weekly.filter(r => r.weekStartDate === latestWeek);
          const avg = current.reduce((s, r) => s + (r.codeScore + r.teamworkScore) / 2, 0) / current.length;
          status = avg >= 1.5 ? 'Good' : avg >= 0.5 ? 'Moderate' : 'Poor';
        } else if (demos.length > 0) {
          const avg = demos.reduce((s, r) => s + (r.codeScore + r.teamworkScore) / 2, 0) / demos.length;
          status = avg >= 1.5 ? 'Good' : avg >= 0.5 ? 'Moderate' : 'Poor';
        }
        return { ...team, status, demoScores };
      }));
      setTeams(enrichedTeams);
    } catch {
      setErrorMessage('Failed to load teams from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveRole]);

  useFocusEffect(useCallback(() => { loadTeams(); }, [loadTeams]));

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading teams...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.criticalBorder }}>Unable to load teams</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 24, paddingTop: isMobile ? 12 : 24 }}>
        {/* Title row — stats sit on the same line for HTA/Instructor, stacked on mobile */}
        <View style={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 10,
        }}>
          <Text style={{ fontSize: isMobile ? 24 : 32, fontWeight: '800', color: colors.text }}>
            Class Teams
          </Text>

          {canFilterSemester && teams.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: 'Good',     value: teamStats.good,     icon: 'checkmark-circle-outline' as const, color: colors.statusGoodText,     bg: colors.statusGoodBg,     border: colors.statusGoodBar },
                { label: 'Moderate', value: teamStats.moderate, icon: 'remove-circle-outline' as const,    color: colors.statusModerateText, bg: colors.statusModerateBg, border: colors.statusModerateBar },
                { label: 'Poor',     value: teamStats.poor,     icon: 'alert-circle-outline' as const,     color: colors.statusPoorText,     bg: colors.statusPoorBg,     border: colors.statusPoorBar },
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

        {isStudentView && !hasGitlabToken && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warningText} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.warningText, lineHeight: 18 }}>
              Add your GitLab token in the <Text style={{ fontWeight: '700' }}>Profile</Text> tab to see your contribution stats and compliance data.
            </Text>
          </View>
        )}

        {!isStudentView && (
          <>
            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 }}>
              <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, fontSize: 14, color: colors.text }}
                placeholderTextColor={colors.textFaint}
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
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>Status</Text>
                  {React.createElement('select', {
                    value: statusFilter,
                    onChange: (e: any) => setStatusFilter(e.target.value as StatusFilter),
                    style: { height: 36, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingLeft: 8, paddingRight: 8, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg, colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer', width: 130 } as any,
                  }, (['All', 'Poor', 'Moderate', 'Good'] as StatusFilter[]).map(s =>
                    React.createElement('option', { key: s, value: s }, s)
                  ))}
                </View>

                {canFilterSection && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>Section</Text>
                    {React.createElement('select', {
                      value: sectionFilter,
                      onChange: (e: any) => setSectionFilter(e.target.value),
                      style: { height: 36, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingLeft: 8, paddingRight: 8, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg, colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer', width: 110 } as any,
                    }, sectionOptions.map(s =>
                      React.createElement('option', { key: s, value: s }, s)
                    ))}
                  </View>
                )}

                {canFilterSemester && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>Semester</Text>
                    {React.createElement('select', {
                      value: semesterFilter,
                      onChange: (e: any) => setSemesterFilter(e.target.value as SemesterFilter),
                      style: { height: 36, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingLeft: 8, paddingRight: 8, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg, colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer', width: 150 } as any,
                    }, (['All', 'Spring 2026', 'Fall 2025'] as SemesterFilter[]).map(s =>
                      React.createElement('option', { key: s, value: s }, s)
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Stats row */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
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
