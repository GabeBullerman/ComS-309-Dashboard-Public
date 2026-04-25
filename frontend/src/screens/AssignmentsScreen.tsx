import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { normalizeRole, UserSummary } from '../utils/auth';
import { getCurrentUser, getUserByNetid } from '../api/users';
import { getTasksAssignedTo, updateTaskStatus, TaskApiResponse, TaskStatus } from '../api/tasks';
import { getAnnouncements, Announcement } from '../api/announcements';

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

export default function AssignmentsScreen() {
  const { colors } = useTheme();
  const [netid, setNetid] = useState<string | null>(null);
  const [, setRole] = useState<string>('Student');
  const [myTasks, setMyTasks] = useState<TaskApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [assignerMap, setAssignerMap] = useState<Record<string, UserSummary>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);

  useEffect(() => {
    getAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

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
      {announcements.length > 0 && (
        <View style={{ marginBottom: 16, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 10, overflow: 'hidden' }}>
          <TouchableOpacity
            onPress={() => setAnnouncementsExpanded(e => !e)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.warningBg }}
          >
            <Ionicons name="megaphone-outline" size={16} color={colors.warningText} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.warningText }}>
              Announcements ({announcements.length})
            </Text>
            <Ionicons name={announcementsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.warningText} />
          </TouchableOpacity>
          {announcementsExpanded && announcements.map((a, i) => (
            <View
              key={a.id}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.warningBorder, backgroundColor: colors.surface }}
            >
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{a.message}</Text>
              <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 4 }}>
                {a.createdByName ?? a.createdByNetid} · {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

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
