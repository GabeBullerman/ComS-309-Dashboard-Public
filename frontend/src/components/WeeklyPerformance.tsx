import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeamMember } from "@/types/Teams";

type ProgressLevel = "good" | "moderate" | "poor" | "ungraded";

const COLOR_MAP: Record<ProgressLevel, string> = {
  good: "#22c55e",
  moderate: "#facc15",
  poor: "#ef4444",
  ungraded: "#9ca3af",
};

const LABEL_MAP: Record<ProgressLevel, string> = {
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
  ungraded: "Ungraded",
};

const LEVELS: ProgressLevel[] = ["ungraded", "good", "moderate", "poor"];

type MemberScore = { code: ProgressLevel; teamwork: ProgressLevel };
type WeekScores = Record<string, MemberScore>;

function buildWeeks(count: number): { label: string; key: string }[] {
  const weeks: { label: string; key: string }[] = [];
  const now = new Date();
  const day = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const s = new Date(startOfWeek);
    s.setDate(startOfWeek.getDate() - i * 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    weeks.push({ label: `${fmt(s)} – ${fmt(e)}`, key: s.toISOString().split('T')[0] });
  }
  return weeks;
}

function ProgressCell({ level, onPress, readOnly }: { level: ProgressLevel; onPress: (l: ProgressLevel) => void; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        onPress={() => !readOnly && setOpen(o => !o)}
        activeOpacity={readOnly ? 1 : 0.7}
        style={{ height: 30, backgroundColor: COLOR_MAP[level], borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
      >
        <Text style={{ color: 'white', fontSize: 11, fontWeight: '600' }}>{LABEL_MAP[level]}</Text>
        {!readOnly && <Ionicons name={open ? "chevron-up" : "chevron-down"} size={10} color="white" />}
      </TouchableOpacity>
      {!readOnly && open && (
        <View style={{ position: 'absolute', top: 34, left: 0, right: 0, backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, zIndex: 20 }}>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => { onPress(l); setOpen(false); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLOR_MAP[l], marginRight: 8 }} />
              <Text style={{ fontSize: 12, color: '#374151' }}>{LABEL_MAP[l]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function WeekDropdown({ weeks, selected, onSelect }: { weeks: { label: string; key: string }[]; selected: string; onSelect: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0 });
  const ref = useRef<View>(null);
  const current = weeks.find(w => w.key === selected);

  return (
    <View>
      <TouchableOpacity
        ref={ref}
        onPress={() => ref.current?.measure((_fx, _fy, w, h, px, py) => { setPos({ x: px, y: py + h, w }); setOpen(true); })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
        <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{current?.label ?? 'Select week'}</Text>
        <Ionicons name="chevron-down" size={12} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', top: pos.y + 4, left: pos.x, minWidth: Math.max(pos.w, 220), backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, overflow: 'hidden' }}>
            {weeks.map((w, i) => {
              const isActive = w.key === selected;
              return (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => { onSelect(w.key); setOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < weeks.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6', backgroundColor: isActive ? '#fef2f2' : 'white' }}
                >
                  <Text style={{ fontSize: 13, color: isActive ? '#b91c1c' : '#374151', fontWeight: isActive ? '600' : '400' }}>{w.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={14} color="#b91c1c" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

interface Props {
  members: TeamMember[];
  readOnly?: boolean;
}

export default function WeeklyPerformance({ members, readOnly = false }: Props) {
  const weeks = buildWeeks(8);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0].key);
  const [allScores, setAllScores] = useState<Record<string, WeekScores>>({});
  const [unsaved, setUnsaved] = useState(false);

  const getScore = (memberKey: string): MemberScore =>
    allScores[selectedWeek]?.[memberKey] ?? { code: 'ungraded', teamwork: 'ungraded' };

  const setScore = (memberKey: string, field: 'code' | 'teamwork', level: ProgressLevel) => {
    setAllScores(prev => ({
      ...prev,
      [selectedWeek]: {
        ...prev[selectedWeek],
        [memberKey]: { ...getScore(memberKey), [field]: level },
      },
    }));
    setUnsaved(true);
  };

  const handleSave = () => setUnsaved(false);

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Ionicons name="bar-chart-outline" size={18} color="#be123c" />
        <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: '#111827', flex: 1 }}>Weekly Performance</Text>
        {!readOnly && unsaved && (
          <View style={{ backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 8 }}>
            <Text style={{ color: '#a16207', fontSize: 11, fontWeight: '500' }}>Unsaved</Text>
          </View>
        )}
        {!readOnly && (
          <TouchableOpacity
            onPress={handleSave}
            style={{ backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ padding: 16 }}>
        {/* Week selector */}
        <View style={{ marginBottom: 14 }}>
          <WeekDropdown weeks={weeks} selected={selectedWeek} onSelect={(k) => { setSelectedWeek(k); setUnsaved(false); }} />
        </View>

        {/* Column headers */}
        <View style={{ flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 }}>
          <Text style={{ flex: 2, fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Member</Text>
          <Text style={{ flex: 2, fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Code</Text>
          <View style={{ width: 8 }} />
          <Text style={{ flex: 2, fontSize: 12, color: '#6B7280', fontWeight: '500' }}>Teamwork</Text>
        </View>

        {/* Member rows */}
        <View style={{ gap: 8 }}>
          {members.map((member) => {
            const key = member.netid || member.name;
            const score = getScore(key);
            return (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }} numberOfLines={1}>{member.name}</Text>
                  {member.netid && (
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{member.netid}</Text>
                  )}
                </View>
                <View style={{ flex: 2 }}>
                  <ProgressCell level={score.code} onPress={(l) => setScore(key, 'code', l)} readOnly={readOnly} />
                </View>
                <View style={{ width: 8 }} />
                <View style={{ flex: 2 }}>
                  <ProgressCell level={score.teamwork} onPress={(l) => setScore(key, 'teamwork', l)} readOnly={readOnly} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 12 }}>
          {(Object.entries(LABEL_MAP) as [ProgressLevel, string][]).map(([key, label]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLOR_MAP[key] }} />
              <Text style={{ fontSize: 11, color: '#6B7280' }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
