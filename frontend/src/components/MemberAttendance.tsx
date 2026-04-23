import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ViewStyle, ActivityIndicator, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceType,
  getAttendanceForStudent,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from "@/api/attendance";
import { useTheme } from '../contexts/ThemeContext';

type LocalStatus = "present" | "late" | "absent" | "excused" | null;
type CalendarView = "all" | "class" | "ta_meeting";

const VIEW_LABELS: Record<CalendarView, string> = {
  all: "All",
  class: "Class",
  ta_meeting: "TA Meeting",
};

const TYPE_MAP: Record<"class" | "ta_meeting", AttendanceType> = {
  class: "LECTURE",
  ta_meeting: "MEETING",
};

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const STATUS_CONFIG = {
  present: { color: "#16a34a", label: "Present", icon: "checkmark-circle",      apiStatus: "PRESENT" as AttendanceStatus },
  late:    { color: "#d97706", label: "Late",    icon: "time",                   apiStatus: "LATE"    as AttendanceStatus },
  absent:  { color: "#dc2626", label: "Absent",  icon: "close-circle",           apiStatus: "ABSENT"  as AttendanceStatus },
  excused: { color: "#2563eb", label: "Excused", icon: "shield-checkmark",       apiStatus: "EXCUSED" as AttendanceStatus },
};

