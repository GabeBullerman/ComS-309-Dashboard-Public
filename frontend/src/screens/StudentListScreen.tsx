import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole, normalizeRole } from '../utils/auth';
import { getCurrentUser, getUsersByRole, deleteUser } from '../api/users';
import { getTeams, TeamApiResponse, removeStudentFromTeam } from '../api/teams';
import { StudentListCard } from '../components/StudentListCard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

interface StudentRow {
  id?: number;
  netid: string;
  studentFirstName: string;
  studentLastName: string;
  ta: string;
  section: number;
  teamId?: number;
  teamName: string;
}

interface Props {
  userRole: UserRole;
}

export default function ClassStudentsScreen({ userRole }: Props) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  const effectiveRole = normalizeRole(String(userRole));

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [taFilter, setTaFilter] = useState('All');
  const [sortAsc, setSortAsc] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [deletingStudent, setDeletingStudent] = useState<StudentRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadStudents = async () => {
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

        // Fetch teams — TAs only get their own teams
        const rawTeams: TeamApiResponse[] =
          normalizedRole === 'TA' ? await getTeams(netid) : await getTeams();

        // Build netid → full name map for TAs/HTAs
        const taNames = new Map<string, string>();
        const [tas, htas] = await Promise.all([
          getUsersByRole('TA').catch(() => []),
          getUsersByRole('HTA').catch(() => []),
        ]);
        for (const u of [...tas, ...htas]) {
          if (u.netid && u.name) taNames.set(u.netid, u.name);
        }

        // Flatten teams → individual student rows, deduplicating by netid
        const seen = new Set<string>();
        const rows: StudentRow[] = [];

        for (const team of rawTeams) {
          const taLabel =
            (team.taNetid && taNames.get(team.taNetid)) ||
            team.taNetid ||
            'Unassigned';

          for (const student of team.students ?? []) {
            if (!student.netid || seen.has(student.netid)) continue;
            seen.add(student.netid);

            const fullName = (student.name || student.netid || '').trim();
            const parts = fullName.split(/\s+/);
            const firstName = parts[0] ?? 'Unknown';
            const lastName = parts.slice(1).join(' ') || '';

            rows.push({
              id: student.id,
              netid: student.netid,
              studentFirstName: firstName,
              studentLastName: lastName,
              ta: taLabel,
              section: team.section ?? 0,
              teamId: team.id,
              teamName: team.name || 'Unnamed Team',
            });
          }
        }

        // Sort alphabetically by last name, then first name
        rows.sort((a, b) =>
          a.studentLastName.localeCompare(b.studentLastName) ||
          a.studentFirstName.localeCompare(b.studentFirstName)
        );

        setStudents(rows);
      } catch {
        setErrorMessage('Failed to load students from backend.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [effectiveRole]);

  const sectionOptions = useMemo(() => {
    const sections = Array.from(new Set(students.map((s) => s.section)))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
      .map(String);
    return ['All', ...sections];
  }, [students]);

  const taOptions = useMemo(() => {
    const tas = Array.from(new Set(students.map((s) => s.ta)))
      .filter(Boolean)
      .sort();
    return ['All', ...tas];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const list = students.filter((s) => {
      const fullName = `${s.studentFirstName} ${s.studentLastName}`.toLowerCase();
      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        s.netid.toLowerCase().includes(q) ||
        s.ta.toLowerCase().includes(q);
      const matchesSection = sectionFilter === 'All' || String(s.section) === sectionFilter;
      const matchesTa = taFilter === 'All' || s.ta === taFilter;
      return matchesSearch && matchesSection && matchesTa;
    });
    return sortAsc ? list : [...list].reverse();
  }, [students, searchQuery, sectionFilter, taFilter, sortAsc]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading students...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.criticalBorder }}>Unable to load students</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>{errorMessage}</Text>
      </View>
    );
  }

  const canFilterSection = effectiveRole === 'Instructor' || effectiveRole === 'HTA' || effectiveRole === 'TA';
  const canFilterTa = effectiveRole === 'Instructor' || effectiveRole === 'HTA';
  const canDeleteStudents = effectiveRole === 'Instructor' || effectiveRole === 'HTA';

  const handleDeleteStudent = async () => {
    if (!deletingStudent?.id) return;
    setIsDeleting(true);
    try {
      if (deletingStudent.teamId) {
        await removeStudentFromTeam(deletingStudent.teamId, deletingStudent.id).catch(() => {});
      }
      await deleteUser(deletingStudent.id);
      setStudents(prev => prev.filter(s => s.netid !== deletingStudent.netid));
      setDeletingStudent(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete student.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Delete confirmation modal */}
      <Modal
        visible={!!deletingStudent}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isDeleting) { setDeletingStudent(null); setDeleteConfirmText(''); } }}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderTopWidth: 4, borderTopColor: colors.criticalBorder }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Delete Student</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>
              You are about to permanently delete{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {deletingStudent?.studentFirstName} {deletingStudent?.studentLastName}
              </Text>
              {' '}and remove them from their team. This cannot be undone.
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12, marginTop: 8 }}>
              Type their NetID (<Text style={{ fontFamily: 'monospace', fontWeight: '700' }}>{deletingStudent?.netid}</Text>) to confirm:
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={deletingStudent?.netid ?? ''}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              style={{
                borderWidth: 1.5,
                borderColor: deleteConfirmText === deletingStudent?.netid ? colors.criticalBorder : colors.inputBorder,
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                fontSize: 14, color: colors.text, backgroundColor: colors.inputBg, marginBottom: 16,
                fontFamily: 'monospace',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setDeletingStudent(null); setDeleteConfirmText(''); }}
                disabled={isDeleting}
                style={{ flex: 1, backgroundColor: colors.borderLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteStudent}
                disabled={deleteConfirmText !== deletingStudent?.netid || isDeleting}
                style={{
                  flex: 1,
                  backgroundColor: deleteConfirmText === deletingStudent?.netid ? colors.criticalBorder : colors.border,
                  borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                }}
              >
                {isDeleting
                  ? <ActivityIndicator color={colors.textInverse} size="small" />
                  : <Text style={{ color: deleteConfirmText === deletingStudent?.netid ? colors.textInverse : colors.textFaint, fontWeight: '700' }}>Delete Student</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 24, paddingTop: isMobile ? 12 : 24 }}>
        {/* Title */}
        <Text style={{ fontSize: isMobile ? 24 : 32, fontWeight: '800', color: colors.text, marginBottom: 14 }}>
          All Students
        </Text>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg,
          borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder,
          paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
        }}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by name, Net ID, or TA..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 14, color: colors.text }}
            placeholderTextColor={colors.textFaint}
          />
        </View>

        {/* Section + TA filters — single row */}
        {canFilterSection && (
          Platform.OS !== 'web' ? (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: canFilterTa ? 6 : 0 }}>
                {sectionOptions.map((opt) => {
                  const active = sectionFilter === opt;
                  return (
                    <Text
                      key={opt}
                      onPress={() => setSectionFilter(opt)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                        backgroundColor: active ? colors.primary : colors.borderLight,
                        color: active ? colors.textInverse : colors.textSecondary,
                        fontSize: 12, fontWeight: '500', overflow: 'hidden',
                      }}
                    >
                      {opt === 'All' ? 'All Sections' : `Section ${opt}`}
                    </Text>
                  );
                })}
              </View>
              {canFilterTa && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {taOptions.map((opt) => {
                    const active = taFilter === opt;
                    return (
                      <Text
                        key={opt}
                        onPress={() => setTaFilter(opt)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                          backgroundColor: active ? colors.primary : colors.borderLight,
                          color: active ? colors.textInverse : colors.textSecondary,
                          fontSize: 12, fontWeight: '500', overflow: 'hidden',
                        }}
                      >
                        {opt === 'All' ? 'All TAs' : opt}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>Section</Text>
                {React.createElement('select', {
                  value: sectionFilter,
                  onChange: (e: any) => setSectionFilter(e.target.value),
                  style: { height: 36, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingLeft: 8, paddingRight: 8, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg, colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer', width: 130 } as any,
                }, sectionOptions.map(opt =>
                  React.createElement('option', { key: opt, value: opt }, opt === 'All' ? 'All Sections' : `Section ${opt}`)
                ))}
              </View>
              {canFilterTa && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500' }}>TA</Text>
                  {React.createElement('select', {
                    value: taFilter,
                    onChange: (e: any) => setTaFilter(e.target.value),
                    style: { height: 36, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingLeft: 8, paddingRight: 8, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg, colorScheme: isDark ? 'dark' : 'light', cursor: 'pointer', width: 180 } as any,
                  }, taOptions.map(opt =>
                    React.createElement('option', { key: opt, value: opt }, opt === 'All' ? 'All TAs' : opt)
                  ))}
                </View>
              )}
            </View>
          )
        )}

        {/* Count + Sort + Email button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              Showing {filteredStudents.length} of {students.length} student{students.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              onPress={() => setSortAsc(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.borderLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
            >
              <Ionicons name={sortAsc ? 'arrow-up' : 'arrow-down'} size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>
                {sortAsc ? 'A → Z' : 'Z → A'}
              </Text>
            </TouchableOpacity>
          </View>
          {filteredStudents.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                const to = filteredStudents.map(s => `${s.netid}@iastate.edu`).join(',');
                const url = Platform.OS === 'web'
                  ? `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}`
                  : `mailto:${to}`;
                if (Platform.OS === 'web') window.open(url, '_blank');
                else Linking.openURL(url);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
            >
              <Ionicons name="mail-outline" size={13} color={colors.textInverse} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textInverse }}>
                Email All ({filteredStudents.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Student list — single column, full width */}
        <FlatList
          style={{ flex: 1 }}
          data={filteredStudents}
          keyExtractor={(item) => item.netid}
          contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <StudentListCard
                  netid={item.netid}
                  studentFirstName={item.studentFirstName}
                  studentLastName={item.studentLastName}
                  ta={item.ta}
                  onPress={() => navigation.navigate('TeamMemberDetail', {
                    member: {
                      name: item.studentFirstName + ' ' + item.studentLastName,
                      netid: item.netid,
                      initials: item.studentFirstName.charAt(0) + item.studentLastName.charAt(0),
                      color: 'bg-[#F1BE48] text-gray-800',
                      photo: require('../Images/PersonIcon.png'),
                    },
                    teamId: item.teamId,
                    teamName: item.teamName,
                  })}
                />
              </View>
              {canDeleteStudents && (
                <TouchableOpacity
                  onPress={() => { setDeletingStudent(item); setDeleteConfirmText(''); }}
                  style={{ padding: 10, backgroundColor: colors.statusPoorBg, borderRadius: 10, borderWidth: 1, borderColor: colors.statusPoorBar }}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.criticalBorder} />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
}