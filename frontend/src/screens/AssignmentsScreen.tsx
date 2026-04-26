import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeRole, UserSummary } from '../utils/auth';
import { getCurrentUser, getUserByNetid } from '../api/users';
import { getTasksAssignedTo, updateTaskStatus, TaskApiResponse, TaskStatus } from '../api/tasks';
import { getAnnouncements, createAnnouncement, Announcement } from '../api/announcements';

const roleLabel = (role?: string): string => {
  switch (normalizeRole(role)) {
    case 'Instructor': return 'Instructor';
    case 'HTA': return 'Head TA';
    case 'TA': return 'TA';
    default: return '';
  }
};

type FilterKey = 'All' | 'Overdue' | 'Upcoming' | 'No Date';

const today = () => new Date().toISOString().split('T')[0];

const stripDate = (dueDate: string) => dueDate.split('T')[0];

type DateLabelType = 'none' | 'overdue' | 'soon' | 'normal';
const getDateLabel = (dueDate?: string): { label: string; type: DateLabelType } => {
  if (!dueDate) return { label: 'No due date', type: 'none' };
  const dateOnly = stripDate(dueDate);
  const due = new Date(dateOnly);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (due < now) return { label: `Overdue · ${dateOnly}`, type: 'overdue' };
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 7) return { label: `Due in ${diff}d · ${dateOnly}`, type: 'soon' };
  return { label: `Due ${dateOnly}`, type: 'normal' };
};

interface Props {
  userRole?: string;
}

