import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeamMember } from "@/types/Teams";
import {
  WeeklyPerformanceRecord,
  getWeeklyPerformanceForStudent,
  createWeeklyPerformance,
  deleteWeeklyPerformance,
} from "@/api/weeklyPerformance";
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

const LEVELS: ProgressLevel[] = ["ungraded", "good", "moderate", "poor"];

const SCORE_TO_LEVEL: Record<number, ProgressLevel> = { 0: "poor", 1: "moderate", 2: "good" };
const LEVEL_TO_SCORE: Record<string, number> = { poor: 0, moderate: 1, good: 2 };

type MemberScore = { code: ProgressLevel; teamwork: ProgressLevel; id?: number };

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
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0 });
  const ref = useRef<View>(null);

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        ref={ref}
        onPress={() => !readOnly && ref.current?.measure((_fx, _fy, w, h, px, py) => { setPos({ x: px, y: py + h, w }); setOpen(true); })}
        activeOpacity={readOnly ? 1 : 0.7}
        style={{ height: 30, backgroundColor: colorForLevel(level, colors), borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
      >
        <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: '600' }}>{LABEL_MAP[level]}</Text>
        {!readOnly && <Ionicons name={open ? "chevron-up" : "chevron-down"} size={10} color={colors.textInverse} />}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', top: pos.y + 4, left: pos.x, minWidth: Math.max(pos.w, 140), backgroundColor: colors.surface, borderRadius: 6, borderWidth: 1, borderColor: colors.border, elevation: 8, shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 6, overflow: 'hidden' }}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => { onPress(l); setOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorForLevel(l, colors), marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{LABEL_MAP[l]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function WeekDropdown({ weeks, selected, onSelect }: { weeks: { label: string; key: string }[]; selected: string; onSelect: (key: string) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 0 });
  const ref = useRef<View>(null);
  const current = weeks.find(w => w.key === selected);

  return (
    <View>
      <TouchableOpacity
        ref={ref}
        onPress={() => ref.current?.measure((_fx, _fy, w, h, px, py) => { setPos({ x: px, y: py + h, w }); setOpen(true); })}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border }}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{current?.label ?? 'Select week'}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', top: pos.y + 4, left: pos.x, minWidth: Math.max(pos.w, 220), backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, elevation: 8, shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 6, overflow: 'hidden' }}>
            {weeks.map((w, i) => {
              const isActive = w.key === selected;
              return (
                <TouchableOpacity
                  key={w.key}
                  onPress={() => { onSelect(w.key); setOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < weeks.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight, backgroundColor: isActive ? colors.statusPoorBg : colors.surface }}
                >
                  <Text style={{ fontSize: 13, color: isActive ? colors.statusPoorText : colors.textSecondary, fontWeight: isActive ? '600' : '400' }}>{w.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={14} color={colors.statusPoorText} />}
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
  const { colors } = useTheme();
  const weeks = buildWeeks(8);
  const [selectedWeek, setSelectedWeek] = useState(weeks[0].key);
  const [scores, setScores] = useState<Record<string, Record<string, MemberScore>>>({});
  const originalScoresRef = useRef<Record<string, Record<string, MemberScore>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: number; failed: number } | null>(null);

  useEffect(() => {
    if (members.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      members
        .filter(m => m.netid)
        .map(m =>
          getWeeklyPerformanceForStudent(m.netid!)
            .then(records => ({ netid: m.netid!, records }))
            .catch(() => ({ netid: m.netid!, records: [] as WeeklyPerformanceRecord[] }))
        )
    ).then(results => {
      const newScores: typeof scores = {};
      for (const { netid, records } of results) {
        newScores[netid] = {};
        for (const r of records) {
          newScores[netid][r.weekStartDate] = {
            code: SCORE_TO_LEVEL[r.codeScore] ?? 'ungraded',
            teamwork: SCORE_TO_LEVEL[r.teamworkScore] ?? 'ungraded',
            id: r.id,
          };
        }
      }
      originalScoresRef.current = newScores;
      setScores(newScores);
    }).finally(() => setLoading(false));
  }, [members]);

  const getScore = (netid: string): MemberScore =>
    scores[netid]?.[selectedWeek] ?? { code: 'ungraded', teamwork: 'ungraded' };

  const setScore = (netid: string, field: 'code' | 'teamwork', level: ProgressLevel) => {
    setScores(prev => ({
      ...prev,
      [netid]: {
        ...prev[netid],
        [selectedWeek]: { ...getScore(netid), [field]: level },
      },
    }));
    setUnsaved(true);
  };

  const doSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    const ops = members
      .filter(m => m.netid)
      .map(m => {
        const score = getScore(m.netid!);
        const bothUngraded = score.code === 'ungraded' && score.teamwork === 'ungraded';
        const bothGraded = score.code !== 'ungraded' && score.teamwork !== 'ungraded';
        if (bothUngraded && score.id) {
          return deleteWeeklyPerformance(score.id).then(() => {
            setScores(prev => {
              const updated = { ...prev[m.netid!] };
              delete updated[selectedWeek];
              return { ...prev, [m.netid!]: updated };
            });
          });
        } else if (bothGraded) {
          return createWeeklyPerformance(
            m.netid!, selectedWeek,
            LEVEL_TO_SCORE[score.code], LEVEL_TO_SCORE[score.teamwork],
          ).then(saved => {
            setScores(prev => ({
              ...prev,
              [m.netid!]: { ...prev[m.netid!], [selectedWeek]: { ...score, id: saved.id } },
            }));
          });
        }
        return Promise.resolve();
      });

    const results = await Promise.allSettled(ops);
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    setSaveStatus({ ok, failed });
    if (failed === 0) setUnsaved(false);
    setSaving(false);
  };

  const handleSave = () => {
    const hasExisting = members.some(m => {
      if (!m.netid) return false;
      const orig = originalScoresRef.current[m.netid]?.[selectedWeek];
      if (!orig?.id || orig.code === 'ungraded' || orig.teamwork === 'ungraded') return false;
      const curr = getScore(m.netid);
      return curr.code !== orig.code || curr.teamwork !== orig.teamwork;
    });
    if (!hasExisting) { doSave(); return; }
    const msg = 'Some members already have grades for this week. Save will overwrite them.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) doSave();
    } else {
      Alert.alert('Overwrite Grades?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: doSave },
      ]);
    }
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
        <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: colors.text, flex: 1 }}>Weekly Performance</Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
        {!readOnly && saveStatus && !saving && (
          <View style={{ backgroundColor: saveStatus.failed > 0 ? colors.criticalBg : colors.statusGoodBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 8 }}>
            <Text style={{ color: saveStatus.failed > 0 ? colors.criticalText : colors.statusGoodText, fontSize: 11, fontWeight: '500' }}>
              {saveStatus.failed > 0
                ? saveStatus.ok > 0
                  ? `${saveStatus.ok} saved, ${saveStatus.failed} failed`
                  : `Save failed (${saveStatus.failed} error${saveStatus.failed > 1 ? 's' : ''})`
                : `Saved ${saveStatus.ok}`}
            </Text>
          </View>
        )}
        {!readOnly && unsaved && !loading && !saveStatus && (
          <View style={{ backgroundColor: colors.statusModerateBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 8 }}>
            <Text style={{ color: colors.statusModerateText, fontSize: 11, fontWeight: '500' }}>Unsaved</Text>
          </View>
        )}
        {!readOnly && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || loading}
            style={{ backgroundColor: colors.criticalBorder, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, opacity: saving ? 0.6 : 1 }}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: '600' }}>Save</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={{ padding: 16 }}>
        {/* Week selector */}
        <View style={{ marginBottom: 14 }}>
          <WeekDropdown weeks={weeks} selected={selectedWeek} onSelect={(k) => { setSelectedWeek(k); setUnsaved(false); }} />
        </View>

        {/* Column headers */}
        <View style={{ flexDirection: 'row', marginBottom: 4, paddingHorizontal: 4 }}>
          <Text style={{ flex: 2, fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>Member</Text>
          <Text style={{ flex: 2, fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>Code</Text>
          <View style={{ width: 8 }} />
          <Text style={{ flex: 2, fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>Teamwork</Text>
        </View>
        {!readOnly && (
          <Text style={{ fontSize: 10, color: colors.textFaint, paddingHorizontal: 4, marginBottom: 8 }}>
            Both fields must be set to save or ungrade a row.
          </Text>
        )}

        {/* Member rows */}
        <View style={{ gap: 8 }}>
          {members.map((member) => {
            const key = member.netid || member.name;
            const score = member.netid ? getScore(member.netid) : { code: 'ungraded' as ProgressLevel, teamwork: 'ungraded' as ProgressLevel };
            return (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }} numberOfLines={1}>{member.name}</Text>
                  {member.netid && (
                    <Text style={{ fontSize: 10, color: colors.textFaint }}>{member.netid}</Text>
                  )}
                </View>
                <View style={{ flex: 2 }}>
                  <ProgressCell
                    level={score.code}
                    onPress={(l) => member.netid && setScore(member.netid, 'code', l)}
                    readOnly={readOnly || !member.netid}
                  />
                </View>
                <View style={{ width: 8 }} />
                <View style={{ flex: 2 }}>
                  <ProgressCell
                    level={score.teamwork}
                    onPress={(l) => member.netid && setScore(member.netid, 'teamwork', l)}
                    readOnly={readOnly || !member.netid}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 12 }}>
          {(Object.entries(LABEL_MAP) as [ProgressLevel, string][]).map(([key, label]) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorForLevel(key, colors) }} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
