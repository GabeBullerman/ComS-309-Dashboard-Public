import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from "react";
import {
  DemoPerformanceRecord,
  getDemoPerformanceForStudent,
  createDemoPerformance,
  deleteDemoPerformanceBySlot,
} from "@/api/demoPerformance";
import { useTheme } from '../contexts/ThemeContext';
import { ColorPalette } from '../constants/colors';

type ProgressLevel = "good" | "moderate" | "poor" | "ungraded";

function colorForLevel(level: ProgressLevel, colors: ColorPalette): string {
  switch (level) {
    case 'good':     return colors.statusGoodBar;
    case 'moderate': return colors.statusModerateBar;
    case 'poor':     return colors.statusPoorBar;
    default:         return colors.statusUngraded;
  }
}

const LABEL_MAP: Record<ProgressLevel, string> = {
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
  ungraded: "Ungraded",
};

const levels: ProgressLevel[] = ["ungraded", "good", "moderate", "poor"];

const SCORE_TO_LEVEL: Record<number, ProgressLevel> = { 0: "poor", 1: "moderate", 2: "good" };
const LEVEL_TO_SCORE: Record<string, number> = { poor: 0, moderate: 1, good: 2 };

const DEMO_LABELS = ["Demo 1", "Demo 2", "Demo 3", "Demo 4"];

interface DemoRow {
  demoNumber: number;
  code: ProgressLevel;
  teamwork: ProgressLevel;
  codeRecordId?: number;
  teamworkRecordId?: number;
  recordId?: number;
}

