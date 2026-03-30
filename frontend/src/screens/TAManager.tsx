import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSummary, normalizeRole } from '../utils/auth';
import { getUsersByRole, createUser, updateUser, deleteUser } from '../api/users';

type StaffRole = 'TA' | 'HTA';

export default function TAManagerScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  const [staff, setStaff] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'role'>('role');
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    netid: '',
    name: '',
    password: '',
    role: 'TA' as StaffRole,
  });

  const loadStaff = async () => {
    setLoading(true);
    try {
      const [tas, htas] = await Promise.all([
        getUsersByRole('TA'),
        getUsersByRole('HTA'),
      ]);
      const combined = [...htas, ...tas].map((u) => ({
        ...u,
        role: normalizeRole(String(u.role)),
      }));
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
      result.sort((a, b) => {
        const aHTA = normalizeRole(String(a.role)) === 'HTA';
        const bHTA = normalizeRole(String(b.role)) === 'HTA';
        if (aHTA !== bHTA) return aHTA ? -1 : 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
    }
    return result;
  }, [staff, search, sortBy]);

  const handleCreate = async () => {
    if (!inviteForm.netid.trim() || !inviteForm.name.trim() || !inviteForm.password.trim()) {
      Alert.alert('Error', 'NetID, name, and password are required.');
      return;
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

  const handleToggleRole = (member: UserSummary) => {
    if (!member.id) return;
    const newRole: StaffRole = normalizeRole(String(member.role)) === 'TA' ? 'HTA' : 'TA';
    const label = normalizeRole(String(member.role)) === 'TA' ? 'Head TA' : 'TA';
    Alert.alert(
      'Change Role',
      `Promote ${member.name ?? member.netid} to ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await updateUser(member.id!, { role: [newRole] });
              setStaff((prev) =>
                prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m)
              );
            } catch {
              Alert.alert('Error', 'Failed to update role.');
            }
          },
        },
      ]
    );
  };

  const handleRemove = (member: UserSummary) => {
    if (!member.id) return;
    Alert.alert(
      'Remove Staff',
      `Remove ${member.name ?? member.netid} from the system?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(member.id!);
              setStaff((prev) => prev.filter((m) => m.id !== member.id));
            } catch {
              Alert.alert('Error', 'Failed to remove user.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: UserSummary }) => {
    const role = normalizeRole(String(item.role));
    const isHTA = role === 'HTA';
    return (
      <View style={{
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.name ?? '—'}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 1 }}>{item.netid}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => handleToggleRole(item)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                backgroundColor: isHTA ? '#fef9c3' : '#dbeafe',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: isHTA ? '#92400e' : '#1e40af' }}>
                {isHTA ? 'Head TA' : 'TA'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemove(item)} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const pad = isMobile ? 12 : 20;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ padding: pad }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: isMobile ? 22 : 26, fontWeight: 'bold', color: '#111827' }}>TA Management</Text>
        <TouchableOpacity
          onPress={() => setShowInviteForm(!showInviteForm)}
          style={{ backgroundColor: '#b91c1c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="person-add" size={15} color="white" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {showInviteForm ? 'Cancel' : 'Add TA'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Invite Form */}
      {showInviteForm && (
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>Add New TA</Text>

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
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {(['TA', 'HTA'] as StaffRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setInviteForm((prev) => ({ ...prev, role: r }))}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: inviteForm.role === r ? '#b91c1c' : '#E5E7EB' }}
              >
                <Text style={{ fontWeight: '600', fontSize: 14, color: inviteForm.role === r ? '#fff' : '#374151' }}>
                  {r === 'HTA' ? 'Head TA' : 'TA'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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

          <FlatList
            data={filteredStaff}
            keyExtractor={(item) => String(item.id ?? item.netid)}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: '#6B7280', paddingVertical: 32 }}>No TAs found.</Text>
            }
          />
        </>
      )}
    </ScrollView>
  );
}
