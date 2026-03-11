import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentUser,
  getTeams,
  getUsersByRole,
  getTasksAssignedBy,
  createTask,
  deleteTask,
  normalizeRole,
  TaskApiResponse,
  UserSummary,
  TeamApiResponse,
} from '../utils/auth';

type RecipientType = 'specific-ta' | 'all-tas' | 'specific-team' | 'all-my-teams' | 'all-students';

export default function TaskAssignmentScreen() {
  const [netid, setNetid] = useState<string | null>(null);
  const [role, setRole] = useState<string>('TA');
  const [tas, setTas] = useState<UserSummary[]>([]);
  const [teams, setTeams] = useState<TeamApiResponse[]>([]);
  const [myTasks, setMyTasks] = useState<TaskApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('specific-ta');
  const [selectedTANetid, setSelectedTANetid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const isHtaOrInstructor = role === 'HTA' || role === 'Instructor';

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      if (!user?.netid) { setLoading(false); return; }
      const r = normalizeRole(String(user.role));
      setNetid(user.netid);
      setRole(r);

      const fetches: Promise<void>[] = [
        getTasksAssignedBy(user.netid).then(setMyTasks).catch(() => {}),
      ];

      if (r === 'HTA' || r === 'Instructor') {
        fetches.push(
          getUsersByRole('TA')
            .then((list) => setTas(list))
            .catch(() => {})
        );
        fetches.push(getTeams().then(setTeams).catch(() => {}));
        setRecipientType('specific-ta');
      } else if (r === 'TA') {
        fetches.push(getTeams(user.netid).then(setTeams).catch(() => {}));
        setRecipientType('specific-team');
      }

      await Promise.all(fetches);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !netid) return;

    let recipients: string[] = [];

    if (recipientType === 'specific-ta') {
      if (!selectedTANetid) { Alert.alert('Select a TA first.'); return; }
      recipients = [selectedTANetid];
    } else if (recipientType === 'all-tas') {
      recipients = tas.map((t) => t.netid!).filter(Boolean);
    } else if (recipientType === 'specific-team') {
      const team = teams.find((t) => t.id === selectedTeamId);
      if (!team) { Alert.alert('Select a team first.'); return; }
      recipients = (team.students ?? []).map((s) => s.netid!).filter(Boolean);
    } else if (recipientType === 'all-my-teams' || recipientType === 'all-students') {
      const all = teams.flatMap((t) => (t.students ?? []).map((s) => s.netid!)).filter(Boolean);
      recipients = [...new Set(all)];
    }

    if (recipients.length === 0) { Alert.alert('No recipients found.'); return; }

    setSubmitting(true);
    try {
      const results = await Promise.allSettled(
        recipients.map((toNetid) =>
          createTask({
            title: title.trim(),
            description: description.trim() || undefined,
            dueDate: dueDate.trim() || undefined,
            assignedToNetid: toNetid,
            assignedByNetid: netid!,
          })
        )
      );
      const created = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value);
      const failedCount = results.filter((r) => r.status === 'rejected').length;
      setMyTasks((prev) => [...created, ...prev]);
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedTANetid(null);
      setSelectedTeamId(null);
      const msg = failedCount > 0
        ? `Assigned to ${created.length} recipient${created.length !== 1 ? 's' : ''}. ${failedCount} failed (user may not exist).`
        : `Task assigned to ${created.length} recipient${created.length !== 1 ? 's' : ''}.`;
      Alert.alert('Done', msg);
    } catch {
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  const recipientOptions: { key: RecipientType; label: string }[] = isHtaOrInstructor
    ? [
        { key: 'specific-ta', label: 'Specific TA' },
        { key: 'all-tas', label: 'All TAs' },
        { key: 'specific-team', label: 'Specific Team' },
        { key: 'all-students', label: 'All Students' },
      ]
    : [
        { key: 'specific-team', label: 'Specific Team' },
        { key: 'all-my-teams', label: 'All My Teams' },
      ];

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#C8102E" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', padding: 24 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#1e3a8a', marginBottom: 4 }}>Assign Tasks</Text>
      <Text style={{ color: '#64748b', marginBottom: 20 }}>
        {isHtaOrInstructor ? 'Assign tasks to TAs or student teams' : 'Assign tasks to your teams'}
      </Text>

      <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>

        {/* LEFT: Create Form */}
        <View style={{ width: 300, backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#111827' }}>New Task</Text>

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor="#9ca3af"
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, fontSize: 14 }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor="#9ca3af"
            multiline
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, fontSize: 14, height: 72, textAlignVertical: 'top' }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Due Date</Text>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, fontSize: 14 }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Assign To</Text>
          <View style={{ gap: 6, marginBottom: 12 }}>
            {recipientOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setRecipientType(opt.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                  backgroundColor: recipientType === opt.key ? '#C8102E' : '#f3f4f6',
                }}
              >
                <Text style={{ color: recipientType === opt.key ? 'white' : '#374151', fontSize: 13, fontWeight: '500' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TA picker */}
          {recipientType === 'specific-ta' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Select TA</Text>
              <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 12 }}>
                {tas.length === 0
                  ? <Text style={{ padding: 12, color: '#9ca3af', fontSize: 13 }}>No TAs found.</Text>
                  : tas.map((ta) => (
                    <TouchableOpacity
                      key={ta.netid}
                      onPress={() => setSelectedTANetid(ta.netid ?? null)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: selectedTANetid === ta.netid ? '#FEE2E2' : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, color: selectedTANetid === ta.netid ? '#C8102E' : '#374151', fontWeight: selectedTANetid === ta.netid ? '600' : '400' }}>
                        {ta.name ?? ta.netid}
                      </Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            </>
          )}

          {/* Team picker */}
          {recipientType === 'specific-team' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Select Team</Text>
              <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 12 }}>
                {teams.length === 0
                  ? <Text style={{ padding: 12, color: '#9ca3af', fontSize: 13 }}>No teams found.</Text>
                  : teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      onPress={() => setSelectedTeamId(team.id ?? null)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: selectedTeamId === team.id ? '#FEE2E2' : 'transparent' }}
                    >
                      <Text style={{ fontSize: 13, color: selectedTeamId === team.id ? '#C8102E' : '#374151', fontWeight: selectedTeamId === team.id ? '600' : '400' }}>
                        {team.name}{team.section ? ` · Sec ${team.section}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting || !title.trim()}
            style={{ backgroundColor: !title.trim() ? '#e5e7eb' : '#C8102E', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
          >
            {submitting
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={{ color: !title.trim() ? '#9ca3af' : 'white', fontWeight: '600', fontSize: 14 }}>Create Task</Text>
            }
          </TouchableOpacity>
        </View>

        {/* RIGHT: Tasks I've created — grouped by title/description/dueDate */}
        {(() => {
          const taskGroups = (() => {
            const map = new Map<string, { rep: typeof myTasks[0]; ids: number[]; netids: string[] }>();
            for (const t of myTasks) {
              const key = `${t.title}||${t.description ?? ''}||${t.dueDate ?? ''}`;
              if (!map.has(key)) map.set(key, { rep: t, ids: [], netids: [] });
              const g = map.get(key)!;
              g.ids.push(t.id);
              if (t.assignedToNetid) g.netids.push(t.assignedToNetid);
            }
            return [...map.values()].sort((a, b) => (a.rep.dueDate ?? '').localeCompare(b.rep.dueDate ?? ''));
          })();

          const handleDeleteGroup = async (ids: number[]) => {
            await Promise.allSettled(ids.map((id) => deleteTask(id)));
            setMyTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
          };

          return (
            <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                  Tasks I've Assigned ({taskGroups.length} task{taskGroups.length !== 1 ? 's' : ''})
                </Text>
              </View>
              <FlatList
                data={taskGroups}
                keyExtractor={(g) => String(g.rep.id)}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 32, fontSize: 14 }}>
                    No tasks assigned yet.
                  </Text>
                }
                renderItem={({ item: g }) => {
                  const dateOnly = g.rep.dueDate ? g.rep.dueDate.split('T')[0] : null;
                  const recipientLabel = g.netids.length === 1
                    ? g.netids[0]
                    : `${g.netids.length} recipients`;
                  return (
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={{ fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 }}>{g.rep.title}</Text>
                        <TouchableOpacity onPress={() => handleDeleteGroup(g.ids)}>
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                      {g.rep.description ? (
                        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{g.rep.description}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>→ {recipientLabel}</Text>
                        {dateOnly && <Text style={{ fontSize: 12, color: '#6b7280' }}>Due: {dateOnly}</Text>}
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          );
        })()}

      </View>
    </View>
  );
}
