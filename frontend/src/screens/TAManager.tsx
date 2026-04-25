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
import { getSemesterStartDate, setSemesterStartDate } from '../api/settings';
import { useTheme } from '../contexts/ThemeContext';
import { getActivityStatuses, ActivityStatus } from '../api/activity';
import ActivityStatusBadge from '../components/ActivityStatusBadge';

type StaffRole = 'TA' | 'HTA' | 'Instructor';

const ROLE_LABEL: Record<StaffRole, string> = { TA: 'TA', HTA: 'Head TA', Instructor: 'Instructor' };

interface Props { userRole: UserRole; }

export default function StaffManagerScreen({ userRole }: Props) {
  const { colors } = useTheme();
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
  const [activityStatuses, setActivityStatuses] = useState<Record<string, ActivityStatus>>({});
  const [semesterStartDate, setSemesterStartDateState] = useState<string>('');
  const [semesterInput, setSemesterInput] = useState<string>('');
  const [semesterSaving, setSemesterSaving] = useState(false);
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

  useEffect(() => {
    const fetch = () => getActivityStatuses().then(setActivityStatuses).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isInstructor && !isHTA) return;
    getSemesterStartDate().then((d) => {
      if (d) { setSemesterStartDateState(d); setSemesterInput(d); }
    }).catch(() => {});
  }, []);

  const handleSaveSemesterStart = async () => {
    if (!semesterInput.trim()) return;
    setSemesterSaving(true);
    try {
      const saved = await setSemesterStartDate(semesterInput.trim());
      setSemesterStartDateState(saved);
      Alert.alert('Saved', `Semester start date set to ${saved}`);
    } catch {
      Alert.alert('Error', 'Failed to save semester start date.');
    } finally {
      setSemesterSaving(false);
    }
  };

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

  const _isAdminRole = (role: string) => role === 'HTA' || role === 'Instructor';

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

  const ROLE_BADGE_BG: Record<StaffRole, string> = { TA: colors.score2Bg, HTA: colors.warningBg, Instructor: colors.score0Bg };
  const ROLE_BADGE_TEXT: Record<StaffRole, string> = { TA: colors.iconTA, HTA: colors.warningText, Instructor: colors.criticalText };

  const renderItem = ({ item }: { item: UserSummary }) => {
    const role = normalizeRole(String(item.role)) as StaffRole;
    const cardKey = item.id ?? item.netid!;
    const isExpanded = expandedId === cardKey;
    const canExpand = isInstructor;

    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 10,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.name ?? '—'}</Text>
              {item.netid && (() => {
                const st = activityStatuses[item.netid] ?? 'offline';
                return (
                  <>
                    <ActivityStatusBadge status={st} size={12} borderColor={colors.surface} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: st === 'online' ? '#22c55e' : st === 'away' ? '#eab308' : '#94a3b8' }}>
                      {st === 'online' ? 'Online' : st === 'away' ? 'Away' : 'Offline'}
                    </Text>
                  </>
                );
              })()}
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 1 }}>{item.netid}</Text>
          </View>
          <TouchableOpacity
            onPress={() => canExpand && setExpandedId(isExpanded ? null : cardKey)}
            disabled={!canExpand}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: ROLE_BADGE_BG[role] ?? colors.borderLight }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ROLE_BADGE_TEXT[role] ?? colors.textSecondary }}>
                {ROLE_LABEL[role] ?? role}
              </Text>
            </View>
            {canExpand && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        {isExpanded && isInstructor && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 2 }}>Change role</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['TA', 'HTA', 'Instructor'] as StaffRole[]).map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => handleChangeRole(item, r)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8,
                      backgroundColor: active ? ROLE_BADGE_BG[r] : colors.borderLight,
                      borderWidth: 1,
                      borderColor: active ? ROLE_BADGE_TEXT[r] : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? ROLE_BADGE_TEXT[r] : colors.textSecondary }}>
                      {ROLE_LABEL[r]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => handleRemove(item)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.statusPoorBg, borderWidth: 1, borderColor: colors.statusPoorBar, marginTop: 2 }}
            >
              <Ionicons name="trash-outline" size={15} color={colors.criticalBorder} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.criticalBorder }}>Remove from system</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const pad = isMobile ? 12 : 20;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: pad }}>
      {/* Header */}
      <View style={{ marginBottom: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: isMobile ? 22 : 26, fontWeight: 'bold', color: colors.text }}>Staff Management</Text>
          {!isMobile && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {(isInstructor || isHTA) && (
                <>
                  <TouchableOpacity onPress={() => setShowCsvInfo(!showCsvInfo)} style={{ padding: 6 }}>
                    <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleImportCSV}
                    style={{ backgroundColor: colors.textSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Ionicons name="cloud-upload-outline" size={15} color={colors.textInverse} />
                    <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 14 }}>Import CSV</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                onPress={() => setShowInviteForm(!showInviteForm)}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="person-add" size={15} color={colors.textInverse} />
                <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 14 }}>
                  {showInviteForm ? 'Cancel' : 'Add Staff'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {isMobile && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {(isInstructor || isHTA) && (
              <>
                <TouchableOpacity onPress={() => setShowCsvInfo(!showCsvInfo)} style={{ padding: 6 }}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleImportCSV}
                  style={{ backgroundColor: colors.textSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
                >
                  <Ionicons name="cloud-upload-outline" size={15} color={colors.textInverse} />
                  <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 14 }}>Import CSV</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={() => setShowInviteForm(!showInviteForm)}
              style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}
            >
              <Ionicons name="person-add" size={15} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 14 }}>
                {showInviteForm ? 'Cancel' : 'Add Staff'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* CSV format info */}
      {showCsvInfo && (isInstructor || isHTA) && (
        <View style={{ backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warningText, marginBottom: 6 }}>CSV Import Format</Text>
          <Text style={{ fontSize: 12, color: colors.warningText, fontFamily: 'monospace', marginBottom: 4 }}>netid,name,password,role</Text>
          <Text style={{ fontSize: 12, color: colors.warningText, fontFamily: 'monospace', marginBottom: 4 }}>jsmith,Jane Smith,temp123,TA</Text>
          {isInstructor && (
            <>
              <Text style={{ fontSize: 12, color: colors.warningText, fontFamily: 'monospace', marginBottom: 4 }}>bjones,Bob Jones,temp123,HTA</Text>
              <Text style={{ fontSize: 12, color: colors.warningText, fontFamily: 'monospace', marginBottom: 8 }}>cprof,Chris Prof,temp123,Instructor</Text>
            </>
          )}
          <Text style={{ fontSize: 11, color: colors.warningText }}>• Header row is optional (auto-detected)</Text>
          <Text style={{ fontSize: 11, color: colors.warningText }}>• Role: TA{isInstructor ? ', HTA, or Instructor' : ' (only TA rows will be created as HTA)'} (defaults to TA)</Text>
          {isHTA && <Text style={{ fontSize: 11, color: colors.criticalText }}>• HTA and Instructor rows will be skipped — contact an Instructor to add admin accounts</Text>}
          {isInstructor && <Text style={{ fontSize: 11, color: colors.warningText }}>• Instructor rows require confirmation before adding</Text>}
          <Text style={{ fontSize: 11, color: colors.warningText }}>{'• Password defaults to "changeme" if blank'}</Text>
          <Text style={{ fontSize: 11, color: colors.warningText }}>• Existing NetIDs are skipped (no overwrite)</Text>
        </View>
      )}

      {/* Semester Start Date */}
      {(isInstructor || isHTA) && (
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Semester Start Date</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
            {semesterStartDate
              ? `Current: ${semesterStartDate}`
              : 'Not set — GitLab frequency charts will use a rolling window instead.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={semesterInput}
              onChangeText={setSemesterInput}
              placeholder="YYYY-MM-DD  e.g. 2026-01-13"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
            />
            <TouchableOpacity
              onPress={handleSaveSemesterStart}
              disabled={semesterSaving || !semesterInput.trim()}
              style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, alignItems: 'center', opacity: semesterSaving || !semesterInput.trim() ? 0.5 : 1 }}
            >
              {semesterSaving
                ? <ActivityIndicator size="small" color={colors.textInverse} />
                : <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 13 }}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Import result */}
      {importResult && (
        <>
          <View style={{ backgroundColor: importResult.failed.length === 0 ? colors.statusGoodBg : colors.statusModerateBg, borderWidth: 1, borderColor: importResult.failed.length === 0 ? colors.statusGoodBar : colors.statusModerateBar, borderRadius: 10, padding: 12, marginBottom: importResult.blocked?.length ? 6 : 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: importResult.failed.length === 0 ? colors.statusGoodText : colors.statusModerateText }}>
              {importResult.success} imported successfully{importResult.failed.length > 0 ? `, ${importResult.failed.length} failed` : ''}
            </Text>
            {importResult.failed.map((row, i) => (
              <Text key={`fail-${i}`} style={{ fontSize: 11, color: colors.statusModerateText, marginTop: 2 }}>✗ {row}</Text>
            ))}
          </View>
          {!!importResult.blocked?.length && (
            <View style={{ backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warningText, marginBottom: 4 }}>
                {importResult.blocked.length} row{importResult.blocked.length > 1 ? 's' : ''} blocked — insufficient permissions
              </Text>
              {importResult.blocked.map((entry, i) => (
                <Text key={`blocked-${i}`} style={{ fontSize: 11, color: colors.warningText, marginTop: 1 }}>✗ {entry}</Text>
              ))}
              <Text style={{ fontSize: 11, color: colors.warningText, marginTop: 6 }}>
                HTA and Instructor accounts can only be created by an Instructor. Please consult one to add these accounts.
              </Text>
            </View>
          )}
        </>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>Add New Staff Member</Text>

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>NetID *</Text>
          <TextInput
            placeholder="e.g. jsmith"
            placeholderTextColor={colors.textFaint}
            value={inviteForm.netid}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, netid: text }))}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Full Name *</Text>
          <TextInput
            placeholder="e.g. Jane Smith"
            placeholderTextColor={colors.textFaint}
            value={inviteForm.name}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, name: text }))}
            style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Temporary Password *</Text>
          <TextInput
            placeholder="Set a temporary password"
            placeholderTextColor={colors.textFaint}
            value={inviteForm.password}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, password: text }))}
            secureTextEntry
            style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Role</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {availableRoles.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setInviteForm((prev) => ({ ...prev, role: r }))}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: inviteForm.role === r ? colors.primary : colors.borderLight }}
              >
                <Text style={{ fontWeight: '600', fontSize: 14, color: inviteForm.role === r ? colors.textInverse : colors.textSecondary }}>
                  {ROLE_LABEL[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {inviteForm.role === 'Instructor' && (
            <View style={{ backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 8, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning-outline" size={16} color={colors.warningIcon} />
              <Text style={{ fontSize: 12, color: colors.warningText, flex: 1 }}>
                {"Instructor has full admin permissions. You'll be asked to confirm before adding."}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting}
            style={{ backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
          >
            {submitting
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 14 }}>Add to System</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Search + Sort */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.inputBorder }}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or NetID..."
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 14, color: colors.text }}
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
                  backgroundColor: sortBy === opt ? colors.primary : colors.surface,
                  borderColor: sortBy === opt ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: sortBy === opt ? colors.textInverse : colors.textSecondary }}>
                  {opt === 'name' ? 'A–Z' : 'Role'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            Staff ({filteredStaff.length}{search ? ` of ${staff.length}` : ''})
          </Text>

          {isHTA && (
            <View style={{ backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 8, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={15} color={colors.warningText} />
              <Text style={{ fontSize: 12, color: colors.warningText, flex: 1 }}>As HTA, you can add TAs to the system. Contact an Instructor to promote staff or remove accounts.</Text>
            </View>
          )}

          <FlatList
            data={filteredStaff}
            keyExtractor={(item) => String(item.id ?? item.netid)}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 32 }}>No staff found.</Text>
            }
          />
        </>
      )}
    </ScrollView>
  );
}
