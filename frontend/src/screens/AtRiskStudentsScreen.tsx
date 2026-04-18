import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, ActivityIndicator, useWindowDimensions, TouchableOpacity, Platform, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { UserRole, normalizeRole } from '../utils/auth';
import { getCurrentUser, getUsersByRole } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { getAttendanceForStudent, AttendanceRecord } from '../api/attendance';
import { getDemoPerformanceForStudent, DemoPerformanceRecord } from '../api/demoPerformance';
import { getWeeklyPerformanceForStudent, WeeklyPerformanceRecord } from '../api/weeklyPerformance';
import { AtRiskStudentCard, AtRiskFlag } from '@/components/AtRiskStudentCard';
import { getAllAtRiskOverrides, AtRiskOverride } from '../api/atRiskOverrides';

// ── At-Risk Algorithm ─────────────────────────────────────────────────────────

function computeAtRiskFlags(
  attendance: AttendanceRecord[],
  demos: DemoPerformanceRecord[],
  weekly: WeeklyPerformanceRecord[],
): AtRiskFlag[] {
  const flags: AtRiskFlag[] = [];

  const lectureAbsences = attendance.filter(r => r.type === 'LECTURE' && r.status === 'ABSENT').length;
  const lectureLates    = attendance.filter(r => r.type === 'LECTURE' && r.status === 'LATE').length;

  if (lectureAbsences >= 5) {
    flags.push({ reason: `${lectureAbsences} lecture absences — at failing threshold`, severity: 'critical', category: 'attendance' });
  } else if (lectureAbsences >= 3) {
    flags.push({ reason: `${lectureAbsences} lecture absences — approaching 5-absence limit`, severity: 'warning', category: 'attendance' });
  }

  if (lectureLates >= 3) {
    flags.push({ reason: `${lectureLates} late arrivals to lecture (habitual)`, severity: 'warning', category: 'attendance' });
  }

  const poorDemos = demos.filter(d => d.codeScore === 0 || d.teamworkScore === 0).length;
  if (poorDemos >= 2) {
    flags.push({
      reason: `Poor performance in ${poorDemos} of ${demos.length} demo${demos.length !== 1 ? 's' : ''}`,
      severity: 'warning',
      category: 'performance',
    });
  }

  const poorWeeks = weekly.filter(w => w.codeScore === 0 && w.teamworkScore === 0).length;
  if (poorWeeks >= 3) {
    flags.push({ reason: `Poor weekly performance for ${poorWeeks} weeks`, severity: 'warning', category: 'performance' });
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
  flags: AtRiskFlag[];
}

interface Props {
  userRole: UserRole;
}

const copyViaDom = (text: string) => {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

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
  const [currentUserNetid, setCurrentUserNetid] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [selectedNetids, setSelectedNetids] = useState<Set<string>>(new Set());
  const [bccCopied, setBccCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const currentUser = await getCurrentUser();
        const netid = currentUser?.netid;
        if (!netid) { setErrorMessage('Could not identify current user.'); return; }
        setCurrentUserNetid(netid);
        if (currentUser?.name) setCurrentUserName(currentUser.name);

        let rawTeams: TeamApiResponse[] = [];
        if (effectiveRole === 'TA') {
          rawTeams = await getTeams(netid);
        } else {
          rawTeams = await getTeams();
        }

        const [taUsers, htaUsers] = await Promise.all([
          getUsersByRole('TA').catch(() => []),
          getUsersByRole('HTA').catch(() => []),
        ]);
        const taNameMap = new Map<string, string>();
        for (const u of [...taUsers, ...htaUsers]) {
          if (u.netid) taNameMap.set(u.netid, u.name?.trim() || u.netid);
        }

        const studentMap = new Map<string, { name: string; teamName: string; teamId: number; ta: string }>();
        for (const team of rawTeams) {
          for (const student of team.students ?? []) {
            if (!student.netid || studentMap.has(student.netid)) continue;
            const taNetid = team.taNetid || '';
            studentMap.set(student.netid, {
              name: student.name || student.netid,
              teamName: team.name || 'Unnamed Team',
              teamId: Number(team.id),
              ta: taNameMap.get(taNetid) || taNetid || 'Unassigned',
            });
          }
        }

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

        const overrideMap = new Map<string, AtRiskOverride[]>();
        for (const o of overrides) {
          if (!overrideMap.has(o.studentNetid)) overrideMap.set(o.studentNetid, []);
          overrideMap.get(o.studentNetid)!.push(o);
        }

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
            category: 'performance' as const,
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
      s.ta.toLowerCase().includes(q)
    );
  }, [atRiskStudents, searchQuery]);

  const criticalCount = atRiskStudents.filter(s => s.flags.some(f => f.severity === 'critical')).length;
  const warningCount  = atRiskStudents.length - criticalCount;

  const toggleSelect = (netid: string) => {
    setSelectedNetids(prev => {
      const next = new Set(prev);
      if (next.has(netid)) next.delete(netid); else next.add(netid);
      return next;
    });
  };

  const openSelectedEmail = () => {
    const to = currentUserNetid ? `${currentUserNetid}@iastate.edu` : '';
    const senderName = currentUserName || 'Your name';

    const selectedStudents = atRiskStudents.filter(s => selectedNetids.has(s.netid));
    const categories = new Set(selectedStudents.flatMap(s => s.flags.map(f => f.category)));
    const attendanceOnly = categories.has('attendance') && !categories.has('performance');
    const performanceOnly = categories.has('performance') && !categories.has('attendance');

    const subject = attendanceOnly
      ? 'COM S 309 — Attendance Check-In'
      : performanceOnly
      ? 'COM S 309 — Performance Check-In'
      : 'COM S 309 — Course Check-In';

    const body = attendanceOnly
      ? `Hello,\n\nI wanted to reach out because your attendance in COM S 309 has become a concern. You are approaching or have already reached the absence threshold that can negatively impact your grade — students who miss 5 or more lectures are at risk of failing.\n\nPlease prioritize attending all remaining sessions. If something is preventing you from coming to class, I'd encourage you to reach out so we can figure out next steps together.\n\nBest,\n${senderName}`
      : performanceOnly
      ? `Hello,\n\nI wanted to reach out because your recent performance in COM S 309 — including demo evaluations and/or weekly progress check-ins — has given me some concern. Consistent poor scores across multiple checkpoints can have a significant impact on your final grade.\n\nI'd like to find some time to discuss how things are going and see how we can help you get back on track. Please reply to this email or stop by office hours.\n\nBest,\n${senderName}`
      : `Hello,\n\nI wanted to reach out regarding your standing in COM S 309. I've noticed some concerns — both with attendance and recent performance — and I'd like to find a time to discuss.\n\nPlease reply to this email or stop by office hours.\n\nBest,\n${senderName}`;

    if (Platform.OS === 'web') {
      // URLSearchParams encodes spaces as + but Outlook needs %20 — replace after building
      const url = new URL('https://outlook.office.com/mail/deeplink/compose');
      url.searchParams.set('to', to);
      url.searchParams.set('subject', subject);
      url.searchParams.set('body', body);
      window.open(url.toString().replace(/\+/g, '%20'), '_blank');
    } else {
      const bccList = [...selectedNetids].map(n => `${n}@iastate.edu`).join(',');
      Linking.openURL(`mailto:${to}?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  };

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
      <View style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 24, paddingTop: isMobile ? 12 : 24, paddingBottom: selectedNetids.size > 0 ? 90 : 0 }}>

        <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: '#111827', marginBottom: 10 }}>
          At-Risk Students
        </Text>

        {/* Summary badges */}
        {atRiskStudents.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
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

        {/* Selection helpers */}
        {atRiskStudents.length > 0 && (
          <View style={{ gap: 6, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>By severity:</Text>
              {criticalCount > 0 && (
                <TouchableOpacity
                  onPress={() => setSelectedNetids(new Set(atRiskStudents.filter(s => s.flags.some(f => f.severity === 'critical')).map(s => s.netid)))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' }}
                >
                  <Ionicons name="alert-circle" size={12} color="#b91c1c" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#b91c1c' }}>All Critical</Text>
                </TouchableOpacity>
              )}
              {warningCount > 0 && (
                <TouchableOpacity
                  onPress={() => setSelectedNetids(new Set(atRiskStudents.filter(s => !s.flags.some(f => f.severity === 'critical')).map(s => s.netid)))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fefce8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' }}
                >
                  <Ionicons name="warning" size={12} color="#d97706" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e' }}>All Warning</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setSelectedNetids(new Set(filtered.map(s => s.netid)))}
                style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>All</Text>
              </TouchableOpacity>
              {selectedNetids.size > 0 && (
                <TouchableOpacity onPress={() => setSelectedNetids(new Set())}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>By type:</Text>
              <TouchableOpacity
                onPress={() => setSelectedNetids(new Set(atRiskStudents.filter(s => s.flags.some(f => f.category === 'attendance')).map(s => s.netid)))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }}
              >
                <Ionicons name="calendar-outline" size={12} color="#2563eb" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1d4ed8' }}>Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedNetids(new Set(atRiskStudents.filter(s => s.flags.some(f => f.category === 'performance')).map(s => s.netid)))}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#ddd6fe' }}
              >
                <Ionicons name="bar-chart-outline" size={12} color="#7c3aed" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6d28d9' }}>Performance</Text>
              </TouchableOpacity>
            </View>
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
                <View style={{ flex: 1, position: 'relative' }}>
                  {/* Selection border overlay */}
                  {selectedNetids.has(item.netid) && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, borderWidth: 2.5, borderColor: '#2563eb', zIndex: 2 }} pointerEvents="none" />
                  )}
                  {/* Selection checkbox */}
                  <TouchableOpacity
                    onPress={() => toggleSelect(item.netid)}
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 3,
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: selectedNetids.has(item.netid) ? '#2563eb' : 'rgba(255,255,255,0.95)',
                      borderWidth: 2, borderColor: selectedNetids.has(item.netid) ? '#2563eb' : '#d1d5db',
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
                    }}
                  >
                    {selectedNetids.has(item.netid) && <Ionicons name="checkmark" size={12} color="white" />}
                  </TouchableOpacity>
                  <AtRiskStudentCard
                    netid={item.netid}
                    studentName={item.studentName}
                    teamName={item.teamName}
                    ta={item.ta}
                    flags={item.flags}
                    onPress={() => toggleSelect(item.netid)}
                  />
                </View>
              )
            }
          />
        )}
      </View>

      {/* Sticky email panel */}
      {selectedNetids.size > 0 && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb',
          padding: 14, paddingBottom: 20,
          shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
        }}>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            {selectedNetids.size} student{selectedNetids.size !== 1 ? 's' : ''} selected
            {(() => {
              const sel = atRiskStudents.filter(s => selectedNetids.has(s.netid));
              const cats = new Set(sel.flatMap(s => s.flags.map(f => f.category)));
              if (cats.has('attendance') && !cats.has('performance')) return ' · attendance email';
              if (cats.has('performance') && !cats.has('attendance')) return ' · performance email';
              return ' · general email';
            })()} — open email, then paste BCC list below
          </Text>
          {/* Copyable BCC list */}
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>BCC</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              <Text selectable style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                {[...selectedNetids].map(n => `${n}@iastate.edu`).join('; ')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const list = [...selectedNetids].map(n => `${n}@iastate.edu`).join('; ');
                  if (Platform.OS === 'web') {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(list).catch(() => copyViaDom(list));
                    } else {
                      copyViaDom(list);
                    }
                  }
                  setBccCopied(true);
                  setTimeout(() => setBccCopied(false), 2000);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: bccCopied ? '#dcfce7' : '#e5e7eb' }}
              >
                <Ionicons name={bccCopied ? 'checkmark' : 'clipboard-outline'} size={12} color={bccCopied ? '#16a34a' : '#6b7280'} />
                <Text style={{ fontSize: 11, color: bccCopied ? '#16a34a' : '#6b7280', fontWeight: '500' }}>{bccCopied ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedNetids(new Set())}
              style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openSelectedEmail}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8, backgroundColor: '#b91c1c' }}
            >
              <Ionicons name="mail-outline" size={14} color="white" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: 'white' }}>
                Open Email Client ({selectedNetids.size})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
