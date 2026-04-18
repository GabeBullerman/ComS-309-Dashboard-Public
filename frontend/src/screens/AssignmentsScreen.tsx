import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeRole, UserSummary } from '../utils/auth';
import { getCurrentUser, getUserByNetid } from '../api/users';
import { getTasksAssignedTo, updateTaskStatus, TaskApiResponse, TaskStatus } from '../api/tasks';

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

const getDateLabel = (dueDate?: string): { label: string; color: string } => {
  if (!dueDate) return { label: 'No due date', color: '#9ca3af' };
  const dateOnly = stripDate(dueDate);
  const due = new Date(dateOnly);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (due < now) return { label: `Overdue · ${dateOnly}`, color: '#DC2626' };
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 7) return { label: `Due in ${diff}d · ${dateOnly}`, color: '#D97706' };
  return { label: `Due ${dateOnly}`, color: '#6B7280' };
};

export default function AssignmentsScreen() {
  const [netid, setNetid] = useState<string | null>(null);
  const [, setRole] = useState<string>('Student');
  const [myTasks, setMyTasks] = useState<TaskApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('All');
  const [assignerMap, setAssignerMap] = useState<Record<string, UserSummary>>({});
  const [userRole, setUserRole] = useState<string>('Student');

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user?.netid) { setError('Could not load user.'); setLoading(false); return; }
      setNetid(user.netid);
      const r = normalizeRole(String(user.role));
      setRole(r);
      setUserRole(r);
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

  const canUpdateStatus = userRole === 'TA' || userRole === 'HTA';

  const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string; label: string }> = {
    TODO:     { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', label: 'To Do' },
    WIP:      { bg: '#fef9c3', text: '#92400e', border: '#fde047', label: 'In Progress' },
    COMPLETE: { bg: '#dcfce7', text: '#166534', border: '#86efac', label: 'Complete' },
  };
  const STATUS_CYCLE: TaskStatus[] = ['TODO', 'WIP', 'COMPLETE'];

  const handleUpdateStatus = async (taskId: number, status: TaskStatus) => {
    try {
      const updated = await updateTaskStatus(taskId, status);
      setMyTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: updated.status } : t));
    } catch { /* silent */ }
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#C8102E" />
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#DC2626' }}>{error}</Text>
    </View>
  );

  const filterOptions: FilterKey[] = ['All', 'Upcoming', 'Overdue', 'No Date'];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f7fa', padding: 24 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#1e3a8a', marginBottom: 4 }}>Tasks</Text>
      <Text style={{ color: '#64748b', marginBottom: 16 }}>{netid}</Text>

      {/* Filters */}
      <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
        {filterOptions.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => setFilter(opt)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: filter === opt ? '#1e3a8a' : '#e5e7eb',
            }}
          >
            <Text style={{ color: filter === opt ? 'white' : '#374151', fontSize: 13, fontWeight: '500' }}>
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
          <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 }}>
            No tasks found.
          </Text>
        }
        renderItem={({ item }) => {
          const { label, color } = getDateLabel(item.dueDate);
          const status = (item.status ?? 'TODO') as TaskStatus;
          const s = STATUS_STYLES[status];
          const nextStatus = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
          return (
            <View style={{
              backgroundColor: 'white', borderRadius: 10, padding: 16,
              borderLeftWidth: 4, borderLeftColor: '#C8102E',
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 8 }}>
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
                <Text style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{item.description}</Text>
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
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                    From: {rl ? `${rl} ` : ''}{name}
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
