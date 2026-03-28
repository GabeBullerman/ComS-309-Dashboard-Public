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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserSummary, normalizeRole } from '../utils/auth';
import { getUsersByRole, createUser, updateUser, deleteUser } from '../api/users';

type StaffRole = 'TA' | 'HTA';

export default function TAManagerScreen() {
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
      <View className="bg-white p-4 rounded-lg mb-3 border border-gray-200">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-800">{item.name ?? '—'}</Text>
            <Text className="text-gray-500 text-sm">{item.netid}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => handleToggleRole(item)}
              className={`px-3 py-1 rounded-full ${isHTA ? 'bg-yellow-100' : 'bg-blue-100'}`}
            >
              <Text className={`text-xs font-semibold ${isHTA ? 'text-yellow-800' : 'text-blue-800'}`}>
                {isHTA ? 'Head TA' : 'TA'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemove(item)} className="p-1">
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-gray-800">TA Management</Text>
        <TouchableOpacity
          onPress={() => setShowInviteForm(!showInviteForm)}
          className="bg-red-700 px-4 py-2 rounded-lg flex-row items-center"
        >
          <Ionicons name="person-add" size={16} color="white" />
          <Text className="text-white font-medium ml-2">
            {showInviteForm ? 'Cancel' : 'Add TA'}
          </Text>
        </TouchableOpacity>
      </View>

      {showInviteForm && (
        <View className="bg-white p-4 rounded-lg mb-6 border border-gray-200">
          <Text className="text-lg font-semibold mb-4">Add New TA</Text>

          <Text className="text-xs font-semibold text-gray-600 mb-1">NetID *</Text>
          <TextInput
            placeholder="e.g. jsmith"
            value={inviteForm.netid}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, netid: text }))}
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
          />

          <Text className="text-xs font-semibold text-gray-600 mb-1">Full Name *</Text>
          <TextInput
            placeholder="e.g. Jane Smith"
            value={inviteForm.name}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, name: text }))}
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
          />

          <Text className="text-xs font-semibold text-gray-600 mb-1">Temporary Password *</Text>
          <TextInput
            placeholder="Set a temporary password"
            value={inviteForm.password}
            onChangeText={(text) => setInviteForm((prev) => ({ ...prev, password: text }))}
            secureTextEntry
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4"
          />

          <Text className="text-xs font-semibold text-gray-600 mb-2">Role</Text>
          <View className="flex-row mb-4">
            {(['TA', 'HTA'] as StaffRole[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setInviteForm((prev) => ({ ...prev, role: r }))}
                className={`px-4 py-2 rounded-lg mr-2 ${inviteForm.role === r ? 'bg-red-700' : 'bg-gray-200'}`}
              >
                <Text className={`font-medium ${inviteForm.role === r ? 'text-white' : 'text-gray-700'}`}>
                  {r === 'HTA' ? 'Head TA' : 'TA'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting}
            className="bg-red-700 px-4 py-2 rounded-lg"
          >
            {submitting
              ? <ActivityIndicator size="small" color="white" />
              : <Text className="text-white font-medium text-center">Add to System</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#C8102E" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="flex-1 flex-row items-center bg-white rounded-lg px-3 py-2 border border-gray-200">
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or NetID..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-sm text-gray-800"
              />
            </View>
            {(['name', 'role'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSortBy(opt)}
                className={`px-3 py-2 rounded-lg border ${sortBy === opt ? 'bg-red-700 border-red-700' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-xs font-semibold ${sortBy === opt ? 'text-white' : 'text-gray-600'}`}>
                  {opt === 'name' ? 'A–Z' : 'Role'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-base font-semibold mb-3 text-gray-700">
            Staff ({filteredStaff.length}{search ? ` of ${staff.length}` : ''})
          </Text>
          <FlatList
            data={filteredStaff}
            keyExtractor={(item) => String(item.id ?? item.netid)}
            renderItem={renderItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text className="text-center text-gray-500 py-8">No TAs found.</Text>
            }
          />
        </>
      )}
    </ScrollView>
  );
}