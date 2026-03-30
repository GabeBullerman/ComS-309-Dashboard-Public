import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useState } from "react";

type ProgressLevel = "good" | "moderate" | "poor" | "ungraded";

interface DemoRow {
  demo: string;
  code: ProgressLevel;
  teamwork: ProgressLevel;
}

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

const levels: ProgressLevel[] = ["ungraded", "good", "moderate", "poor"];

function ProgressBar({ level, onPress, readOnly }: { level: ProgressLevel; onPress: (level: ProgressLevel) => void; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={{ height: 32, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', justifyContent: 'center' }}
        onPress={() => !readOnly && setOpen(o => !o)}
        activeOpacity={readOnly ? 1 : 0.7}
      >
        <View style={{ height: '100%', backgroundColor: COLOR_MAP[level], alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginRight: readOnly ? 0 : 4 }}>
            {LABEL_MAP[level]}
          </Text>
          {!readOnly && <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color="white" />}
        </View>
      </TouchableOpacity>

      {!readOnly && open && (
        <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, marginTop: 4, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, zIndex: 10 }}>
          {levels.map((l) => (
            <TouchableOpacity
              key={l}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
              onPress={() => { onPress(l); setOpen(false); }}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8, backgroundColor: COLOR_MAP[l] }} />
              <Text style={{ fontSize: 12, color: '#374151' }}>{LABEL_MAP[l]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TeamProgress({ readOnly = false }: { readOnly?: boolean }) {
  const [demos, setDemos] = useState<DemoRow[]>([
    { demo: "Demo 1", code: "good", teamwork: "ungraded" },
    { demo: "Demo 2", code: "ungraded", teamwork: "ungraded" },
    { demo: "Demo 3", code: "ungraded", teamwork: "ungraded" },
    { demo: "Demo 4", code: "ungraded", teamwork: "ungraded" },
  ]);

  const setLevel = (rowIndex: number, field: "code" | "teamwork", level: ProgressLevel) => {
    setDemos(prev => prev.map((row, i) => i === rowIndex ? { ...row, [field]: level } : row));
  };

  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Team Progress</Text>
          {!readOnly && (
            <View style={{ backgroundColor: '#fef9c3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
              <Text style={{ color: '#a16207', fontSize: 11, fontWeight: '500' }}>Unsaved Changes</Text>
            </View>
          )}
        </View>
        {!readOnly && (
          <TouchableOpacity style={{ backgroundColor: '#dc2626', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Column Headers */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Text style={{ width: 64, color: '#6B7280', fontSize: 12 }}>Demo</Text>
        <Text style={{ flex: 1, color: '#6B7280', fontSize: 12 }}>Code Progress</Text>
        <View style={{ width: 8 }} />
        <Text style={{ flex: 1, color: '#6B7280', fontSize: 12 }}>Teamwork</Text>
      </View>

      {/* Rows */}
      {demos.map((row, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <View style={{ width: 64, backgroundColor: '#F3F4F6', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#374151' }}>{row.demo}</Text>
          </View>
          <ProgressBar level={row.code} onPress={(l) => setLevel(index, "code", l)} readOnly={readOnly} />
          <ProgressBar level={row.teamwork} onPress={(l) => setLevel(index, "teamwork", l)} readOnly={readOnly} />
        </View>
      ))}

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {(Object.entries(LABEL_MAP) as [ProgressLevel, string][]).map(([key, label]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 6, backgroundColor: COLOR_MAP[key] }} />
            <Text style={{ fontSize: 12, color: '#4B5563' }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
