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
import { Picker } from '@react-native-picker/picker';
import { UserRole, normalizeRole, getUserPermissions } from '../utils/auth';
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
        let rawTeams: TeamApiResponse[] =
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#C8102E" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>Loading students...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#DC2626' }}>Unable to load students</Text>
        <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center' }}>{errorMessage}</Text>
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
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>

      {/* Delete confirmation modal */}
      <Modal
        visible={!!deletingStudent}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!isDeleting) { setDeletingStudent(null); setDeleteConfirmText(''); } }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, borderTopWidth: 4, borderTopColor: '#dc2626' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 }}>Delete Student</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              You are about to permanently delete{' '}
              <Text style={{ fontWeight: '700', color: '#111827' }}>
                {deletingStudent?.studentFirstName} {deletingStudent?.studentLastName}
              </Text>
              {' '}and remove them from their team. This cannot be undone.
            </Text>
            <Text style={{ fontSize: 13, color: '#374151', marginBottom: 12, marginTop: 8 }}>
              Type their NetID (<Text style={{ fontFamily: 'monospace', fontWeight: '700' }}>{deletingStudent?.netid}</Text>) to confirm:
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={deletingStudent?.netid ?? ''}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              style={{
                borderWidth: 1.5,
                borderColor: deleteConfirmText === deletingStudent?.netid ? '#dc2626' : '#d1d5db',
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16,
                fontFamily: 'monospace',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => { setDeletingStudent(null); setDeleteConfirmText(''); }}
                disabled={isDeleting}
                style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteStudent}
                disabled={deleteConfirmText !== deletingStudent?.netid || isDeleting}
                style={{
                  flex: 1,
                  backgroundColor: deleteConfirmText === deletingStudent?.netid ? '#dc2626' : '#e5e7eb',
                  borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                }}
              >
                {isDeleting
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={{ color: deleteConfirmText === deletingStudent?.netid ? 'white' : '#9ca3af', fontWeight: '700' }}>Delete Student</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ flex: 1, paddingHorizontal: isMobile ? 12 : 24, paddingTop: isMobile ? 12 : 24 }}>
        {/* Title */}
        <Text style={{ fontSize: isMobile ? 24 : 32, fontWeight: '800', color: '#111827', marginBottom: 14 }}>
          All Students
        </Text>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
          borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
          paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
        }}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by name, Net ID, or TA..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 14, color: '#1e293b' }}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Section filter */}
        {canFilterSection && (
          Platform.OS !== 'web' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {sectionOptions.map((opt) => {
                const active = sectionFilter === opt;
                return (
                  <Text
                    key={opt}
                    onPress={() => setSectionFilter(opt)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                      backgroundColor: active ? '#b91c1c' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontSize: 12, fontWeight: '500', overflow: 'hidden',
                    }}
                  >
                    {opt === 'All' ? 'All Sections' : `Section ${opt}`}
                  </Text>
                );
              })}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Section</Text>
              <View style={{
                backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1,
                borderRadius: 8, overflow: 'hidden', width: 130,
              }}>
                <Picker
                  selectedValue={sectionFilter}
                  onValueChange={(v) => setSectionFilter(v)}
                  dropdownIconColor="#000"
                  style={{ height: 36, borderWidth: 0 }}
                >
                  {sectionOptions.map((opt) => (
                    <Picker.Item
                      key={opt}
                      label={opt === 'All' ? 'All Sections' : `Section ${opt}`}
                      value={opt}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )
        )}

        {/* TA filter (HTA/Instructor only) */}
        {canFilterTa && (
          Platform.OS !== 'web' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {taOptions.map((opt) => {
                const active = taFilter === opt;
                return (
                  <Text
                    key={opt}
                    onPress={() => setTaFilter(opt)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                      backgroundColor: active ? '#b91c1c' : '#f3f4f6',
                      color: active ? '#fff' : '#374151',
                      fontSize: 12, fontWeight: '500', overflow: 'hidden',
                    }}
                  >
                    {opt === 'All' ? 'All TAs' : opt}
                  </Text>
                );
              })}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>TA</Text>
              <View style={{
                backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1,
                borderRadius: 8, overflow: 'hidden', width: 180,
              }}>
                <Picker
                  selectedValue={taFilter}
                  onValueChange={(v) => setTaFilter(v)}
                  dropdownIconColor="#000"
                  style={{ height: 36, borderWidth: 0 }}
                >
                  {taOptions.map((opt) => (
                    <Picker.Item key={opt} label={opt === 'All' ? 'All TAs' : opt} value={opt} />
                  ))}
                </Picker>
              </View>
            </View>
          )
        )}

        {/* Count + Sort + Email button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>
              Showing {filteredStudents.length} of {students.length} student{students.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              onPress={() => setSortAsc(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
            >
              <Ionicons name={sortAsc ? 'arrow-up' : 'arrow-down'} size={12} color="#6B7280" />
              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>
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
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#b91c1c', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
            >
              <Ionicons name="mail-outline" size={13} color="white" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>
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
                  style={{ padding: 10, backgroundColor: '#fef2f2', borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5' }}
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
}