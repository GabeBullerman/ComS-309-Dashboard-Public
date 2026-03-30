import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AttendanceStatus = "present" | "late" | "absent" | null;

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const STATUS_CONFIG = {
  present: { color: "#16a34a", label: "Present", icon: "checkmark-circle" },
  late:    { color: "#d97706", label: "Late",    icon: "time" },
  absent:  { color: "#dc2626", label: "Absent",  icon: "close-circle" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function MemberAttendance({ readOnly = false }: { readOnly?: boolean }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [containerWidth, setContainerWidth] = useState(0);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleString("default", { month: "short", year: "numeric" });
  const getKey = (day: number) => `${currentYear}-${currentMonth}-${day}`;
  const getDayStatus = (day: number): AttendanceStatus => attendance[getKey(day)] ?? null;

  const handleSetStatus = (status: AttendanceStatus) => {
    if (!selectedDay) return;
    setAttendance((prev) => {
      const next = { ...prev };
      if (!status) delete next[getKey(selectedDay)];
      else next[getKey(selectedDay)] = status;
      return next;
    });
  };

  const selectedStatus = selectedDay ? getDayStatus(selectedDay) : null;
  const counts = Object.values(attendance).reduce(
    (acc, s) => { if (s) acc[s] = (acc[s] || 0) + 1; return acc; },
    { present: 0, late: 0, absent: 0 } as Record<string, number>
  );

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

  const CELL_H = 30;
  const CELL_W = containerWidth > 0 ? Math.floor((containerWidth - 24) / 7) : 0;

  return (
    <View
      style={{ backgroundColor: 'white', borderRadius: 12, marginBottom: 8, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Ionicons name="calendar-outline" size={16} color="#be123c" />
        <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: '#111827' }}>Member Attendance</Text>
      </View>

      <View style={{ padding: 12 }}>
        {/* Month Nav */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={16} color="#6b7280" />
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{monthLabel}</Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        {CELL_W > 0 && (
          <View style={{ flexDirection: 'row', marginBottom: 2 }}>
            {DAYS_OF_WEEK.map(d => (
              <View key={d} style={{ width: CELL_W, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: '600' }}>{d}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Calendar Grid */}
        {CELL_W > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarCells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={{ width: CELL_W, height: CELL_H }} />;

              const status = getDayStatus(day);
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const dotColor = status ? STATUS_CONFIG[status].color : null;

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => !readOnly && setSelectedDay(day)}
                  style={{ width: CELL_W, height: CELL_H, padding: 1 }}
                >
                  <View style={{
                    flex: 1,
                    borderRadius: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: dotColor ?? 'transparent',
                    borderWidth: (isSelected || isToday) ? 1 : 0,
                    borderColor: isSelected ? '#be123c' : '#9ca3af',
                  }}>
                    <Text style={{
                      fontSize: 10,
                      color: dotColor ? 'white' : isToday ? '#be123c' : '#374151',
                      fontWeight: isToday ? '700' : '400',
                    }}>
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Summary counts */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <View key={key} style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: val.color }}>{counts[key] ?? 0}</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>{val.label}</Text>
            </View>
          ))}
        </View>

        {/* Status controls — below calendar, non-readOnly only */}
        {!readOnly && (
          <>
            <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center', marginBottom: 10 }}>
              {selectedDay
                ? new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("default", { month: "short", day: "numeric" })
                : "Tap a date to mark attendance"}
            </Text>
            {selectedDay && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                  const isActive = selectedStatus === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handleSetStatus(isActive ? null : key as AttendanceStatus)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        backgroundColor: isActive ? val.color : '#F9FAFB',
                        borderColor: isActive ? val.color : '#E5E7EB',
                      }}
                    >
                      <Ionicons name={val.icon as any} size={13} color={isActive ? '#fff' : val.color} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? 'white' : '#374151' }}>
                        {val.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
