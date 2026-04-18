import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSummary, normalizeRole, UserRole } from '../utils/auth';
import { getUsersByRole, createUser, updateUser, deleteUser } from '../api/users';

type StaffRole = 'TA' | 'HTA' | 'Instructor';

const ROLE_LABEL: Record<StaffRole, string> = { TA: 'TA', HTA: 'Head TA', Instructor: 'Instructor' };
const ROLE_BADGE_BG: Record<StaffRole, string> = { TA: '#dbeafe', HTA: '#fef9c3', Instructor: '#f3e8ff' };
const ROLE_BADGE_TEXT: Record<StaffRole, string> = { TA: '#1e40af', HTA: '#92400e', Instructor: '#6b21a8' };

interface Props { userRole: UserRole; }

export default function StaffManagerScreen({ userRole }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isInstructor = userRole === 'Instructor';
  const isHTA = userRole === 'HTA';

  const [staff, setStaff] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'role'>('role');
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCsvInfo, setShowCsvInfo] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: string[]; blocked?: string[] } | null>(null);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    netid: '',
    name: '',
    password: '',
    role: 'TA' as StaffRole,
  });

  const availableRoles: StaffRole[] = isInstructor ? ['TA', 'HTA', 'Instructor'] : ['TA'];

  const loadStaff = async () => {
    setLoading(true);
    try {
      const fetches: Promise<UserSummary[]>[] = [
        getUsersByRole('TA'),
        getUsersByRole('HTA'),
      ];
      if (isInstructor) fetches.push(getUsersByRole('Instructor').catch(() => []));
      const results = await Promise.all(fetches);
      const combined = results.flat().map((u) => ({ ...u, role: normalizeRole(String(u.role)) }));
      setStaff(combined);
    } catch {
      Alert.alert('Error', 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = q
      ? staff.filter((m) => m.name?.toLowerCase().includes(q) || m.netid?.toLowerCase().includes(q))
      : [...staff];
    if (sortBy === 'name') {
      result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    } else {
      const ORDER: Record<string, number> = { Instructor: 0, HTA: 1, TA: 2 };
      result.sort((a, b) => {
        const ra = normalizeRole(String(a.role));
        const rb = normalizeRole(String(b.role));
        const diff = (ORDER[ra] ?? 3) - (ORDER[rb] ?? 3);
        return diff !== 0 ? diff : (a.name ?? '').localeCompare(b.name ?? '');
      });
    }
    return result;
  }, [staff, search, sortBy]);

  const confirm = (message: string): Promise<boolean> => {
    if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
    return new Promise((resolve) =>
      Alert.alert('Confirm', message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', onPress: () => resolve(true) },
      ])
    );
  };

  const isAdminRole = (role: string) => role === 'HTA' || role === 'Instructor';

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file: File = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.trim().split('\n').filter((l) => l.trim());
      const dataLines = lines[0]?.toLowerCase().includes('netid') ? lines.slice(1) : lines;

      const parsed = dataLines.map((line) => {
        const cols = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        const [netid, name, password, roleCol] = cols;
        const role: StaffRole =
          roleCol?.toUpperCase() === 'INSTRUCTOR' ? 'Instructor'
          : roleCol?.toUpperCase() === 'HTA' ? 'HTA'
          : 'TA';
        return { netid, name, password, role, line };
      });

      if (isHTA) {
        const blocked = parsed.filter((r) => r.role === 'HTA' || r.role === 'Instructor');
        const allowed = parsed.filter((r) => r.role === 'TA');
        const results = await Promise.allSettled(
          allowed.map(async ({ netid, name, password }) => {
            if (!netid || !name) throw new Error(`Bad row`);
            await createUser({ netid, name, password: password || 'changeme', role: ['TA'] });
            return netid;
          })
        );
        const success = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results
          .map((r, i) => r.status === 'rejected' ? allowed[i].line : null)
          .filter(Boolean) as string[];
        setImportResult({ success, failed, blocked: blocked.map((r) => `${r.netid} (${ROLE_LABEL[r.role]})`) });
        await loadStaff();
        return;
      }

      // Instructor: only confirm for Instructor-level rows
      const instructorRows = parsed.filter((r) => r.role === 'Instructor');
      if (instructorRows.length > 0) {
        const names = instructorRows.map((r) => `${r.netid}`).join(', ');
        const ok = await confirm(
          `This CSV contains ${instructorRows.length} Instructor account${instructorRows.length > 1 ? 's' : ''}: ${names}.\n\nInstructor accounts have full admin permissions. Are you sure you want to add them?`
        );
        if (!ok) return;
      }

      const results = await Promise.allSettled(
        parsed.map(async ({ netid, name, password, role }) => {
          if (!netid || !name) throw new Error(`Bad row`);
          await createUser({ netid, name, password: password || 'changeme', role: [role] });
          return netid;
        })
      );
      const success = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results
        .map((r, i) => r.status === 'rejected' ? parsed[i].line : null)
        .filter(Boolean) as string[];
      setImportResult({ success, failed });
      await loadStaff();
    };
    input.click();
  };

  const handleCreate = async () => {
    if (!inviteForm.netid.trim() || !inviteForm.name.trim() || !inviteForm.password.trim()) {
      Alert.alert('Error', 'NetID, name, and password are required.');
      return;
    }
    if (inviteForm.role === 'Instructor') {
      const ok = await confirm(
        `Are you sure you want to add ${inviteForm.name.trim()} as Instructor? This grants them full admin permissions.`
      );
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      await createUser({
        netid: inviteForm.netid.trim(),
        name: inviteForm.name.trim(),
        password: inviteForm.password.trim(),
        role: [inviteForm.role],
      });
      setInviteForm({ netid: '', name: '', password: '', role: 'TA' });
      setShowInviteForm(false);
      await loadStaff();
    } catch (e: any) {
      const msg = e?.response?.status === 409
        ? 'A user with that NetID already exists.'
        : 'Failed to create user.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async (member: UserSummary, newRole: StaffRole) => {
    if (!member.id) return;
    const currentRole = normalizeRole(String(member.role)) as StaffRole;
    if (currentRole === newRole) { setExpandedId(null); return; }
    if (newRole === 'Instructor') {
      const ok = await confirm(
        `Promote ${member.name ?? member.netid} to Instructor? This grants them full admin permissions.`
      );
      if (!ok) return;
    } else {
      const ok = await confirm(`Change ${member.name ?? member.netid} to ${ROLE_LABEL[newRole]}?`);
      if (!ok) return;
    }
    try {
      await updateUser(member.id!, { role: [newRole] });
      setStaff((prev) => prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m));
      setExpandedId(null);
    } catch {
      Alert.alert('Error', 'Failed to update role.');
    }
  };

  const handleRemove = async (member: UserSummary) => {
    if (!member.id) return;
    const ok = await confirm(`Remove ${member.name ?? member.netid} from the system? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteUser(member.id!);
      setStaff((prev) => prev.filter((m) => m.id !== member.id));
      setExpandedId(null);
    } catch {
      Alert.alert('Error', 'Failed to remove user.');
    }
  };

  const renderItem = ({ item }: { item: UserSummary }) => {
    const role = normalizeRole(String(item.role)) as StaffRole;
    const cardKey = item.id ?? item.netid!;
    const isExpanded = expandedId === cardKey;
    const canExpand = isInstructor;

    return (
      <TouchableOpacity
        activeOpacity={canExpand ? 0.85 : 1}
        onPress={() => canExpand && setExpandedId(isExpanded ? null : cardKey)}
        style={{
          backgroundColor: '#fff',
          borderRadius: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: '#1f2937',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.name ?? '—'}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>{item.netid}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: ROLE_BADGE_BG[role] ?? '#e5e7eb' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ROLE_BADGE_TEXT[role] ?? '#374151' }}>
                {ROLE_LABEL[role] ?? role}
              </Text>
            </View>
            {canExpand && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />}
          </View>
        </View>

        {isExpanded && isInstructor && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb', paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 2 }}>Change role</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['TA', 'HTA', 'Instructor'] as StaffRole[]).map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => handleChangeRole(item, r)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8,
                      backgroundColor: active ? ROLE_BADGE_BG[r] : '#e5e7eb',
                      borderWidth: 1,
                      borderColor: active ? ROLE_BADGE_TEXT[r] : '#d1d5db',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? ROLE_BADGE_TEXT[r] : '#374151' }}>
                      {ROLE_LABEL[r]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => handleRemove(item)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', marginTop: 2 }}
            >
              <Ionicons name="trash-outline" size={15} color="#dc2626" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#dc2626' }}>Remove from system</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const pad = isMobile ? 12 : 20;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ padding: pad }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Text style={{ fontSize: isMobile ? 22 : 26, fontWeight: 'bold', color: '#111827' }}>Staff Management</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {(isInstructor || isHTA) && (
            <>
              <TouchableOpacity onPress={() => setShowCsvInfo(!showCsvInfo)} style={{ padding: 6 }}>
                <Ionicons name="information-circle-outline" size={22} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportCSV}
                style={{ backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="cloud-upload-outline" size={15} color="white" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Import CSV</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={() => setShowInviteForm(!showInviteForm)}
            style={{ backgroundColor: '#b91c1c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="person-add" size={15} color="white" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              {showInviteForm ? 'Cancel' : 'Add Staff'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CSV format info */}
      {showCsvInfo && (isInstructor || isHTA) && (
        <View style={{ backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 6 }}>CSV Import Format</Text>
          <Text style={{ fontSize: 12, color: '#0c4a6e', fontFamily: 'monospace', marginBottom: 4 }}>netid,name,password,role</Text>
          <Text style={{ fontSize: 12, color: '#0c4a6e', fontFamily: 'monospace', marginBottom: 4 }}>jsmith,Jane Smith,temp123,TA</Text>
          {isInstructor && (
            <>
              <Text style={{ fontSize: 12, color: '#0c4a6e', fontFamily: 'monospace', marginBottom: 4 }}>bjones,Bob Jones,temp123,HTA</Text>
              <Text style={{ fontSize: 12, color: '#0c4a6e', fontFamily: 'monospace', marginBottom: 8 }}>cprof,Chris Prof,temp123,Instructor</Text>
            </>
          )}
          <Text style={{ fontSize: 11, color: '#0369a1' }}>• Header row is optional (auto-detected)</Text>
          <Text style={{ fontSize: 11, color: '#0369a1' }}>• Role: TA{isInstructor ? ', HTA, or Instructor' : ' (only TA rows will be created as HTA)'} (defaults to TA)</Text>
          {isHTA && <Text style={{ fontSize: 11, color: '#c2410c' }}>• HTA and Instructor rows will be skipped — contact an Instructor to add admin accounts</Text>}
          {isInstructor && <Text style={{ fontSize: 11, color: '#0369a1' }}>• Instructor rows require confirmation before adding</Text>}
          <Text style={{ fontSize: 11, color: '#0369a1' }}>• Password defaults to "changeme" if blank</Text>
          <Text style={{ fontSize: 11, color: '#0369a1' }}>• Existing NetIDs are skipped (no overwrite)</Text>
        </View>
      )}

      {/* Import result */}
      {importResult && (
        <>
          <View style={{ backgroundColor: importResult.failed.length === 0 ? '#f0fdf4' : '#fef9c3', borderWidth: 1, borderColor: importResult.failed.length === 0 ? '#86efac' : '#fde047', borderRadius: 10, padding: 12, marginBottom: importResult.blocked?.length ? 6 : 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: importResult.failed.length === 0 ? '#166534' : '#92400e' }}>
              {importResult.success} imported successfully{importResult.failed.length > 0 ? `, ${importResult.failed.length} failed` : ''}
            </Text>
            {importResult.failed.map((row, i) => (
              <Text key={`fail-${i}`} style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>✗ {row}</Text>
            ))}
          </View>
          {!!importResult.blocked?.length && (
            <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#c2410c', marginBottom: 4 }}>
                {importResult.blocked.length} row{importResult.blocked.length > 1 ? 's' : ''} blocked — insufficient permissions
              </Text>
              {importResult.blocked.map((entry, i) => (
                <Text key={`blocked-${i}`} style={{ fontSize: 11, color: '#9a3412', marginTop: 1 }}>✗ {entry}</Text>
              ))}
              <Text style={{ fontSize: 11, color: '#c2410c', marginTop: 6 }}>
                HTA and Instructor accounts can only be created by an Instructor. Please consult one to add these accounts.
              </Text>
            </View>
          )}
        </>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>Add New Staff Member</Text>

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 4 }}>NetID *</Text>
          <TextInput
            placeholder="e.g. jsmith"
            value={inviteForm.netid}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, netid: text }))}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 4 }}>Full Name *</Text>
          <TextInput
            placeholder="e.g. Jane Smith"
            value={inviteForm.name}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, name: text }))}
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 4 }}>Temporary Password *</Text>
          <TextInput
            placeholder="Set a temporary password"
            value={inviteForm.password}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, password: text }))}
            secureTextEntry
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 6 }}>Role</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {availableRoles.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setInviteForm((prev) => ({ ...prev, role: r }))}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: inviteForm.role === r ? '#b91c1c' : '#E5E7EB' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 14, color: inviteForm.role === r ? '#fff' : '#374151' }}>
                  {ROLE_LABEL[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {inviteForm.role === 'Instructor' && (
            <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 8, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning-outline" size={16} color="#c2410c" />
              <Text style={{ fontSize: 12, color: '#c2410c', flex: 1 }}>
                Instructor has full admin permissions. You'll be asked to confirm before adding.
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting}
            style={{ backgroundColor: '#b91c1c', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
          >
            {submitting
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Add to System</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Search + Sort */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or NetID..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 14, color: '#111827' }}
              />
            </View>
            {(['name', 'role'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSortBy(opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  backgroundColor: sortBy === opt ? '#b91c1c' : '#fff',
                  borderColor: sortBy === opt ? '#b91c1c' : '#E5E7EB',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: sortBy === opt ? '#fff' : '#4B5563' }}>
                  {opt === 'name' ? 'A–Z' : 'Role'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Staff ({filteredStaff.length}{search ? ` of ${staff.length}` : ''})
          </Text>

          {isHTA && (
            <View style={{ backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 8, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={15} color="#0369a1" />
              <Text style={{ fontSize: 12, color: '#0369a1', flex: 1 }}>As HTA, you can add TAs to the system. Contact an Instructor to promote staff or remove accounts.</Text>
            </View>
          )}

          <FlatList
            data={filteredStaff}
            keyExtractor={(item) => String(item.id ?? item.netid)}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: '#6B7280', paddingVertical: 32 }}>No staff found.</Text>
            }
          />
        </>
      )}
    </ScrollView>
  );
}
