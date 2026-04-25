import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, TextInput,
  Pressable, ActivityIndicator, useWindowDimensions, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  CalendarEvent, CalendarEventType,
  getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  toggleCalendarEventComplete,
} from '../api/calendar';
import { getTasksAssignedTo, TaskApiResponse } from '../api/tasks';
import axiosInstance from '../api/client';

// ── helpers ───────────────────────────────────────────────────────────────────

function padDate(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
}
function formatTime(t?: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}
function to24h(t: string): string {
  // Pass through if already HH:MM or HH:MM:SS
  if (/^\d{2}:\d{2}/.test(t)) return t;
  return t;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildGrid(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { date: Date; curr: boolean }[] = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), curr: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), curr: true });
  let next = 1;
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, next++), curr: false });
  return cells;
}

// ── unified event type shown in the UI ────────────────────────────────────────

type DisplayEvent =
  | { kind: 'calendar'; event: CalendarEvent }
  | { kind: 'task';     task: TaskApiResponse }
  | { kind: 'semester'; date: string };

const EVENT_TYPE_META: Record<string, { color: string; icon: string; label: string }> = {
  PERSONAL:  { color: '#3b82f6', icon: 'person-circle-outline',    label: 'Personal'  },
  REMINDER:  { color: '#f59e0b', icon: 'notifications-outline',    label: 'Reminder'  },
  MEETING:   { color: '#10b981', icon: 'people-outline',           label: 'Meeting'   },
  OTHER:     { color: '#8b5cf6', icon: 'ellipse-outline',          label: 'Other'     },
  TASK:      { color: '#f97316', icon: 'checkmark-circle-outline', label: 'Task Due'  },
  SEMESTER:  { color: '#eab308', icon: 'school-outline',           label: 'Semester'  },
};

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  netid: string;
}

const EVENT_TYPES: CalendarEventType[] = ['PERSONAL', 'REMINDER', 'MEETING', 'OTHER'];

