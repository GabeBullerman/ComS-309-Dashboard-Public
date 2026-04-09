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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeRole, UserSummary } from '../utils/auth';
import { getCurrentUser, getUsersByRole } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { getTasksAssignedBy, createTask, updateTask, deleteTask, TaskApiResponse } from '../api/tasks';

type RecipientType = 'specific-ta' | 'all-tas' | 'specific-team' | 'all-my-teams' | 'all-students';

export default function TaskAssignmentScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [netid, setNetid] = useState<string | null>(null);
  const [role, setRole] = useState<string>('TA');
  const [tas, setTas] = useState<UserSummary[]>([]);
  const [teams, setTeams] = useState<TeamApiResponse[]>([]);
  const [myTasks, setMyTasks] = useState<TaskApiResponse[]>([]);
  const [taskLabelMap, setTaskLabelMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', description: '', dueDate: '' });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('specific-ta');
  const [selectedTANetid, setSelectedTANetid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const handleSaveEdit = async (ids: number[]) => {
    if (!editDraft.title.trim()) return;
    try {
      await Promise.allSettled(ids.map((id) => updateTask(id, {
        title: editDraft.title.trim(),
        description: editDraft.description.trim() || undefined,
        dueDate: editDraft.dueDate || undefined,
      })));
      setMyTasks((prev) => prev.map((t) =>
        ids.includes(t.id)
          ? { ...t, title: editDraft.title.trim(), description: editDraft.description.trim() || undefined, dueDate: editDraft.dueDate ? `${editDraft.dueDate}T00:00:00` : undefined }
          : t
      ));
      setEditingId(null);
    } catch {
      Alert.alert('Error', 'Failed to update task.');
    }
  };

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
    let recipientLabel = '';

    if (recipientType === 'specific-ta') {
      if (!selectedTANetid) { Alert.alert('Select a TA first.'); return; }
      recipients = [selectedTANetid];
      const ta = tas.find((t) => t.netid === selectedTANetid);
      recipientLabel = ta?.name ?? selectedTANetid;
    } else if (recipientType === 'all-tas') {
      recipients = tas.map((t) => t.netid!).filter(Boolean);
      recipientLabel = 'All TAs';
    } else if (recipientType === 'specific-team') {
      const team = teams.find((t) => t.id === selectedTeamId);
      if (!team) { Alert.alert('Select a team first.'); return; }
      recipients = (team.students ?? []).map((s) => s.netid!).filter(Boolean);
      recipientLabel = team.name ?? 'Team';
    } else if (recipientType === 'all-my-teams') {
      const all = teams.flatMap((t) => (t.students ?? []).map((s) => s.netid!)).filter(Boolean);
      recipients = [...new Set(all)];
      recipientLabel = 'All My Teams';
    } else if (recipientType === 'all-students') {
      const all = teams.flatMap((t) => (t.students ?? []).map((s) => s.netid!)).filter(Boolean);
      recipients = [...new Set(all)];
      recipientLabel = 'All Students';
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
      setTaskLabelMap((prev) => {
        const next = { ...prev };
        for (const t of created) next[t.id] = recipientLabel;
        return next;
      });
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
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#C8102E" />
    </View>
  );

  // ── Task grouping logic ────────────────────────────────────────────────────
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

  const pad = isMobile ? 12 : 24;

  const formPanel = (
        <View style={{ width: isMobile ? undefined : 300, backgroundColor: 'white', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: isMobile ? 12 : 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#111827' }}>New Task</Text>

          {/* Title */}
          <Text className="text-xs font-semibold text-gray-700 mb-1">Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor="#9ca3af"
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm"
          />

          {/* Description */}
          <Text className="text-xs font-semibold text-gray-700 mb-1">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor="#9ca3af"
            multiline
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm h-18 text-top"
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Due Date</Text>
          {Platform.OS === 'web'
            ? React.createElement('input', {
                type: 'date',
                value: dueDate,
                onChange: (e: any) => setDueDate(e.target.value),
                style: {
                  border: '1px solid #D1D5DB', borderRadius: 8,
                  padding: '8px 12px', marginBottom: 16, fontSize: 14,
                  width: '100%', boxSizing: 'border-box', color: '#111827',
                },
              })
            : <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, fontSize: 14 }}
              />
          }

          {/* Assign To */}
          <Text className="text-xs font-semibold text-gray-700 mb-2">Assign To</Text>
          <View className="gap-1.5 mb-3">
            {recipientOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setRecipientType(opt.key)}
                className={`px-3 py-2 rounded-lg ${
                  recipientType === opt.key ? 'bg-red-700' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    recipientType === opt.key ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TA picker */}
          {recipientType === 'specific-ta' && (
            <>
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Select TA</Text>
              <ScrollView className="max-h-28 border border-gray-200 rounded-lg mb-3">
                {tas.length === 0 ? (
                  <Text className="p-3 text-gray-400 text-sm">No TAs found.</Text>
                ) : (
                  tas.map((ta) => (
                    <TouchableOpacity
                      key={ta.netid}
                      onPress={() => setSelectedTANetid(ta.netid ?? null)}
                      className={`px-3 py-2 ${
                        selectedTANetid === ta.netid ? 'bg-red-100' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          selectedTANetid === ta.netid
                            ? 'text-red-700 font-semibold'
                            : 'text-gray-700 font-normal'
                        }`}
                      >
                        {ta.name ?? ta.netid}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {/* Team picker */}
          {recipientType === 'specific-team' && (
            <>
              <Text className="text-xs font-semibold text-gray-700 mb-1.5">Select Team</Text>
              <ScrollView className="max-h-28 border border-gray-200 rounded-lg mb-3">
                {teams.length === 0 ? (
                  <Text className="p-3 text-gray-400 text-sm">No teams found.</Text>
                ) : (
                  teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      onPress={() => setSelectedTeamId(team.id ?? null)}
                      className={`px-3 py-2 ${
                        selectedTeamId === team.id ? 'bg-red-100' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          selectedTeamId === team.id
                            ? 'text-red-700 font-semibold'
                            : 'text-gray-700 font-normal'
                        }`}
                      >
                        {team.name}{team.section ? ` · Sec ${team.section}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting || !title.trim()}
            className={`rounded-lg py-3 items-center mt-1 ${
              !title.trim() ? 'bg-gray-200' : 'bg-red-700'
            }`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`font-semibold text-sm ${
                  !title.trim() ? 'text-gray-400' : 'text-white'
                }`}
              >
                Create Task
              </Text>
            )}
          </TouchableOpacity>
        </View>
  );

  // const taskGroups = (() => {
  //   const map = new Map<string, { rep: typeof myTasks[0]; ids: number[]; netids: string[] }>();
  //   for (const t of myTasks) {
  //     const key = `${t.title}||${t.description ?? ''}||${t.dueDate ?? ''}`;
  //     if (!map.has(key)) map.set(key, { rep: t, ids: [], netids: [] });
  //     const g = map.get(key)!;
  //     g.ids.push(t.id);
  //     if (t.assignedToNetid) g.netids.push(t.assignedToNetid);
  //   }
  //   return [...map.values()].sort((a, b) => (a.rep.dueDate ?? '').localeCompare(b.rep.dueDate ?? ''));
  // })();

  // const handleDeleteGroup = async (ids: number[]) => {
  //   await Promise.allSettled(ids.map((id) => deleteTask(id)));
  //   setMyTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
  // };

  const taskListPanel = (
    <View style={{ flex: isMobile ? undefined : 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
          Tasks I've Assigned ({taskGroups.length} task{taskGroups.length !== 1 ? 's' : ''})
        </Text>
      </View>
      <FlatList
        data={taskGroups}
        keyExtractor={(g) => String(g.rep.id)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        scrollEnabled={!isMobile}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 32, fontSize: 14 }}>
            No tasks assigned yet.
          </Text>
        }
        renderItem={({ item: g }) => {
          const dateOnly = g.rep.dueDate ? g.rep.dueDate.split('T')[0] : null;
          const recipientLabel = taskLabelMap[g.rep.id]
            ?? (g.netids.length === 1 ? g.netids[0] : `${g.netids.length} recipients`);
          const isEditing = editingId === g.rep.id;
          return (
            <View style={{ backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: isEditing ? '#C8102E' : '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 }}>{g.rep.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => {
                    if (isEditing) { setEditingId(null); return; }
                    setEditDraft({ title: g.rep.title, description: g.rep.description ?? '', dueDate: dateOnly ?? '' });
                    setEditingId(g.rep.id);
                  }}>
                    <Ionicons name={isEditing ? 'close-outline' : 'pencil-outline'} size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteGroup(g.ids)}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>

              {isEditing ? (
                <View style={{ marginTop: 8, gap: 6 }}>
                  <TextInput
                    value={editDraft.title}
                    onChangeText={(t) => setEditDraft((p) => ({ ...p, title: t }))}
                    placeholder="Title"
                    style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 }}
                  />
                  <TextInput
                    value={editDraft.description}
                    onChangeText={(t) => setEditDraft((p) => ({ ...p, description: t }))}
                    placeholder="Description (optional)"
                    style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 }}
                  />
                  {Platform.OS === 'web'
                    ? React.createElement('input', {
                        type: 'date', value: editDraft.dueDate,
                        onChange: (e: any) => setEditDraft((p) => ({ ...p, dueDate: e.target.value })),
                        style: { border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' },
                      })
                    : <TextInput
                        value={editDraft.dueDate}
                        onChangeText={(t) => setEditDraft((p) => ({ ...p, dueDate: t }))}
                        placeholder="YYYY-MM-DD"
                        style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 }}
                      />
                  }
                  <TouchableOpacity
                    onPress={() => handleSaveEdit(g.ids)}
                    disabled={!editDraft.title.trim()}
                    style={{ backgroundColor: editDraft.title.trim() ? '#C8102E' : '#e5e7eb', borderRadius: 6, paddingVertical: 8, alignItems: 'center' }}
                  >
                    <Text style={{ color: editDraft.title.trim() ? 'white' : '#9ca3af', fontSize: 13, fontWeight: '600' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {g.rep.description ? (
                    <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{g.rep.description}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>→ {recipientLabel}</Text>
                    {dateOnly && <Text style={{ fontSize: 12, color: '#6b7280' }}>Due: {dateOnly}</Text>}
                  </View>
                </>
              )}
            </View>
          );
        }}
      />
    </View>
  );

  const header = (
    <>
      <Text style={{ fontSize: isMobile ? 22 : 26, fontWeight: '700', color: '#111827', marginBottom: 2 }}>Assign Tasks</Text>
      <Text style={{ color: '#64748b', marginBottom: 16, fontSize: 13 }}>
        {isHtaOrInstructor ? 'Assign tasks to TAs or Student Teams' : 'Assign tasks to your Student Teams'}
      </Text>
    </>
  );

  if (isMobile) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ padding: pad, paddingBottom: 24 }}>
        {header}
        {formPanel}
        {taskListPanel}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', padding: pad }}>
      {header}
      <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
        {formPanel}
        {taskListPanel}
      </View>
    </View>
  );
}