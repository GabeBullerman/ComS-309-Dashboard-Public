import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AttendanceStatus = "present" | "late" | "absent" | null;
type AttendanceTab = "class" | "ta_meeting" | "demo_meeting";

const TABS: { key: AttendanceTab; label: string }[] = [
  { key: "class", label: "Class" },
  { key: "ta_meeting", label: "TA Meeting" },
  { key: "demo_meeting", label: "Demo Meeting" },
];

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

export default function MemberAttendance({ readOnly = false }: { readOnly?: boolean }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [activeTab, setActiveTab] = useState<AttendanceTab>("class");

  const [attendance, setAttendance] = useState<Record<AttendanceTab, Record<string, AttendanceStatus>>>({
    class: {},
    ta_meeting: {},
    demo_meeting: {},
  });

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleString("default", { month: "short", year: "numeric" });

  const getKey = (day: number) => `${currentYear}-${currentMonth}-${day}`;
  const getDayStatus = (day: number): AttendanceStatus => attendance[activeTab][getKey(day)] ?? null;

  const handleSetStatus = (status: AttendanceStatus) => {
    if (!selectedDay) return;
    setAttendance((prev) => {
      const tabRecord = { ...prev[activeTab] };
      if (!status) delete tabRecord[getKey(selectedDay)];
      else tabRecord[getKey(selectedDay)] = status;
      return { ...prev, [activeTab]: tabRecord };
    });
  };

  const selectedStatus = selectedDay ? getDayStatus(selectedDay) : null;
  const counts = Object.values(attendance[activeTab]).reduce(
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
  const clearAttendance = () => {
    setAttendance((prev) => ({ ...prev, [activeTab]: {} }));
  };

  const [containerWidth, setContainerWidth] = useState(0);
  const CELL = 70;
  const CELL_W = readOnly && containerWidth > 0 ? Math.floor((containerWidth - 24) / 7) : CELL;

  return (
    <View
      className="bg-white rounded-xl shadow mt-6 mb-2 overflow-hidden"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 mt-3">
        <Ionicons name="calendar-outline" size={16} color="#be123c" />
        <Text className="text-base font-semibold ml-2">Member Attendance</Text>
      </View>

      {/* Body */}
      <View className="flex-row p-3 gap-3">

        {/* LEFT: Mini Calendar — fixed width based on cell size */}
        <View style={{ width: readOnly ? undefined : CELL * 7 + 8, flex: readOnly ? 1 : undefined }}>
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
              <View key={d} style={{ width: CELL_W, alignItems: "center" }}>
                <Text className="text-gray-400 font-semibold" style={{ fontSize: 7 }}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View className="flex-row flex-wrap">
            {calendarCells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={{ width: CELL_W, height: CELL }} />;

              const status = getDayStatus(day);
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const dotColor = status ? STATUS_CONFIG[status].bg : null;

              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => !readOnly && setSelectedDay(day)}
                  style={{ width: CELL_W, height: CELL, padding: 1 }}
                >
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
        {!readOnly && <View className="w-px bg-gray-200 my-1" />}

        {/* RIGHT: Tab switcher + status controls — flex: 1 fills remaining space */}
        {!readOnly && (
          <View style={{ flex: 1 }} className="gap-2 pt-1">

            {/* Horizontal tab switcher — stretches full width of right panel */}
            <View className="flex-row rounded-lg border border-gray-200 overflow-hidden">
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={{ flex: 1 }}
                    className={`py-1.5 items-center justify-center ${isActive ? "bg-rose-700" : "bg-gray-50"} ${index < TABS.length - 1 ? "border-r border-gray-200" : ""}`}
                  >
                    <Text
                      style={{ fontSize: 11, fontWeight: "600", color: isActive ? "#fff" : "#6b7280" }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date label + status buttons row */}
            <View className="flex-row gap-2 items-start">

              {/* Status buttons — flex: 1 so they grow with the panel */}
              <View style={{ flex: 1 }} className="gap-1.5">
                {selectedDay ? (
                  <>
                    <Text className="text-xs font-semibold text-gray-700 text-center mb-0.5">
                      {new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("default", { month: "short", day: "numeric" })}
                    </Text>
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
                  </>
                ) : (
                  <View className="items-center mt-3">
                    <Ionicons name="finger-print-outline" size={22} color="#d1d5db" />
                    <Text className="text-gray-300 text-center mt-1" style={{ fontSize: 9 }}>
                      Tap a date to mark
                    </Text>
                  </View>
                )}
                {/* Clear day button */}
                <TouchableOpacity
                  key={"clear-day"}
                  onPress={() => handleSetStatus(null)}
                  className={"flex-row items-center gap-1.5 py-1.5 px-2 rounded-lg border border-gray-200 bg-gray-50"}
                >
                  <Ionicons name="trash-outline" size={11} color="#9ca3af" />
                  <Text className={"text-xs font-semibold text-gray-700"}>
                    Clear Day
                  </Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* Clear button */}
            <View className="mt-auto">
              <TouchableOpacity
                onPress={clearAttendance}
                className="flex-row items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-gray-200 bg-gray-50"
              >
                <Ionicons name="trash-outline" size={11} color="#9ca3af" />
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#9ca3af" }}>
                  Clear entire calendar!
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        )}
      </View>
    </View>
  );
}