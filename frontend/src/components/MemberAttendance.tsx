import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ViewStyle, ActivityIndicator } from "react-native";
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

type LocalStatus = "present" | "late" | "absent" | null;
type AttendanceTab = "class" | "ta_meeting";

const TABS: { key: AttendanceTab; label: string }[] = [
  { key: "class", label: "Class" },
  { key: "ta_meeting", label: "TA Meeting" },
];

const TAB_TO_TYPE: Record<AttendanceTab, AttendanceType> = {
  class: "LECTURE",
  ta_meeting: "MEETING",
};

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const STATUS_CONFIG = {
  present: { color: "#16a34a", label: "Present", icon: "checkmark-circle", apiStatus: "PRESENT" as AttendanceStatus },
  late:    { color: "#d97706", label: "Late",    icon: "time",             apiStatus: "LATE"    as AttendanceStatus },
  absent:  { color: "#dc2626", label: "Absent",  icon: "close-circle",     apiStatus: "ABSENT"  as AttendanceStatus },
};

const API_TO_LOCAL: Record<AttendanceStatus, LocalStatus> = {
  PRESENT: "present",
  LATE: "late",
  ABSENT: "absent",
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
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeTab, setActiveTab] = useState<AttendanceTab>("class");

  // Keyed by `${attendanceDate}_${type}` to distinguish LECTURE vs MEETING
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const getRecordKey = useCallback(
    (day: number) => `${getDateKey(day)}_${TAB_TO_TYPE[activeTab]}`,
    [getDateKey, activeTab]
  );

  const getDayStatus = (day: number): LocalStatus => {
    const r = records[getRecordKey(day)];
    return r ? API_TO_LOCAL[r.status] : null;
  };

  const handleSetStatus = async (status: LocalStatus) => {
    if (!selectedDay || readOnly) return;
    const dateKey = getDateKey(selectedDay);
    const recordKey = getRecordKey(selectedDay);
    const existing = records[recordKey];
    const type = TAB_TO_TYPE[activeTab];
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
          const created = await createAttendance(netid, dateKey, apiStatus, type);
          setRecords((prev) => ({ ...prev, [recordKey]: created }));
        }
      }
    } catch {
      // silently ignore — UI stays in previous state
    } finally {
      setSaving(false);
    }
  };

  const clearAttendance = async () => {
    if (readOnly) return;
    const type = TAB_TO_TYPE[activeTab];
    const toDelete = Object.entries(records).filter(([k]) => k.endsWith(`_${type}`));
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

  const counts = Object.entries(records)
    .filter(([k]) => k.endsWith(`_${TAB_TO_TYPE[activeTab]}`))
    .reduce(
      (acc, [, r]) => {
        const local = API_TO_LOCAL[r.status];
        if (local) acc[local] = (acc[local] || 0) + 1;
        return acc;
      },
      { present: 0, late: 0, absent: 0 } as Record<string, number>
    );

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleString("default", { month: "short", year: "numeric" });

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

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

  const CELL_W = containerWidth > 0 ? Math.floor((containerWidth - (readOnly ? 24 : 148)) / 7) : 0;
  const CELL_H = CELL_W > 0 ? Math.min(Math.round(CELL_W * 0.75), 44) : 0;

  return (
    <View
      style={[{ backgroundColor: "white", borderRadius: 12, marginBottom: 8, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }, style]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}>
        <Ionicons name="calendar-outline" size={16} color="#be123c" />
        <Text style={{ fontSize: 15, fontWeight: "600", marginLeft: 8, color: "#111827", flex: 1 }}>Member Attendance</Text>
        {saving && <ActivityIndicator size="small" color="#be123c" />}
      </View>

      <View style={{ padding: 12, flexDirection: "row", gap: 8 }}>
        {/* LEFT: Calendar */}
        <View style={{ flex: 1 }}>
          {/* Month Nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={14} color="#6b7280" />
            </TouchableOpacity>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={14} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          {CELL_W > 0 && (
            <View style={{ flexDirection: "row", marginBottom: 2 }}>
              {DAYS_OF_WEEK.map(d => (
                <View key={d} style={{ width: CELL_W, alignItems: "center" }}>
                  <Text style={{ fontSize: 10, color: "#9ca3af", fontWeight: "600" }}>{d}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Calendar Grid */}
          {loading ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator color="#be123c" />
            </View>
          ) : CELL_W > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {calendarCells.map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={{ width: CELL_W, height: CELL_H }} />;

                const status = getDayStatus(day);
                const isSelected = selectedDay === day;
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                const dotColor = status ? STATUS_CONFIG[status].color : null;

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={{ width: CELL_W, height: CELL_H, padding: 1 }}
                  >
                    <View style={{
                      flex: 1,
                      borderRadius: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: dotColor ?? "transparent",
                      borderWidth: (isSelected || isToday) ? 1 : 0,
                      borderColor: isSelected ? "#be123c" : "#9ca3af",
                    }}>
                      {isToday && (
                        <Text style={{ fontSize: 6, color: dotColor ? "white" : "#be123c", fontWeight: "700", lineHeight: 8 }}>
                          Today
                        </Text>
                      )}
                      <Text style={{
                        fontSize: 11,
                        color: dotColor ? "white" : isToday ? "#be123c" : "#374151",
                        fontWeight: isToday ? "700" : "500",
                      }}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Divider */}
        {!readOnly && <View style={{ width: 1, backgroundColor: "#E5E7EB", marginVertical: 2 }} />}

        {/* RIGHT: Tab switcher + status controls */}
        {!readOnly && (
          <View style={{ width: 112, gap: 6 }}>
            {/* Tab switcher */}
            <View style={{ flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" }}>
              {TABS.map((tab, i) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, paddingVertical: 6, alignItems: "center",
                      backgroundColor: isActive ? "#be123c" : "#F9FAFB",
                      borderRightWidth: i < TABS.length - 1 ? 1 : 0,
                      borderRightColor: "#E5E7EB",
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "600", color: isActive ? "white" : "#6b7280" }} numberOfLines={1} adjustsFontSizeToFit>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status controls */}
            {selectedDay ? (
              <>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151", textAlign: "center" }}>
                  {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("default", { month: "short", day: "numeric" })}
                </Text>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                  const isActive = selectedStatus === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleSetStatus(isActive ? null : key as LocalStatus)}
                      disabled={saving}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 6,
                        paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1,
                        backgroundColor: isActive ? val.color : "#F9FAFB",
                        borderColor: isActive ? val.color : "#E5E7EB",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <Ionicons name={val.icon as any} size={12} color={isActive ? "#fff" : val.color} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? "white" : "#374151" }}>
                        {val.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => handleSetStatus(null)}
                  disabled={saving}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", opacity: saving ? 0.6 : 1 }}
                >
                  <Ionicons name="trash-outline" size={12} color="#9ca3af" />
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#9ca3af" }}>Clear</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ alignItems: "center", marginTop: 12 }}>
                <Ionicons name="finger-print-outline" size={22} color="#d1d5db" />
                <Text style={{ color: "#d1d5db", textAlign: "center", marginTop: 4, fontSize: 9 }}>
                  Tap a date to mark
                </Text>
              </View>
            )}

            {/* Clear whole calendar */}
            <TouchableOpacity
              onPress={clearAttendance}
              disabled={saving}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", opacity: saving ? 0.6 : 1, marginTop: "auto" }}
            >
              <Ionicons name="trash-outline" size={10} color="#9ca3af" />
              <Text style={{ fontSize: 9, fontWeight: "600", color: "#9ca3af" }}>Clear calendar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Summary counts */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <View key={key} style={{ alignItems: "center" }}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: val.color }}>{counts[key] ?? 0}</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>{val.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