export default function CalendarModal({ visible, onClose, netid }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const today = new Date();
  const todayStr = toDateStr(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskApiResponse[]>([]);
  const [semesterStart, setSemesterStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // form
  const [formMode, setFormMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formType, setFormType] = useState<CalendarEventType>('PERSONAL');
  const [formDesc, setFormDesc] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  // ── data loading ─────────────────────────────────────────────────────────────

  const loadEvents = useCallback(() => {
    if (!visible) return;
    let cancelled = false;
    const start = toDateStr(new Date(viewYear, viewMonth, 1));
    const end   = toDateStr(new Date(viewYear, viewMonth + 1, 0));
    setLoading(true);
    getCalendarEvents(start, end)
      .then(data => { if (!cancelled) setEvents(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, viewYear, viewMonth]);

  useEffect(() => { return loadEvents(); }, [loadEvents]);

  useEffect(() => {
    if (!visible || !netid) return;
    let cancelled = false;
    getTasksAssignedTo(netid).then(d => { if (!cancelled) setTasks(d); }).catch(() => {});
    axiosInstance.get('/api/settings/semester-start')
      .then(r => { if (!cancelled && r.data?.semesterStartDate) setSemesterStart(r.data.semesterStartDate); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [visible, netid]);

  // ── derived event map ─────────────────────────────────────────────────────────

  const dayMap = useMemo(() => {
    const map: Record<string, DisplayEvent[]> = {};

    const add = (key: string, e: DisplayEvent) => {
      if (!map[key]) map[key] = [];
      map[key].push(e);
    };

    events.forEach(e => add(e.eventDate, { kind: 'calendar', event: e }));

    tasks.forEach(t => {
      if (t.dueDate) {
        const d = t.dueDate.split('T')[0];
        add(d, { kind: 'task', task: t });
      }
    });

    if (semesterStart) add(semesterStart, { kind: 'semester', date: semesterStart });

    return map;
  }, [events, tasks, semesterStart]);

  // ── month navigation ──────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // ── form helpers ──────────────────────────────────────────────────────────────

  const openAdd = (date: string) => {
    setEditTarget(null);
    setFormTitle(''); setFormDate(date); setFormTime('');
    setFormType('PERSONAL'); setFormDesc('');
    setTypeOpen(false);
    setFormMode('add');
  };

  const openEdit = (e: CalendarEvent) => {
    setEditTarget(e);
    setFormTitle(e.title);
    setFormDate(e.eventDate);
    setFormTime(e.eventTime ? e.eventTime.slice(0, 5) : '');
    setFormType(e.eventType as CalendarEventType);
    setFormDesc(e.description ?? '');
    setTypeOpen(false);
    setFormMode('edit');
  };

  const cancelForm = () => { setFormMode('none'); setEditTarget(null); };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDate) return;
    setFormSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        eventDate: formDate,
        eventTime: formTime ? to24h(formTime) : undefined,
        eventType: formType,
      };
      if (formMode === 'edit' && editTarget) {
        const updated = await updateCalendarEvent(editTarget.id, payload);
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      } else {
        const created = await createCalendarEvent(payload);
        setEvents(prev => [...prev, created]);
      }
      setFormMode('none');
      setEditTarget(null);
    } catch {
      Alert.alert('Error', 'Failed to save event.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (e: CalendarEvent) => {
    const ok = typeof window !== 'undefined' ? window.confirm('Delete this event?') : true;
    if (!ok) return;
    try {
      await deleteCalendarEvent(e.id);
      setEvents(prev => prev.filter(x => x.id !== e.id));
    } catch {
      Alert.alert('Error', 'Failed to delete event.');
    }
  };

  const handleToggleComplete = async (e: CalendarEvent) => {
    try {
      const updated = await toggleCalendarEventComplete(e.id);
      setEvents(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      Alert.alert('Error', 'Failed to update event.');
    }
  };

  // ── grid ──────────────────────────────────────────────────────────────────────

  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedEvents: DisplayEvent[] = dayMap[selectedDate] ?? [];

  // ── render helpers ────────────────────────────────────────────────────────────

  const cellSize = isMobile ? Math.floor((width - 64) / 7) : 52;

  const renderEventItem = (item: DisplayEvent, idx: number) => {
    if (item.kind === 'semester') {
      const meta = EVENT_TYPE_META.SEMESTER;
      return (
        <View key={`sem-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Ionicons name={meta.icon as any} size={16} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Semester Start</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{meta.label}</Text>
          </View>
        </View>
      );
    }

    if (item.kind === 'task') {
      const meta = EVENT_TYPE_META.TASK;
      const t = item.task;
      return (
        <View key={`task-${t.id}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: meta.color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Ionicons name={meta.icon as any} size={16} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{t.title}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{meta.label} · {t.status}</Text>
          </View>
        </View>
      );
    }

    const e = item.event;
    const meta = EVENT_TYPE_META[e.eventType] ?? EVENT_TYPE_META.PERSONAL;
    return (
      <View key={`cal-${e.id}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight, opacity: e.completed ? 0.6 : 1 }}>
        <TouchableOpacity
          onPress={() => handleToggleComplete(e)}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: e.completed ? '#22c55e22' : meta.color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
        >
          <Ionicons
            name={e.completed ? 'checkmark-circle' : meta.icon as any}
            size={16}
            color={e.completed ? '#22c55e' : meta.color}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textDecorationLine: e.completed ? 'line-through' : 'none' }} numberOfLines={1}>{e.title}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>
            {meta.label}{e.eventTime ? ` · ${formatTime(e.eventTime)}` : ''}{e.completed ? ' · Done' : ''}
          </Text>
          {!!e.description && (
            <Text style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }} numberOfLines={2}>{e.description}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
          {!e.completed && (
            <TouchableOpacity onPress={() => openEdit(e)} style={{ padding: 4 }}>
              <Ionicons name="pencil-outline" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(e)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={15} color={colors.statusPoorBar} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderForm = () => (
    <View style={{ marginTop: 12, backgroundColor: colors.background, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.borderMedium }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
        {formMode === 'edit' ? 'Edit Event' : 'New Event'}
      </Text>

      <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 3 }}>Title *</Text>
      <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 7, marginBottom: 10 }}>
        <TextInput
          style={{ padding: 9, fontSize: 13, color: colors.text }}
          placeholder="Event title..."
          placeholderTextColor={colors.textFaint}
          value={formTitle}
          onChangeText={setFormTitle}
          maxLength={255}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 3 }}>Date *</Text>
          <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 7 }}>
            <TextInput
              style={{ padding: 9, fontSize: 13, color: colors.text }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textFaint}
              value={formDate}
              onChangeText={setFormDate}
              maxLength={10}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 3 }}>Time (optional)</Text>
          <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 7 }}>
            <TextInput
              style={{ padding: 9, fontSize: 13, color: colors.text }}
              placeholder="HH:MM"
              placeholderTextColor={colors.textFaint}
              value={formTime}
              onChangeText={setFormTime}
              maxLength={5}
            />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 3 }}>Type</Text>
      <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 7, marginBottom: 10, overflow: 'hidden' }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9 }}
          onPress={() => setTypeOpen(v => !v)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: EVENT_TYPE_META[formType]?.color ?? '#3b82f6' }} />
            <Text style={{ fontSize: 13, color: colors.text }}>{EVENT_TYPE_META[formType]?.label ?? formType}</Text>
          </View>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        {typeOpen && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            {EVENT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9 }}
                onPress={() => { setFormType(t); setTypeOpen(false); }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: EVENT_TYPE_META[t].color }} />
                <Text style={{ fontSize: 13, color: colors.text }}>{EVENT_TYPE_META[t].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 3 }}>Description (optional)</Text>
      <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 7, marginBottom: 14 }}>
        <TextInput
          style={{ padding: 9, fontSize: 13, color: colors.text, height: 64, textAlignVertical: 'top' }}
          placeholder="Optional notes..."
          placeholderTextColor={colors.textFaint}
          multiline
          value={formDesc}
          onChangeText={setFormDesc}
          maxLength={500}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!formTitle.trim() || !formDate || formSaving}
          style={{ flex: 1, backgroundColor: (!formTitle.trim() || !formDate) ? colors.borderMedium : colors.primary, borderRadius: 7, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
        >
          {formSaving && <ActivityIndicator size="small" color={colors.textInverse} />}
          <Text style={{ color: colors.textInverse, fontSize: 13, fontWeight: '600' }}>
            {formMode === 'edit' ? 'Save Changes' : 'Add Event'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={cancelForm}
          style={{ flex: 1, backgroundColor: colors.borderLight, borderRadius: 7, paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── main render ───────────────────────────────────────────────────────────────

  const cardWidth = isMobile ? width - 24 : Math.min(700, width - 48);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: cardWidth,
            maxHeight: isMobile ? '94%' : '88%',
            backgroundColor: colors.surface,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 12,
          }}
          onPress={e => e.stopPropagation()}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ ...(Platform.OS === 'web' ? { overflow: 'auto' } as object : {}) }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginLeft: 8, flex: 1 }}>My Calendar</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: isMobile ? 12 : 18 }}>
              {/* Month navigation */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                {DAY_HEADERS.map(d => (
                  <View key={d} style={{ width: cellSize, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textFaint }}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              {loading ? (
                <View style={{ height: cellSize * 6, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {grid.map(({ date, curr }, i) => {
                    const ds = toDateStr(date);
                    const isToday = ds === todayStr;
                    const isSelected = ds === selectedDate;
                    const dayEvts = dayMap[ds] ?? [];
                    const count = dayEvts.length;

                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => { setSelectedDate(ds); setFormMode('none'); }}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 6,
                          backgroundColor: isSelected ? colors.primary + '22' : 'transparent',
                          borderWidth: isSelected ? 1.5 : 0,
                          borderColor: isSelected ? colors.primary : 'transparent',
                        }}
                      >
                        {/* Day number */}
                        <View style={{
                          width: cellSize * 0.62,
                          height: cellSize * 0.62,
                          borderRadius: cellSize * 0.31,
                          backgroundColor: isToday ? colors.primary : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{
                            fontSize: isMobile ? 12 : 13,
                            fontWeight: isToday ? '700' : curr ? '500' : '400',
                            color: isToday ? colors.textInverse : curr ? colors.text : colors.textFaint,
                          }}>
                            {date.getDate()}
                          </Text>
                        </View>

                        {/* Event count badge */}
                        {count > 0 && (
                          <View style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            minWidth: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: colors.criticalBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 2,
                          }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textInverse }}>
                              {count > 9 ? '9+' : count}
                            </Text>
                          </View>
                        )}

                        {/* Colored event type dots (up to 3) */}
                        {count > 0 && (
                          <View style={{ flexDirection: 'row', gap: 2, position: 'absolute', bottom: 3 }}>
                            {dayEvts.slice(0, 3).map((de, di) => {
                              const type = de.kind === 'calendar' ? de.event.eventType
                                : de.kind === 'task' ? 'TASK' : 'SEMESTER';
                              return (
                                <View
                                  key={di}
                                  style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: EVENT_TYPE_META[type]?.color ?? '#3b82f6' }}
                                />
                              );
                            })}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />

              {/* Selected day header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                {formMode === 'none' && (
                  <TouchableOpacity
                    onPress={() => openAdd(selectedDate)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + '1a', borderWidth: 1, borderColor: colors.primary + '40' }}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Event list for selected day */}
              {formMode === 'none' && (
                selectedEvents.length === 0 ? (
                  <Text style={{ fontSize: 13, color: colors.textFaint, textAlign: 'center', paddingVertical: 16 }}>
                    No events scheduled
                  </Text>
                ) : (
                  <View>
                    {selectedEvents.map((e, i) => renderEventItem(e, i))}
                  </View>
                )
              )}

              {/* Add / Edit form */}
              {(formMode === 'add' || formMode === 'edit') && renderForm()}

              {/* Legend */}
              {formMode === 'none' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                  {Object.entries(EVENT_TYPE_META).map(([key, meta]) => (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                      <Text style={{ fontSize: 10, color: colors.textFaint }}>{meta.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