const API_TO_LOCAL: Record<AttendanceStatus, LocalStatus> = {
  PRESENT: "present",
  LATE: "late",
  ABSENT: "absent",
  EXCUSED: "excused",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface Props {
  netid: string;
  readOnly?: boolean;
  style?: ViewStyle;
}

export default function MemberAttendance({ netid, readOnly = false, style }: Props) {
  const { colors } = useTheme();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [calendarView, setCalendarView] = useState<CalendarView>("all");
  const [editType, setEditType] = useState<"class" | "ta_meeting">("class");

  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0, w: 0 });
  const menuRef = useRef<View>(null);

  useEffect(() => {
    if (!netid) return;
    setLoading(true);
    getAttendanceForStudent(netid)
      .then((data) => {
        const map: Record<string, AttendanceRecord> = {};
        for (const r of data) map[`${r.attendanceDate}_${r.type}`] = r;
        setRecords(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [netid]);

  const getDateKey = useCallback(
    (day: number) => toDateKey(currentYear, currentMonth, day),
    [currentYear, currentMonth]
  );

  // The type being operated on (for editing)
  const activeSubtype: "class" | "ta_meeting" = calendarView === "all" ? editType : calendarView as "class" | "ta_meeting";
  const activeApiType = TYPE_MAP[activeSubtype];

  const getRecordKey = useCallback(
    (day: number, subtype: "class" | "ta_meeting" = activeSubtype) =>
      `${getDateKey(day)}_${TYPE_MAP[subtype]}`,
    [getDateKey, activeSubtype]
  );

  const getDayStatus = (day: number): LocalStatus => {
    const r = records[getRecordKey(day)];
    return r ? API_TO_LOCAL[r.status] : null;
  };

  const getDayStatuses = (day: number) => ({
    lecture: records[`${getDateKey(day)}_LECTURE`]
      ? API_TO_LOCAL[records[`${getDateKey(day)}_LECTURE`].status]
      : null,
    meeting: records[`${getDateKey(day)}_MEETING`]
      ? API_TO_LOCAL[records[`${getDateKey(day)}_MEETING`].status]
      : null,
  });

  const handleSetStatus = async (status: LocalStatus) => {
    if (!selectedDay || readOnly) return;
    const dateKey = getDateKey(selectedDay);
    const recordKey = getRecordKey(selectedDay);
    const existing = records[recordKey];
    setSaving(true);
    try {
      if (!status) {
        if (existing) {
          await deleteAttendance(existing.id);
          setRecords((prev) => { const next = { ...prev }; delete next[recordKey]; return next; });
        }
      } else {
        const apiStatus = STATUS_CONFIG[status].apiStatus;
        if (existing) {
          const updated = await updateAttendance(existing.id, netid, dateKey, apiStatus, existing.type);
          setRecords((prev) => ({ ...prev, [recordKey]: updated }));
        } else {
          const created = await createAttendance(netid, dateKey, apiStatus, activeApiType);
          setRecords((prev) => ({ ...prev, [recordKey]: created }));
        }
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const clearAttendance = async () => {
    if (readOnly) return;
    const toDelete = Object.entries(records).filter(([k]) => k.endsWith(`_${activeApiType}`));
    setSaving(true);
    try {
      await Promise.all(toDelete.map(([, r]) => deleteAttendance(r.id)));
      setRecords((prev) => {
        const next = { ...prev };
        toDelete.forEach(([k]) => delete next[k]);
        return next;
      });
    } catch {} finally {
      setSaving(false);
    }
  };

  const selectedStatus = selectedDay ? getDayStatus(selectedDay) : null;

  // Summary counts
  const makeCounts = (type: AttendanceType) =>
    Object.entries(records)
      .filter(([k]) => k.endsWith(`_${type}`))
      .reduce(
        (acc, [, r]) => {
          const local = API_TO_LOCAL[r.status];
          if (local) acc[local] = (acc[local] || 0) + 1;
          return acc;
        },
        { present: 0, late: 0, absent: 0, excused: 0 } as Record<string, number>
      );

  const lectureCounts = makeCounts("LECTURE");
  const meetingCounts = makeCounts("MEETING");
  const counts = calendarView === "class" ? lectureCounts
    : calendarView === "ta_meeting" ? meetingCounts
    : { present: lectureCounts.present + meetingCounts.present, late: lectureCounts.late + meetingCounts.late, absent: lectureCounts.absent + meetingCounts.absent, excused: lectureCounts.excused + meetingCounts.excused };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleString("default", { month: "short", year: "numeric" });

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  };

  const allCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) allCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) allCells.push(d);
  while (allCells.length % 7 !== 0) allCells.push(null);
  const calendarRows: (number | null)[][] = [];
  for (let i = 0; i < allCells.length; i += 7) calendarRows.push(allCells.slice(i, i + 7));

  const CELL_H = 36;

  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, overflow: "hidden", shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }, style]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={{ fontSize: 15, fontWeight: "600", marginLeft: 8, color: colors.text, flex: 1 }}>Member Attendance</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
        <TouchableOpacity
          ref={menuRef}
          onPress={() => menuRef.current?.measure((_fx, _fy, w, h, px, py) => { setMenuPos({ x: px, y: py + h, w }); setMenuOpen(true); })}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary }}>{VIEW_LABELS[calendarView]}</Text>
          <Ionicons name="chevron-down" size={10} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* View dropdown menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)}>
          <View style={{ position: "absolute", top: menuPos.y + 4, left: Math.max(4, menuPos.x + menuPos.w - 130), minWidth: 130, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, elevation: 8, shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 6, overflow: "hidden" }}>
            {(["all", "class", "ta_meeting"] as CalendarView[]).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => { setCalendarView(v); setMenuOpen(false); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: v !== "ta_meeting" ? 1 : 0, borderBottomColor: colors.borderLight, backgroundColor: calendarView === v ? colors.statusPoorBg : colors.surface }}
              >
                <Text style={{ fontSize: 13, color: calendarView === v ? colors.statusPoorText : colors.textSecondary, fontWeight: calendarView === v ? "600" : "400" }}>
                  {VIEW_LABELS[v]}
                </Text>
                {calendarView === v && <Ionicons name="checkmark" size={14} color={colors.statusPoorText} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <View style={{ padding: 12, flexDirection: "row", gap: 8 }}>
        {/* LEFT: Calendar */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 2 }}>
            {DAYS_OF_WEEK.map(d => (
              <View key={d} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: colors.textFaint, fontWeight: "600" }}>{d}</Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={{ gap: 2 }}>
              {calendarRows.map((row, ri) => (
                <View key={`row-${ri}`} style={{ flexDirection: "row" }}>
                  {row.map((day, ci) => {
                    if (!day) return <View key={`empty-${ri}-${ci}`} style={{ flex: 1, height: CELL_H }} />;

                    const isSelected = selectedDay === day;
                    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                    if (calendarView === "all") {
                      const { lecture, meeting } = getDayStatuses(day);
                      return (
                        <TouchableOpacity key={day} onPress={() => setSelectedDay(day)} style={{ flex: 1, height: CELL_H, padding: 1 }}>
                          <View style={{
                            flex: 1, borderRadius: 4, alignItems: "center", justifyContent: "center",
                            borderWidth: (isSelected || isToday) ? 1 : 0,
                            borderColor: isSelected ? colors.primary : colors.textFaint,
                            backgroundColor: "transparent",
                          }}>
                            <Text style={{ fontSize: 11, color: isToday ? colors.primary : colors.textSecondary, fontWeight: isToday ? "700" : "500", lineHeight: 14 }}>
                              {day}
                            </Text>
                            <View style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: lecture ? STATUS_CONFIG[lecture].color : colors.border }} />
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meeting ? STATUS_CONFIG[meeting].color : colors.border }} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }

                    const status = getDayStatus(day);
                    const dotColor = status ? STATUS_CONFIG[status].color : null;
                    return (
                      <TouchableOpacity key={day} onPress={() => setSelectedDay(day)} style={{ flex: 1, height: CELL_H, padding: 1 }}>
                        <View style={{
                          flex: 1, borderRadius: 4, alignItems: "center", justifyContent: "center",
                          backgroundColor: dotColor ?? "transparent",
                          borderWidth: (isSelected || isToday) ? 1 : 0,
                          borderColor: isSelected ? colors.primary : colors.textFaint,
                        }}>
                          {isToday && (
                            <Text style={{ fontSize: 6, color: dotColor ? colors.textInverse : colors.primary, fontWeight: "700", lineHeight: 8 }}>Today</Text>
                          )}
                          <Text style={{ fontSize: 11, color: dotColor ? colors.textInverse : isToday ? colors.primary : colors.textSecondary, fontWeight: isToday ? "700" : "500" }}>
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Divider */}
        {!readOnly && <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 2 }} />}

        {/* RIGHT: Controls */}
        {!readOnly && (
          <View style={{ width: 112, gap: 6 }}>
            {calendarView === "all" && (
              <View style={{ flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                {(["class", "ta_meeting"] as const).map((t, i) => {
                  const isActive = editType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setEditType(t)}
                      style={{ flex: 1, paddingVertical: 5, alignItems: "center", backgroundColor: isActive ? colors.primary : colors.background, borderRightWidth: i === 0 ? 1 : 0, borderRightColor: colors.border }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "600", color: isActive ? colors.textInverse : colors.textMuted }} numberOfLines={1} adjustsFontSizeToFit>
                        {t === "class" ? "Class" : "Meeting"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {selectedDay ? (
              <>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, textAlign: "center" }}>
                  {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("default", { month: "short", day: "numeric" })}
                </Text>
                {calendarView === "all" && (() => {
                  const { lecture, meeting } = getDayStatuses(selectedDay);
                  return (
                    <View style={{ gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: lecture ? STATUS_CONFIG[lecture].color : colors.border }} />
                        <Text style={{ fontSize: 9, color: colors.textFaint }}>Class: {lecture ?? "—"}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meeting ? STATUS_CONFIG[meeting].color : colors.border }} />
                        <Text style={{ fontSize: 9, color: colors.textFaint }}>Meeting: {meeting ?? "—"}</Text>
                      </View>
                    </View>
                  );
                })()}
                {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                  const isActive = selectedStatus === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleSetStatus(isActive ? null : key as LocalStatus)}
                      disabled={saving}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, backgroundColor: isActive ? val.color : colors.background, borderColor: isActive ? val.color : colors.border, opacity: saving ? 0.6 : 1 }}
                    >
                      <Ionicons name={val.icon as any} size={12} color={isActive ? colors.textInverse : val.color} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? colors.textInverse : colors.textSecondary }}>{val.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => handleSetStatus(null)}
                  disabled={saving}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, backgroundColor: colors.background, borderColor: colors.border, opacity: saving ? 0.6 : 1 }}
                >
                  <Ionicons name="trash-outline" size={12} color={colors.textFaint} />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textFaint }}>Clear day</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: "center", marginTop: 12 }}>
                <Ionicons name="finger-print-outline" size={22} color={colors.borderMedium} />
                <Text style={{ color: colors.borderMedium, textAlign: "center", marginTop: 4, fontSize: 9 }}>Tap a date to mark</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={clearAttendance}
              disabled={saving}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, opacity: saving ? 0.6 : 1, marginTop: "auto" }}
            >
              <Ionicons name="trash-outline" size={10} color={colors.textFaint} />
              <Text style={{ fontSize: 9, fontWeight: "600", color: colors.textFaint }}>Clear calendar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Summary counts */}
      {calendarView === "all" ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, paddingVertical: 8, paddingHorizontal: 12, gap: 4 }}>
          {([["Class", lectureCounts], ["Meeting", meetingCounts]] as [string, Record<string, number>][]).map(([label, c]) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 10, color: colors.textFaint, width: 46 }}>{label}</Text>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: val.color }} />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: val.color }}>{c[key] ?? 0}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <View key={key} style={{ alignItems: "center" }}>
              <Text style={{ fontWeight: "700", fontSize: 16, color: val.color }}>{counts[key] ?? 0}</Text>
              <Text style={{ fontSize: 12, color: colors.textFaint }}>{val.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