export default function AssignmentsScreen({ userRole }: Props) {
  const { colors } = useTheme();
  const isStaff = userRole === 'TA' || userRole === 'HTA' || userRole === 'Instructor';
  const [netid, setNetid] = useState<string | null>(null);
  const [, setRole] = useState<string>('Student');
  const [myTasks, setMyTasks] = useState<TaskApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [assignerMap, setAssignerMap] = useState<Record<string, UserSummary>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);
  const [showAnnounceForm, setShowAnnounceForm] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  useEffect(() => {
    getAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) return;
    setPostingAnnouncement(true);
    try {
      const created = await createAnnouncement(announcementText.trim());
      setAnnouncements(prev => [created, ...prev]);
      setAnnouncementText('');
      setShowAnnounceForm(false);
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to post announcement.');
      else Alert.alert('Error', 'Failed to post announcement.');
    } finally {
      setPostingAnnouncement(false);
    }
  };

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user?.netid) { setError('Could not load user.'); setLoading(false); return; }
      setNetid(user.netid);
      const r = normalizeRole(String(user.role));
      setRole(r);
      getTasksAssignedTo(user.netid).then((tasks) => {
        setMyTasks(tasks);
        const uniqueNetids = [...new Set(tasks.map((t) => t.assignedByNetid).filter(Boolean))] as string[];
        Promise.all(uniqueNetids.map((n) => getUserByNetid(n).then((u) => u ? [n, u] : null)))
          .then((results) => {
            const map: Record<string, UserSummary> = {};
            for (const r of results) { if (r) map[r[0] as string] = r[1] as UserSummary; }
            setAssignerMap(map);
          });
      }).catch(() => {}).finally(() => setLoading(false));
    }).catch(() => { setError('Could not load user.'); setLoading(false); });
  }, []);

  const displayedTasks = useMemo(() => {
    const t = today();
    const filtered = myTasks.filter((task) => {
      if (filter === 'All') return true;
      if (filter === 'No Date') return !task.dueDate;
      if (!task.dueDate) return false;
      if (filter === 'Overdue') return task.dueDate.split('T')[0] < t;
      if (filter === 'Upcoming') return task.dueDate.split('T')[0] >= t;
      return true;
    });
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [myTasks, filter]);

  const canUpdateStatus = true;

  const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string; label: string }> = {
    TODO:     { bg: colors.borderLight,      text: colors.textSecondary, border: colors.border,            label: 'To Do' },
    WIP:      { bg: colors.statusModerateBg, text: colors.statusModerateText, border: colors.statusModerateBar, label: 'In Progress' },
    COMPLETE: { bg: colors.statusGoodBg,     text: colors.statusGoodText,    border: colors.statusGoodBar,     label: 'Complete' },
  };
  const STATUS_CYCLE: TaskStatus[] = ['TODO', 'WIP', 'COMPLETE'];

  const dateColor: Record<DateLabelType, string> = {
    none: colors.textFaint,
    overdue: colors.criticalBorder,
    soon: colors.warningIcon,
    normal: colors.textMuted,
  };

  const handleUpdateStatus = async (taskId: number, status: TaskStatus) => {
    try {
      const updated = await updateTaskStatus(taskId, status);
      setMyTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: updated.status } : t));
    } catch { /* silent */ }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.criticalBorder }}>{error}</Text>
    </View>
  );

  const filterOptions: FilterKey[] = ['All', 'Upcoming', 'Overdue', 'No Date'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Tasks</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 16 }}>{netid}</Text>

      {/* Announcements */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setAnnouncementsExpanded(e => !e)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="megaphone-outline" size={15} color={colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              Announcements{announcements.length > 0 ? ` (${announcements.length})` : ''}
            </Text>
            <Ionicons name={announcementsExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textFaint} />
          </TouchableOpacity>
          {isStaff && (
            <TouchableOpacity
              onPress={() => { setShowAnnounceForm(v => !v); setAnnouncementText(''); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: showAnnounceForm ? colors.borderLight : colors.primary }}
            >
              <Ionicons name={showAnnounceForm ? 'close' : 'add'} size={13} color={showAnnounceForm ? colors.textSecondary : colors.textInverse} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: showAnnounceForm ? colors.textSecondary : colors.textInverse }}>
                {showAnnounceForm ? 'Cancel' : 'Post'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isStaff && showAnnounceForm && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.warningBorder, marginBottom: 8 }}>
            <TextInput
              value={announcementText}
              onChangeText={setAnnouncementText}
              placeholder="Write an announcement visible to all users..."
              placeholderTextColor={colors.textFaint}
              multiline
              style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg, minHeight: 72, textAlignVertical: 'top', marginBottom: 8 }}
            />
            <TouchableOpacity
              onPress={handlePostAnnouncement}
              disabled={postingAnnouncement || !announcementText.trim()}
              style={{ borderRadius: 8, paddingVertical: 9, alignItems: 'center', backgroundColor: announcementText.trim() ? colors.warningBg : colors.borderLight, borderWidth: 1, borderColor: announcementText.trim() ? colors.warningBorder : colors.border }}
            >
              {postingAnnouncement
                ? <ActivityIndicator size="small" color={colors.warningText} />
                : <Text style={{ fontSize: 13, fontWeight: '600', color: announcementText.trim() ? colors.warningText : colors.textFaint }}>Post Announcement</Text>}
            </TouchableOpacity>
          </View>
        )}

        {announcementsExpanded && (
          announcements.length > 0 ? (
            <View style={{ borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 10, overflow: 'hidden' }}>
              {announcements.map((a, i) => (
                <View key={a.id} style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.warningBorder, backgroundColor: colors.surface }}>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{a.message}</Text>
                  <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
                    {a.createdByName ?? a.createdByNetid} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: colors.textFaint, fontStyle: 'italic' }}>No active announcements.</Text>
          )
        )}
      </View>

      {/* Filters */}
      <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => setFilter(opt)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: filter === opt ? colors.primary : colors.borderLight,
            }}
          >
            <Text style={{ color: filter === opt ? colors.textInverse : colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayedTasks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: colors.textFaint, marginTop: 40, fontSize: 15 }}>
            No tasks found.
          </Text>
        }
        renderItem={({ item }) => {
          const { label, type } = getDateLabel(item.dueDate);
          const color = dateColor[type];
          const status = (item.status ?? 'TODO') as TaskStatus;
          const s = STATUS_STYLES[status];
          const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
          const todayStr = new Date().toISOString().split('T')[0];
          const dueStr = item.dueDate ? item.dueDate.split('T')[0] : null;
          const overdue = status !== 'COMPLETE' && !!dueStr && dueStr < todayStr;
          const borderColor = overdue ? colors.criticalBorder
            : status === 'COMPLETE' ? colors.statusGoodBar
            : status === 'WIP'      ? colors.statusModerateBar
            : colors.border;
          return (
            <View style={{
              backgroundColor: overdue ? colors.statusPoorBg : colors.surface, borderRadius: 10, padding: 16,
              borderWidth: 2, borderColor,
              shadowColor: overdue ? colors.criticalBorder : colors.shadow,
              shadowOpacity: overdue ? 0.3 : 0.06,
              shadowRadius: overdue ? 6 : 4,
              elevation: overdue ? 5 : 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 }}>
                  {item.title}
                </Text>
                {canUpdateStatus && (
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus(item.id, nextStatus)}
                    style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: s.text }}>{s.label}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {item.description ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{item.description}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="calendar-outline" size={13} color={color} style={{ marginRight: 4 }} />
                <Text style={{ color, fontSize: 12 }}>{label}</Text>
              </View>
              {item.assignedByNetid && (() => {
                const assigner = assignerMap[item.assignedByNetid];
                const rl = assigner ? roleLabel(String(assigner.role)) : '';
                const name = assigner?.name ?? item.assignedByNetid;
                return (
                  <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 4 }}>
                    From: {name}{rl ? ` (${rl})` : ''}
                  </Text>
                );
              })()}
            </View>
          );
        }}
      />
    </View>
  );
}
