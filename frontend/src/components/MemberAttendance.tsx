import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AttendanceStatus = "present" | "late" | "absent" |null;

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const STATUS_CONFIG = {
  present: { bg: "#16a34a", activeBg: "bg-green-600", activeBorder: "border-green-600", label: "Present", icon: "checkmark-circle" },
  late:    { bg: "#d97706", activeBg: "bg-amber-600", activeBorder: "border-amber-600", label: "Late",    icon: "time" },
  absent:  { bg: "#dc2626", activeBg: "bg-red-600",   activeBorder: "border-red-600",   label: "Absent",  icon: "close-circle" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function MemberAttendance() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

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

  const CELL = 70; // cell size for calendar grid. Can be changed if you would like to scale calendar size

  return (
    <View className="bg-white rounded-xl shadow mt-6 mb-12 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Ionicons name="calendar-outline" size={16} color="#be123c" />
        <Text className="text-base font-semibold ml-2">Member Attendance</Text>
      </View>

      {/* Body */}
      <View className="flex-row p-3 gap-3">

        {/* LEFT: Mini Calendar — half size */}
        <View style={{ width: CELL * 7 + 8 }}>
          {/* Month Nav */}
          <View className="flex-row items-center justify-between mb-1">
            <TouchableOpacity onPress={prevMonth}>
              <Ionicons name="chevron-back" size={10} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-gray-700 font-semibold" style={{ fontSize: 9 }}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={10} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View className="flex-row mb-0.5">
            {DAYS_OF_WEEK.map(d => (
              <View key={d} style={{ width: CELL, alignItems: "center" }}>
                <Text className="text-gray-400 font-semibold" style={{ fontSize: 7 }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="flex-row flex-wrap">
            {calendarCells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={{ width: CELL, height: CELL }} />;

              const status = getDayStatus(day);
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const dotColor = status ? STATUS_CONFIG[status].bg : null;

              return (
                <TouchableOpacity key={day} onPress={() => setSelectedDay(day)} style={{ width: CELL, height: CELL, padding: 1 }}>
                  <View
                    className={`flex-1 rounded items-center justify-center ${isSelected ? "border border-rose-700" : isToday ? "border border-gray-400" : ""}`}
                    style={{ backgroundColor: dotColor ?? "transparent" }}
                  >
                    <Text
                      className={`${dotColor ? "text-white" : isToday ? "text-rose-700 font-bold" : "text-gray-700"}`}
                      style={{ fontSize: 7 }}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary counts */}
          <View className="flex-row justify-around mt-1.5 pt-1.5 border-t border-gray-100">
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <View key={key} className="items-center">
                <Text className="font-bold" style={{ fontSize: 11, color: val.bg }}>{counts[key] ?? 0}</Text>
                <Text className="text-gray-400" style={{ fontSize: 7 }}>{val.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View className="w-px bg-gray-200 my-1" />

        {/* RIGHT: Status Controls */}
        <View className="w-24 pt-1">
          <Text className="text-xs font-semibold text-gray-700 text-center mb-2">
            {selectedDay
              ? new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("default", { month: "short", day: "numeric" })
              : "Pick a day"}
          </Text>

          {selectedDay ? (
            <View className="gap-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, val]) => {
                const isActive = selectedStatus === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleSetStatus(isActive ? null : key as AttendanceStatus)}
                    className={`flex-row items-center gap-1.5 py-1.5 px-2 rounded-lg border ${isActive ? `${val.activeBg} ${val.activeBorder}` : "bg-gray-50 border-gray-200"}`}
                  >
                    <Ionicons name={val.icon as any} size={12} color={isActive ? "#fff" : val.bg} />
                    <Text className={`text-xs font-semibold ${isActive ? "text-white" : "text-gray-700"}`}>
                      {val.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="items-center mt-3">
              <Ionicons name="finger-print-outline" size={22} color="#d1d5db" />
              <Text className="text-gray-300 text-center mt-1" style={{ fontSize: 9 }}>
                Tap a date to mark
              </Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}