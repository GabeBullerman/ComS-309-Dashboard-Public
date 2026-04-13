import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { UserRole, normalizeRole } from '../utils/auth';
import { getCurrentUser } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { getAttendanceForStudent, AttendanceRecord } from '../api/attendance';
import { getDemoPerformanceForStudent, DemoPerformanceRecord } from '../api/demoPerformance';
import { getWeeklyPerformanceForStudent, WeeklyPerformanceRecord } from '../api/weeklyPerformance';
import { AtRiskStudentCard, AtRiskFlag } from '@/components/AtRiskStudentCard';
import { getAllAtRiskOverrides, AtRiskOverride } from '../api/atRiskOverrides';

// ── At-Risk Algorithm ─────────────────────────────────────────────────────────
// Based on professor Mitra's guidelines:
//  - 5 lecture absences = failing threshold (critical at 5+, warning at 3-4)
//  - Habitual lateness (3+ lates to lecture) = warning
//  - Poor demo performance on 2+ of 4 demos = warning
//  - Poor weekly performance for 3+ weeks = warning

function computeAtRiskFlags(
  attendance: AttendanceRecord[],
  demos: DemoPerformanceRecord[],
  weekly: WeeklyPerformanceRecord[],
): AtRiskFlag[] {
  const flags: AtRiskFlag[] = [];

  // Lecture attendance only
  const lectureAbsences = attendance.filter(r => r.type === 'LECTURE' && r.status === 'ABSENT').length;
  const lectureLates    = attendance.filter(r => r.type === 'LECTURE' && r.status === 'LATE').length;

  if (lectureAbsences >= 5) {
    flags.push({ reason: `${lectureAbsences} lecture absences — at failing threshold`, severity: 'critical' });
  } else if (lectureAbsences >= 3) {
    flags.push({ reason: `${lectureAbsences} lecture absences — approaching 5-absence limit`, severity: 'warning' });
  }

  if (lectureLates >= 3) {
    flags.push({ reason: `${lectureLates} late arrivals to lecture (habitual)`, severity: 'warning' });
  }

  // Demo performance: poor = score 0 on code or teamwork
  const poorDemos = demos.filter(d => d.codeScore === 0 || d.teamworkScore === 0).length;
  if (poorDemos >= 2) {
    flags.push({
      reason: `Poor performance in ${poorDemos} of ${demos.length} demo${demos.length !== 1 ? 's' : ''}`,
      severity: 'warning',
    });
  }

  // Weekly performance: 3+ weeks with poor scores on both code AND teamwork
  const poorWeeks = weekly.filter(w => w.codeScore === 0 && w.teamworkScore === 0).length;
  if (poorWeeks >= 3) {
    flags.push({ reason: `Poor weekly performance for ${poorWeeks} weeks`, severity: 'warning' });
  }

  return flags;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AtRiskStudent {
  netid: string;
  studentName: string;
  teamName: string;
  teamId: number;
  ta: string;
  section: number;
  flags: AtRiskFlag[];
}

interface Props {
  userRole: UserRole;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AtRiskStudentsScreen({ userRole }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const numColumns = width < 640 ? 1 : width < 960 ? 2 : width < 1280 ? 3 : 4;
  const isMobile = width < 640;
  const effectiveRole = normalizeRole(String(userRole));

  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const currentUser = await getCurrentUser();
        const netid = currentUser?.netid;
        if (!netid) { setErrorMessage('Could not identify current user.'); return; }

        let rawTeams: TeamApiResponse[] = [];
        if (effectiveRole === 'TA') {
          rawTeams = await getTeams(netid);
        } else {
          rawTeams = await getTeams();
        }

        // Collect all unique students across teams
        const studentMap = new Map<string, { name: string; teamName: string; teamId: number; ta: string; section: number }>();
        for (const team of rawTeams) {
          for (const student of team.students ?? []) {
            if (!student.netid || studentMap.has(student.netid)) continue;
            studentMap.set(student.netid, {
              name: student.name || student.netid,
              teamName: team.name || 'Unnamed Team',
              teamId: Number(team.id),
              ta: team.taNetid || 'Unassigned',
              section: team.section ?? 0,
            });
          }
        }

        // Fetch performance data + manual overrides in parallel
        const [results, overrides] = await Promise.all([
          Promise.all(
            [...studentMap.entries()].map(async ([studentNetid, info]) => {
              const [attendance, demos, weekly] = await Promise.all([
                getAttendanceForStudent(studentNetid).catch((): AttendanceRecord[] => []),
                getDemoPerformanceForStudent(studentNetid).catch((): DemoPerformanceRecord[] => []),
                getWeeklyPerformanceForStudent(studentNetid).catch((): WeeklyPerformanceRecord[] => []),
              ]);
              const flags = computeAtRiskFlags(attendance, demos, weekly);
              return { studentNetid, info, flags };
            })
          ),
          getAllAtRiskOverrides().catch((): AtRiskOverride[] => []),
        ]);

        // Build override map: netid → manual flag
        const overrideMap = new Map<string, AtRiskOverride[]>();
        for (const o of overrides) {
          if (!overrideMap.has(o.studentNetid)) overrideMap.set(o.studentNetid, []);
          overrideMap.get(o.studentNetid)!.push(o);
        }

        // Merge algorithm flags with manual overrides
        const allNetids = new Set([
          ...results.map(r => r.studentNetid),
          ...overrideMap.keys(),
        ]);

        const flagged: AtRiskStudent[] = [];
        for (const netid of allNetids) {
          const result = results.find(r => r.studentNetid === netid);
          const manualOverrides = overrideMap.get(netid) ?? [];
          const algoFlags = result?.flags ?? [];
          const manualFlags: AtRiskFlag[] = manualOverrides.map(o => ({
            reason: `Manually flagged: ${o.reason}`,
            severity: 'warning' as const,
          }));
          const allFlags = [...algoFlags, ...manualFlags];
          if (allFlags.length === 0) continue;

          const info = result?.info ?? studentMap.get(netid);
          if (!info) continue;

          flagged.push({
            netid,
            studentName: info.name,
            teamName: info.teamName,
            teamId: info.teamId,
            ta: info.ta,
            section: info.section,
            flags: allFlags,
          });
        }

        flagged.sort((a, b) => {
          const aHasCritical = a.flags.some(f => f.severity === 'critical');
          const bHasCritical = b.flags.some(f => f.severity === 'critical');
          if (aHasCritical !== bHasCritical) return aHasCritical ? -1 : 1;
          return a.studentName.localeCompare(b.studentName);
        });

        setAtRiskStudents(flagged);
      } catch {
        setErrorMessage('Failed to load student data.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [effectiveRole]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return atRiskStudents;
    const q = searchQuery.toLowerCase();
    return atRiskStudents.filter(s =>
      s.studentName.toLowerCase().includes(q) ||
      s.netid.toLowerCase().includes(q) ||
      s.teamName.toLowerCase().includes(q) ||
      s.ta.toLowerCase().includes(q) ||
      s.section.toString().includes(q)
    );
  }, [atRiskStudents, searchQuery]);

  const criticalCount = atRiskStudents.filter(s => s.flags.some(f => f.severity === 'critical')).length;
  const warningCount  = atRiskStudents.length - criticalCount;

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#C8102E" />
        <Text style={{ color: '#6b7280', marginTop: 12 }}>Analyzing student data...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#dc2626' }}>Unable to load students</Text>
        <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>{errorMessage}</Text>
      </View>
    );
  }

  const remainder = numColumns > 1 ? filtered.length % numColumns : 0;
  const padded: (AtRiskStudent | null)[] = remainder === 0
    ? filtered
    : [...filtered, ...Array(numColumns - remainder).fill(null)];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 24, paddingTop: isMobile ? 12 : 24 }}>

        <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: '#111827', marginBottom: 10 }}>
          At-Risk Students
        </Text>

        {/* Summary badges */}
        {atRiskStudents.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {criticalCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Ionicons name="alert-circle" size={13} color="#dc2626" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#b91c1c' }}>{criticalCount} Critical</Text>
              </View>
            )}
            {warningCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fefce8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Ionicons name="warning" size={13} color="#d97706" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>{warningCount} Warning</Text>
              </View>
            )}
          </View>
        )}

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12 }}>
          <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by student, team, TA, or section..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 14, color: '#1e293b' }}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Empty state */}
        {filtered.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#86efac" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 }}>
              {atRiskStudents.length === 0 ? 'No at-risk students' : 'No results match your search'}
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              {atRiskStudents.length === 0 ? 'All students are within acceptable thresholds.' : 'Try a different search term.'}
            </Text>
          </View>
        )}

        {/* Student list */}
        {filtered.length > 0 && (
          <FlatList
            style={{ flex: 1 }}
            key={numColumns}
            data={padded}
            keyExtractor={(_, i) => i.toString()}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 8, alignItems: 'stretch' } : undefined}
            contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) =>
              item === null ? (
                <View style={{ flex: 1 }} />
              ) : (
                <View style={{ flex: 1 }}>
                  <AtRiskStudentCard
                    netid={item.netid}
                    studentName={item.studentName}
                    teamName={item.teamName}
                    ta={item.ta}
                    section={item.section}
                    flags={item.flags}
                    onPress={() => navigation.navigate('TeamMemberDetail', {
                      member: {
                        name: item.studentName,
                        netid: item.netid,
                        initials: item.studentName.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join(''),
                        color: 'bg-[#F1BE48] text-gray-800',
                        photo: require('../Images/PersonIcon.png'),
                      },
                      teamId: item.teamId,
                      teamName: item.teamName,
                    })}
                  />
                </View>
              )
            }
          />
        )}
      </View>
    </View>
  );
}