function ProgressBar({ level, onPress, readOnly }: { level: ProgressLevel; onPress: (level: ProgressLevel) => void; readOnly?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ x: number; y: number; width: number } | null>(null);
  const barRef = useRef<View>(null);
  const barColor = colorForLevel(level, colors);

  const handleOpen = () => {
    if (readOnly) return;
    barRef.current?.measure((_fx, _fy, width, height, px, py) => {
      setDropPos({ x: px, y: py + height + 2, width });
      setOpen(true);
    });
  };

  return (
    <View style={{ flex: 1 }} ref={barRef}>
      <TouchableOpacity
        style={{ height: 32, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden', justifyContent: 'center' }}
        onPress={handleOpen}
        activeOpacity={readOnly ? 1 : 0.7}
      >
        <View style={{ height: '100%', backgroundColor: barColor, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: '600', marginRight: readOnly ? 0 : 4 }}>
            {LABEL_MAP[level]}
          </Text>
          {!readOnly && <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color={colors.textInverse} />}
        </View>
      </TouchableOpacity>

      {!readOnly && (
        <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setOpen(false)} activeOpacity={1}>
            {dropPos && (
              <View style={{ position: 'absolute', top: dropPos.y, left: dropPos.x, width: dropPos.width, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, elevation: 8, shadowColor: colors.shadow, shadowOpacity: 0.15, shadowRadius: 6 }}>
                {levels.map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                    onPress={() => { onPress(l); setOpen(false); }}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8, backgroundColor: colorForLevel(l, colors) }} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{LABEL_MAP[l]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

interface Props {
  netid: string;
  readOnly?: boolean;
}

export default function TeamProgress({ netid, readOnly = false }: Props) {
  const { colors } = useTheme();
  const [demos, setDemos] = useState<DemoRow[]>(
    DEMO_LABELS.map((_, i) => ({ demoNumber: i + 1, code: 'ungraded', teamwork: 'ungraded' }))
  );
  const originalDemosRef = useRef<DemoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!netid) { setLoading(false); return; }
    setLoading(true);
    getDemoPerformanceForStudent(netid)
      .then((records: DemoPerformanceRecord[]) => {
        const loaded = DEMO_LABELS.map((_, i) => {
          const demoNumber = i + 1;
          const r = records.find(rec => rec.demoNumber === demoNumber);
          return {
            demoNumber,
            code: r ? (SCORE_TO_LEVEL[r.codeScore] ?? 'ungraded') : 'ungraded',
            teamwork: r ? (SCORE_TO_LEVEL[r.teamworkScore] ?? 'ungraded') : 'ungraded',
            recordId: r?.id,
          };
        });
        originalDemosRef.current = loaded;
        setDemos(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [netid]);

  const setLevel = (rowIndex: number, field: "code" | "teamwork", level: ProgressLevel) => {
    setDemos(prev => prev.map((row, i) => i === rowIndex ? { ...row, [field]: level } : row));
    setUnsaved(true);
  };

  const doSave = async () => {
    if (!netid) return;
    setSaving(true);
    setSaveError(null);
    const results = await Promise.allSettled(
      demos.map(async (row) => {
        const bothUngraded = row.code === 'ungraded' && row.teamwork === 'ungraded';
        const bothGraded = row.code !== 'ungraded' && row.teamwork !== 'ungraded';
        if (bothUngraded) {
          await deleteDemoPerformanceBySlot(netid, row.demoNumber);
        } else if (bothGraded) {
          await createDemoPerformance(
            netid, row.demoNumber,
            LEVEL_TO_SCORE[row.code], LEVEL_TO_SCORE[row.teamwork],
          );
        }
      })
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      const firstErr = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
      setSaveError(firstErr.reason?.response?.data ?? firstErr.reason?.message ?? 'Save failed');
    } else {
      setUnsaved(false);
    }
    getDemoPerformanceForStudent(netid)
      .then((records: DemoPerformanceRecord[]) => {
        const reloaded = DEMO_LABELS.map((_, i) => {
          const demoNumber = i + 1;
          const r = records.find(rec => rec.demoNumber === demoNumber);
          return {
            demoNumber,
            code: r ? (SCORE_TO_LEVEL[r.codeScore] ?? 'ungraded') : 'ungraded',
            teamwork: r ? (SCORE_TO_LEVEL[r.teamworkScore] ?? 'ungraded') : 'ungraded',
            recordId: r?.id,
          };
        });
        originalDemosRef.current = reloaded;
        setDemos(reloaded);
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const handleSave = () => {
    const hasExisting = demos.some((d, i) => {
      const orig = originalDemosRef.current[i];
      if (!orig?.recordId || orig.code === 'ungraded' || orig.teamwork === 'ungraded') return false;
      return d.code !== orig.code || d.teamwork !== orig.teamwork;
    });
    if (!hasExisting) { doSave(); return; }
    const msg = 'Some demos already have grades recorded. Saving will overwrite them.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doSave();
    } else {
      Alert.alert('Overwrite Demo Grades?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: doSave },
      ]);
    }
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Demo Performance</Text>
          {loading && <ActivityIndicator size="small" color={colors.criticalBorder} />}
          {saveError && (
            <View style={{ backgroundColor: colors.criticalBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 8 }}>
              <Text style={{ color: colors.criticalBorder, fontSize: 11, fontWeight: '500' }}>{saveError}</Text>
            </View>
          )}
          {!readOnly && unsaved && !loading && !saveError && (
            <View style={{ backgroundColor: colors.statusModerateBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
              <Text style={{ color: colors.statusModerateText, fontSize: 11, fontWeight: '500' }}>Unsaved Changes</Text>
            </View>
          )}
        </View>
        {!readOnly && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || loading}
            style={{ backgroundColor: colors.criticalBorder, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, opacity: saving ? 0.6 : 1, minWidth: 100, alignItems: 'center' }}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 13 }}>Save Changes</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Column Headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        <Text style={{ width: 64, color: colors.textMuted, fontSize: 12 }}>Demo</Text>
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: 12 }}>Code Progress</Text>
        <View style={{ width: 8 }} />
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: 12 }}>Teamwork</Text>
      </View>
      {!readOnly && (
        <Text style={{ fontSize: 10, color: colors.textFaint, marginBottom: 8 }}>
          Both fields must be set to save or ungrade a row.
        </Text>
      )}

      {/* Rows */}
      {demos.map((row, index) => (
        <View key={`demo-${index}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
          <View style={{ width: 64, backgroundColor: colors.borderLight, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{DEMO_LABELS[index]}</Text>
          </View>
          <ProgressBar level={row.code} onPress={(l) => setLevel(index, "code", l)} readOnly={readOnly} />
          <ProgressBar level={row.teamwork} onPress={(l) => setLevel(index, "teamwork", l)} readOnly={readOnly} />
        </View>
      ))}

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
        {(Object.entries(LABEL_MAP) as [ProgressLevel, string][]).map(([key, label]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 6, backgroundColor: colorForLevel(key, colors) }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
