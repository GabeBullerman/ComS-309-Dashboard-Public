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
import { useTheme } from '../contexts/ThemeContext';
import { normalizeRole, UserSummary } from '../utils/auth';
import { getCurrentUser, getUsersByRole, getUserByNetid } from '../api/users';
import { getTeams, TeamApiResponse } from '../api/teams';
import { getTasksAssignedBy, createTask, updateTask, deleteTask, TaskApiResponse, TaskStatus } from '../api/tasks';

type RecipientType = 'specific-hta' | 'all-htas' | 'specific-ta' | 'all-tas' | 'specific-team' | 'all-my-teams' | 'all-students';

export default function TaskAssignmentScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [netid, setNetid] = useState<string | null>(null);
  const [role, setRole] = useState<string>('TA');
  const [htas, setHtas] = useState<UserSummary[]>([]);
  const [tas, setTas] = useState<UserSummary[]>([]);
  const [teams, setTeams] = useState<TeamApiResponse[]>([]);
  const [myTasks, setMyTasks] = useState<TaskApiResponse[]>([]);
  const [recipientNameMap, setRecipientNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', description: '', dueDate: '' });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('specific-ta');
  const [selectedHTANetids, setSelectedHTANetids] = useState<Set<string>>(new Set());
  const [selectedTANetids, setSelectedTANetids] = useState<Set<string>>(new Set());
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set());

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
        getTasksAssignedBy(user.netid).then((tasks) => {
          setMyTasks(tasks);
          const uniqueNetids = [...new Set(tasks.map((t) => t.assignedToNetid).filter(Boolean))] as string[];
          Promise.all(uniqueNetids.map((n) => getUserByNetid(n).then((u) => u ? [n, u.name ?? n] as const : null)))
            .then((results) => {
              const map: Record<string, string> = {};
              for (const r of results) { if (r) map[r[0]] = r[1]; }
              setRecipientNameMap(map);
            });
        }).catch(() => {}),
      ];

      if (r === 'HTA' || r === 'Instructor') {
        fetches.push(
          getUsersByRole('TA')
            .then((list) => setTas(list))
            .catch(() => {})
        );
        if (r === 'Instructor') {
          fetches.push(
            getUsersByRole('HTA')
              .then((list) => setHtas(list))
              .catch(() => {})
          );
        }
        fetches.push(getTeams().then(setTeams).catch(() => {}));
        setRecipientType(r === 'Instructor' ? 'specific-hta' : 'specific-ta');
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

    if (recipientType === 'specific-hta') {
      if (selectedHTANetids.size === 0) { Alert.alert('Select at least one HTA.'); return; }
      recipients = [...selectedHTANetids];
    } else if (recipientType === 'all-htas') {
      recipients = htas.map((h) => h.netid!).filter(Boolean);
    } else if (recipientType === 'specific-ta') {
      if (selectedTANetids.size === 0) { Alert.alert('Select at least one TA.'); return; }
      recipients = [...selectedTANetids];
    } else if (recipientType === 'all-tas') {
      recipients = tas.map((t) => t.netid!).filter(Boolean);
    } else if (recipientType === 'specific-team') {
      if (selectedTeamIds.size === 0) { Alert.alert('Select at least one team.'); return; }
      const selectedTeams = teams.filter((t) => t.id !== undefined && selectedTeamIds.has(t.id));
      const all = selectedTeams.flatMap((t) => (t.students ?? []).map((s) => s.netid!)).filter(Boolean);
      recipients = [...new Set(all)];
    } else if (recipientType === 'all-my-teams') {
      const all = teams.flatMap((t) => (t.students ?? []).map((s) => s.netid!)).filter(Boolean);
      recipients = [...new Set(all)];
    } else if (recipientType === 'all-students') {
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
      setSelectedHTANetids(new Set());
      setSelectedTANetids(new Set());
      setSelectedTeamIds(new Set());
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

  const recipientOptions: { key: RecipientType; label: string }[] = role === 'Instructor'
    ? [
        { key: 'specific-hta', label: 'Specific HTA' },
        { key: 'all-htas', label: 'All HTAs' },
        { key: 'specific-ta', label: 'Specific TA' },
        { key: 'all-tas', label: 'All TAs' },
        { key: 'specific-team', label: 'Specific Team' },
        { key: 'all-students', label: 'All Students' },
      ]
    : isHtaOrInstructor
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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
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

  const handleDeleteGroup = (ids: number[]) => {
    const msg = 'Delete this task? This cannot be undone.';
    const doDelete = async () => {
      await Promise.allSettled(ids.map((id) => deleteTask(id)));
      setMyTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
    };
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doDelete();
    } else {
      Alert.alert('Delete Task', msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
    }
  };


  const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string; label: string }> = {
    TODO:     { bg: colors.borderLight,      text: colors.textSecondary, border: colors.border,            label: 'To Do' },
    WIP:      { bg: colors.statusModerateBg, text: colors.statusModerateText, border: colors.statusModerateBar, label: 'In Progress' },
    COMPLETE: { bg: colors.statusGoodBg,     text: colors.statusGoodText,    border: colors.statusGoodBar,     label: 'Complete' },
  };
  const pad = isMobile ? 12 : 24;

  const formPanel = (
        <View style={{ width: isMobile ? undefined : 300, backgroundColor: colors.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: isMobile ? 12 : 0 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 16, color: colors.text }}>New Task</Text>

          {/* Title */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title"
            placeholderTextColor={colors.textFaint}
            style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
          />

          {/* Description */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor={colors.textFaint}
            multiline
            style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg, minHeight: 72, textAlignVertical: 'top' }}
          />

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Due Date</Text>
          <View style={{ overflow: 'hidden', marginBottom: 16 }}>
            {Platform.OS === 'web'
              ? React.createElement('input', {
                  type: 'date',
                  value: dueDate,
                  onChange: (e: any) => setDueDate(e.target.value),
                  style: {
                    border: `1px solid ${colors.inputBorder}`, borderRadius: 8,
                    padding: '8px 12px', fontSize: 14,
                    width: '100%', boxSizing: 'border-box', color: colors.text,
                    backgroundColor: colors.inputBg, display: 'block',
                  },
                })
              : <TextInput
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textFaint}
                  style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg, alignSelf: 'stretch' }}
                />
            }
          </View>

          {/* Assign To */}
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Assign To</Text>
          <View style={{ gap: 6, marginBottom: 12 }}>
            {recipientOptions.map((opt) => {
              const isActive = recipientType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    setRecipientType(opt.key);
                    setSelectedHTANetids(new Set());
                    setSelectedTANetids(new Set());
                    setSelectedTeamIds(new Set());
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: isActive ? colors.primary : colors.surface, borderWidth: 1, borderColor: isActive ? colors.primary : colors.borderMedium }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: isActive ? colors.textInverse : colors.text }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* HTA picker */}
          {recipientType === 'specific-hta' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                Select HTA{selectedHTANetids.size > 0 ? ` (${selectedHTANetids.size} selected)` : ''}
              </Text>
              <ScrollView style={{ maxHeight: 112, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 12 }}>
                {htas.length === 0 ? (
                  <Text style={{ padding: 12, color: colors.textFaint, fontSize: 13 }}>No HTAs found.</Text>
                ) : (
                  htas.map((hta) => {
                    const selected = selectedHTANetids.has(hta.netid!);
                    return (
                      <TouchableOpacity
                        key={hta.netid}
                        onPress={() => setSelectedHTANetids((prev) => {
                          const next = new Set(prev);
                          selected ? next.delete(hta.netid!) : next.add(hta.netid!);
                          return next;
                        })}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: selected ? colors.statusPoorBg : 'transparent' }}
                      >
                        <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={16} color={selected ? colors.primary : colors.textFaint} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 13, color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '600' : '400' }}>
                          {hta.name ?? hta.netid}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}

          {/* TA picker */}
          {recipientType === 'specific-ta' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                Select TA{selectedTANetids.size > 0 ? ` (${selectedTANetids.size} selected)` : ''}
              </Text>
              <ScrollView style={{ maxHeight: 112, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 12 }}>
                {tas.length === 0 ? (
                  <Text style={{ padding: 12, color: colors.textFaint, fontSize: 13 }}>No TAs found.</Text>
                ) : (
                  tas.map((ta) => {
                    const selected = selectedTANetids.has(ta.netid!);
                    return (
                      <TouchableOpacity
                        key={ta.netid}
                        onPress={() => setSelectedTANetids((prev) => {
                          const next = new Set(prev);
                          selected ? next.delete(ta.netid!) : next.add(ta.netid!);
                          return next;
                        })}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: selected ? colors.statusPoorBg : 'transparent' }}
                      >
                        <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={16} color={selected ? colors.primary : colors.textFaint} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 13, color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '600' : '400' }}>
                          {ta.name ?? ta.netid}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}

          {/* Team picker */}
          {recipientType === 'specific-team' && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                Select Team{selectedTeamIds.size > 0 ? ` (${selectedTeamIds.size} selected)` : ''}
              </Text>
              <ScrollView style={{ maxHeight: 112, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginBottom: 12 }}>
                {teams.length === 0 ? (
                  <Text style={{ padding: 12, color: colors.textFaint, fontSize: 13 }}>No teams found.</Text>
                ) : (
                  teams.map((team) => {
                    const selected = team.id !== undefined && selectedTeamIds.has(team.id);
                    return (
                      <TouchableOpacity
                        key={team.id}
                        onPress={() => setSelectedTeamIds((prev) => {
                          if (team.id === undefined) return prev;
                          const next = new Set(prev);
                          selected ? next.delete(team.id) : next.add(team.id);
                          return next;
                        })}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: selected ? colors.statusPoorBg : 'transparent' }}
                      >
                        <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={16} color={selected ? colors.primary : colors.textFaint} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 13, color: selected ? colors.primary : colors.textSecondary, fontWeight: selected ? '600' : '400' }}>
                          {team.name}{team.section ? ` · Sec ${team.section}` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={submitting || !title.trim()}
            style={{ borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4, backgroundColor: title.trim() ? colors.primary : colors.border }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={{ fontWeight: '600', fontSize: 14, color: title.trim() ? colors.textInverse : colors.textFaint }}>
                Create Task
              </Text>
            )}
          </TouchableOpacity>
        </View>
  );



  const renderTaskItem = (g: typeof taskGroups[0]) => {
          const dateOnly = g.rep.dueDate ? g.rep.dueDate.split('T')[0] : null;
          const isEditing = editingId === g.rep.id;
          return (
            <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 12, borderWidth: isEditing ? 1.5 : 1, borderColor: isEditing ? colors.primary : colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 }}>{g.rep.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => {
                    if (isEditing) { setEditingId(null); return; }
                    setEditDraft({ title: g.rep.title, description: g.rep.description ?? '', dueDate: dateOnly ?? '' });
                    setEditingId(g.rep.id);
                  }}>
                    <Ionicons name={isEditing ? 'close-outline' : 'pencil-outline'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteGroup(g.ids)}>
                    <Ionicons name="trash-outline" size={16} color={colors.criticalBorder} />
                  </TouchableOpacity>
                </View>
              </View>

              {!isEditing && g.rep.description ? (
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{g.rep.description}</Text>
              ) : null}

              {/* Per-recipient status list */}
              {!isEditing && (() => {
                const assignees = g.ids.map((id) => myTasks.find((t) => t.id === id)).filter(Boolean) as typeof myTasks;
                if (assignees.length === 0) return null;
                const complete = assignees.filter((t) => t.status === 'COMPLETE');
                const pending = assignees.filter((t) => t.status !== 'COMPLETE');

                const todayStr = new Date().toISOString().split('T')[0];
                const renderRow = (list: typeof assignees, label: string, topMargin?: number) => (
                  <View style={{ marginTop: topMargin ?? 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>
                      {label} ({list.length})
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {list.map((t, i) => {
                        const status = (t.status ?? 'TODO') as TaskStatus;
                        const dueStr = t.dueDate ? t.dueDate.split('T')[0] : null;
                        const overdue = status !== 'COMPLETE' && !!dueStr && dueStr < todayStr;
                        const s = overdue
                          ? { bg: colors.statusPoorBg, border: colors.statusPoorBar, text: colors.statusPoorText }
                          : STATUS_STYLES[status];
                        const name = t.assignedToNetid ? (recipientNameMap[t.assignedToNetid] ?? t.assignedToNetid) : '?';
                        const isLast = i === list.length - 1;
                        return (
                          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 11, color: s.text, fontWeight: '500' }}>{name}</Text>
                            </View>
                            {!isLast && <Text style={{ fontSize: 11, color: colors.textFaint, marginLeft: 2 }}>,</Text>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );

                return (
                  <View style={{ marginTop: 6 }}>
                    {pending.length > 0 && renderRow(pending, 'Pending')}
                    {complete.length > 0 && renderRow(complete, 'Completed', pending.length > 0 ? 8 : 6)}
                  </View>
                );
              })()}

              {isEditing ? (
                <View style={{ marginTop: 8, gap: 6 }}>
                  <TextInput
                    value={editDraft.title}
                    onChangeText={(t) => setEditDraft((p) => ({ ...p, title: t }))}
                    placeholder="Title"
                    placeholderTextColor={colors.textFaint}
                    style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg }}
                  />
                  <TextInput
                    value={editDraft.description}
                    onChangeText={(t) => setEditDraft((p) => ({ ...p, description: t }))}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors.textFaint}
                    style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg }}
                  />
                  <View style={{ overflow: 'hidden' }}>
                    {Platform.OS === 'web'
                      ? React.createElement('input', {
                          type: 'date', value: editDraft.dueDate,
                          onChange: (e: any) => setEditDraft((p) => ({ ...p, dueDate: e.target.value })),
                          style: { border: `1px solid ${colors.inputBorder}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', color: colors.text, backgroundColor: colors.inputBg, display: 'block' },
                        })
                      : <TextInput
                          value={editDraft.dueDate}
                          onChangeText={(t) => setEditDraft((p) => ({ ...p, dueDate: t }))}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.textFaint}
                          style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.text, backgroundColor: colors.inputBg, alignSelf: 'stretch' }}
                        />
                    }
                  </View>
                  <TouchableOpacity
                    onPress={() => handleSaveEdit(g.ids)}
                    disabled={!editDraft.title.trim()}
                    style={{ backgroundColor: editDraft.title.trim() ? colors.primary : colors.border, borderRadius: 6, paddingVertical: 8, alignItems: 'center' }}
                  >
                    <Text style={{ color: editDraft.title.trim() ? colors.textInverse : colors.textFaint, fontSize: 13, fontWeight: '600' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {dateOnly && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Due: {dateOnly}</Text>}
                </>
              )}
            </View>
          );
  };

  const taskListPanel = (
    <View style={{ flex: isMobile ? undefined : 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
          {"Tasks I've Assigned"} ({taskGroups.length} task{taskGroups.length !== 1 ? 's' : ''})
        </Text>
      </View>
      {isMobile ? (
        // On mobile, use a plain View+map so items render inside the outer ScrollView
        <View style={{ padding: 12, gap: 8 }}>
          {taskGroups.length === 0 ? (
            <Text style={{ textAlign: 'center', color: colors.textFaint, marginTop: 32, marginBottom: 32, fontSize: 14 }}>
              No tasks assigned yet.
            </Text>
          ) : (
            taskGroups.map((g) => (
              <View key={String(g.rep.id)} style={{ marginBottom: 8 }}>
                {renderTaskItem(g)}
              </View>
            ))
          )}
        </View>
      ) : (
        <FlatList
          data={taskGroups}
          keyExtractor={(g) => String(g.rep.id)}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.textFaint, marginTop: 32, fontSize: 14 }}>
              No tasks assigned yet.
            </Text>
          }
          renderItem={({ item: g }) => renderTaskItem(g)}
        />
      )}
    </View>
  );

  const header = (
    <>
      <Text style={{ fontSize: isMobile ? 22 : 26, fontWeight: '700', color: colors.text, marginBottom: 2 }}>Assign Tasks</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 16, fontSize: 13 }}>
        {isHtaOrInstructor ? 'Assign tasks to TAs or Student Teams' : "Assign tasks to your Student Teams"}
      </Text>
    </>
  );

  if (isMobile) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: pad, paddingBottom: 24 }}>
        {header}
        {formPanel}
        {taskListPanel}
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: pad }}>
      {header}
      <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
        {formPanel}
        {taskListPanel}
      </View>
    </View>
  );
}