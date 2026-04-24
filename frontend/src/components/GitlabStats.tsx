import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  ViewStyle,
} from "react-native";
import {
  getGitLabToken,
  buildWeekBuckets,
  fetchAllCommitsSince,
  filterCommitsByMember,
  fetchCommitDetail,
  fetchMemberMergeRequests,
  WeekBucket,
} from "@/utils/gitlab";
import { getSemesterStartDate } from "@/api/settings";
import { useTheme } from '../contexts/ThemeContext';

// ─── Data Types ───────────────────────────────────────────────────────────────

type CommitSizeWeek   = { week: string; label: string; additions: number; deletions: number; files: number };
type CommitFreqWeek   = { week: string; commits: number };
type MRWeek           = { week: string; opened: number; merged: number; closed: number };
type WeekMeta         = { week: string; label: string };

const CHART_H = 140;

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: { label: string; value: string; color: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
      {stats.map((s) => (
        <View key={s.label} style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 16, color: s.color }}>{s.value}</Text>
          <Text style={{ fontSize: 11, color: colors.textFaint }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Week Dropdown ────────────────────────────────────────────────────────────

function WeekDropdown({ weeks, selectedWeek, onSelect }: { weeks: WeekMeta[]; selectedWeek: string; onSelect: (week: string) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const triggerRef = useRef<View>(null);
  const selected = weeks.find((w) => w.week === selectedWeek) ?? weeks[weeks.length - 1];

  const openDropdown = () => {
    triggerRef.current?.measure((_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
      setDropdownPos({ x: px, y: py + height, width });
      setOpen(true);
    });
  };

  if (!selected) return null;

  return (
    <View>
      <TouchableOpacity
        ref={triggerRef}
        onPress={openDropdown}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.borderMedium, borderWidth: 1, borderColor: colors.border }}
        activeOpacity={0.7}
      >
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{selected.week}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>{selected.label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 4 }}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View style={{
            position: 'absolute',
            top: dropdownPos.y + 4,
            left: dropdownPos.x,
            minWidth: Math.max(dropdownPos.width, 200),
            maxHeight: 240,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            shadowColor: colors.shadow,
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 6,
          }}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={true}>
              {weeks.map((w, i) => {
                const isActive = w.week === selectedWeek;
                return (
                  <TouchableOpacity
                    key={w.week}
                    onPress={() => { onSelect(w.week); setOpen(false); }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderBottomWidth: i < weeks.length - 1 ? 1 : 0,
                      borderBottomColor: colors.borderLight,
                      backgroundColor: isActive ? colors.statusPoorBg : colors.surface,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', marginRight: 12, color: isActive ? colors.chartMrOpened : colors.text }}>
                      {w.week}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{w.label}</Text>
                    {isActive && <Text style={{ color: colors.chartMrOpened, fontSize: 12, marginLeft: 8 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Commit Size Chart ────────────────────────────────────────────────────────

function CommitSizeChart({ data, selectedWeek }: { data: CommitSizeWeek[]; selectedWeek: string }) {
  const { colors } = useTheme();
  const d = data.find((x) => x.week === selectedWeek) ?? { additions: 0, deletions: 0, files: 0, week: '', label: '' };
  const maxVal = Math.max(d.additions, d.deletions, 1);

  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Lines added / removed</Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 32, paddingHorizontal: 32, height: CHART_H }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
          <View style={{ width: '100%', borderRadius: 4, opacity: 0.85, height: CHART_H * (d.additions / maxVal), backgroundColor: colors.chartAdditions }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
          <View style={{ width: '100%', borderRadius: 4, opacity: 0.85, height: CHART_H * (d.deletions / maxVal), backgroundColor: colors.chartDeletions }} />
        </View>
      </View>

      <StatsRow stats={[
        { label: "Additions",     value: d.additions.toLocaleString(), color: colors.chartAdditions },
        { label: "Deletions",     value: d.deletions.toLocaleString(), color: colors.chartDeletions },
        { label: "Files Changed", value: String(d.files),              color: colors.chartCommits },
      ]} />
    </View>
  );
}

// ─── Commit Frequency Chart ───────────────────────────────────────────────────

function CommitFrequencyChart({ data }: { data: CommitFreqWeek[] }) {
  const { colors } = useTheme();
  const maxVal = Math.max(...data.map((x) => x.commits), 1);
  const total  = data.reduce((s, x) => s + x.commits, 0);
  const avg    = data.length > 0 ? Math.round(total / data.length) : 0;

  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Commits per week</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 4 }}>
        {data.map((w) => {
          const barH = Math.max(CHART_H * (w.commits / maxVal), w.commits > 0 ? 4 : 0);
          return (
            <View key={w.week} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Text style={{ color: colors.chartCommits, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                {w.commits > 0 ? w.commits : ''}
              </Text>
              <View style={{ width: '100%', borderRadius: 3, opacity: 0.85, height: barH, backgroundColor: colors.chartCommits }} />
              <Text style={{ color: colors.textFaint, fontSize: 9, marginTop: 4 }}>{w.week}</Text>
            </View>
          );
        })}
      </View>

      <StatsRow stats={[
        { label: "Total",   value: String(total),   color: colors.chartCommits },
        { label: "Peak",    value: String(maxVal),   color: colors.chartCommits },
        { label: "Avg/wk", value: String(avg),       color: colors.chartCommits },
      ]} />
    </View>
  );
}

// ─── Merge Request Chart ──────────────────────────────────────────────────────

function MergeRequestChart({ data, selectedWeek }: { data: MRWeek[]; selectedWeek: string }) {
  const { colors } = useTheme();
  const d = data.find((x) => x.week === selectedWeek) ?? { week: '', opened: 0, merged: 0, closed: 0 };
  const MR_KEYS   = ["opened", "merged", "closed"] as const;
  const MR_LABELS = ["Opened", "Merged", "Closed"];
  const MR_COLORS = [colors.chartMrOpened, colors.chartMrMerged, colors.chartMrClosed];
  const maxVal    = Math.max(d.opened, d.merged, d.closed, 1);

  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Merge requests this week</Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 32, height: CHART_H }}>
        {MR_KEYS.map((key, ki) => (
          <View key={key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 }}>
            <View style={{
              width: '100%',
              borderRadius: 2,
              opacity: 0.85,
              height: maxVal === 0 ? 4 : CHART_H * (d[key] / maxVal),
              backgroundColor: MR_COLORS[ki],
            }} />
          </View>
        ))}
      </View>

      <StatsRow stats={MR_KEYS.map((key, i) => ({
        label: MR_LABELS[i],
        value: String(d[key]),
        color: MR_COLORS[i],
      }))} />
    </View>
  );
}

// ─── Tabs Config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "size",      label: "Commit Size",  icon: "⬡" },
  { id: "frequency", label: "Frequency",    icon: "◈" },
  { id: "mrs",       label: "Merge Reqs",   icon: "⬀" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GitLabStatsPanel({ gitlabUrl, memberNetid, memberName, style }: {
  gitlabUrl?: string;
  memberNetid?: string;
  memberName?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState("size");
  const [selectedWeek, setSelectedWeek] = useState("W8");
  const [weeks, setWeeks] = useState<WeekMeta[]>([]);
  const [commitSizeData, setCommitSizeData] = useState<CommitSizeWeek[]>([]);
  const [commitFreqData, setCommitFreqData] = useState<CommitFreqWeek[]>([]);
  const [mrData, setMRData] = useState<MRWeek[]>([]);

  useEffect(() => {
    if (!gitlabUrl || !memberNetid) return;

    (async () => {
      const token = await getGitLabToken();
      if (!token) return;

      const semesterDateStr = await getSemesterStartDate().catch(() => null);
      const semesterStart = semesterDateStr ? new Date(semesterDateStr) : undefined;
      const numWeeks = semesterStart
        ? Math.min(Math.max(Math.ceil((Date.now() - semesterStart.getTime()) / (7 * 86_400_000)), 1), 16)
        : 16;
      const buckets: WeekBucket[] = buildWeekBuckets(numWeeks, semesterStart);
      setWeeks(buckets.map((b) => ({ week: b.week, label: b.label })));
      setSelectedWeek(semesterStart ? 'W1' : `W${buckets.length}`);

      const since = buckets[0].start.toISOString();
      const allCommits = await fetchAllCommitsSince(gitlabUrl, token, since).catch(() => []);
      const commits = filterCommitsByMember(allCommits, memberNetid, memberName ?? '');

      const details = await Promise.all(
        commits.map((c: { id: string }) =>
          fetchCommitDetail(gitlabUrl, token, c.id).catch(() => ({ id: c.id, stats: { additions: 0, deletions: 0, total: 0 } }))
        )
      );
      const statsBySha: Record<string, { additions: number; deletions: number; files: number }> =
        Object.fromEntries(details.map((d: { id: string; stats: { additions: number; deletions: number }; diffs?: { new_path: string }[] }) => [
          d.id,
          { ...d.stats, files: d.diffs?.length ?? 0 },
        ]));

      const sizeData: CommitSizeWeek[] = buckets.map((bucket) => {
        const weekCommits = commits.filter((c: { authored_date: string; created_at: string }) => {
          const t = new Date(c.authored_date || c.created_at).getTime();
          return t >= bucket.start.getTime() && t < bucket.end.getTime();
        });
        return {
          week: bucket.week,
          label: bucket.label,
          additions: weekCommits.reduce((sum: number, c: { id: string }) => sum + (statsBySha[c.id]?.additions ?? 0), 0),
          deletions: weekCommits.reduce((sum: number, c: { id: string }) => sum + (statsBySha[c.id]?.deletions ?? 0), 0),
          files: weekCommits.reduce((sum: number, c: { id: string }) => sum + (statsBySha[c.id]?.files ?? 0), 0),
        };
      });
      setCommitSizeData(sizeData);

      const freqData: CommitFreqWeek[] = buckets.map((bucket) => ({
        week: bucket.week,
        commits: commits.filter((c: { authored_date: string; created_at: string }) => {
          const t = new Date(c.authored_date || c.created_at).getTime();
          return t >= bucket.start.getTime() && t < bucket.end.getTime();
        }).length,
      }));
      setCommitFreqData(freqData);

      const mrs = await fetchMemberMergeRequests(gitlabUrl, token, memberNetid, since, memberName ?? '').catch(() => []);
      const mrBuckets: MRWeek[] = buckets.map((bucket) => {
        const inBucket = (iso: string | null) => {
          if (!iso) return false;
          const t = new Date(iso).getTime();
          return t >= bucket.start.getTime() && t < bucket.end.getTime();
        };
        return {
          week: bucket.week,
          opened: mrs.filter((mr) => inBucket(mr.created_at)).length,
          merged: mrs.filter((mr) => inBucket(mr.merged_at)).length,
          closed: mrs.filter((mr) => mr.state === 'closed' && inBucket(mr.closed_at)).length,
        };
      });
      setMRData(mrBuckets);
    })();
  }, [gitlabUrl, memberNetid]);

  return (
    <View style={[{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }, style]}>

      {/* Top Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.borderMedium, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16 }}>🦊</Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Gitlab Statistics</Text>
        </View>
        <TouchableOpacity
          onPress={() => gitlabUrl && Linking.openURL(gitlabUrl)}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.chartMrOpened }}
          activeOpacity={0.8}
        >
          <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 12 }}>Open Repo ↗</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 8 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.chartMrOpened : 'transparent',
                marginBottom: -1,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, color: isActive ? colors.chartMrOpened : colors.textMuted }}>{tab.icon}</Text>
              <Text style={{ fontSize: 12, color: isActive ? colors.text : colors.textMuted, fontWeight: isActive ? '700' : '400' }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View style={{ flex: 1, padding: 12 }}>
        {activeTab !== "frequency" && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            {weeks.length > 0 && (
              <WeekDropdown weeks={weeks} selectedWeek={selectedWeek} onSelect={setSelectedWeek} />
            )}
          </View>
        )}

        <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
          {activeTab === "size"      && <CommitSizeChart      data={commitSizeData} selectedWeek={selectedWeek} />}
          {activeTab === "frequency" && <CommitFrequencyChart data={commitFreqData} />}
          {activeTab === "mrs"       && <MergeRequestChart    data={mrData}         selectedWeek={selectedWeek} />}
        </View>
      </View>
    </View>
  );
}
