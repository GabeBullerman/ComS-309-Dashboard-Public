import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  Pressable,
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

// ─── Data Types ───────────────────────────────────────────────────────────────

type CommitSizeWeek   = { week: string; label: string; additions: number; deletions: number; files: number };
type CommitFreqWeek   = { week: string; commits: number };
type MRWeek           = { week: string; opened: number; merged: number; closed: number };
type WeekMeta         = { week: string; label: string };

const CHART_H = 140;

// ─── Week Dropdown ────────────────────────────────────────────────────────────

function WeekDropdown({
  weeks,
  selectedWeek,
  onSelect,
}: {
  weeks: WeekMeta[];
  selectedWeek: string;
  onSelect: (week: string) => void;
}) {
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
      {/* Trigger */}
      <TouchableOpacity
        ref={triggerRef}
        onPress={openDropdown}
        className="flex-row items-center gap-1.5 px-2.5 py-1 rounded bg-[#d6d6d6] border border-[#b9b9b9]"
        activeOpacity={0.7}
      >
        <Text className="text-[#3a3a3a] text-[11px] font-semibold">{selected.week}</Text>
        <Text className="text-[#7B82A0] text-[10px]">{selected.label}</Text>
        <Text className="text-[#7B82A0] text-[10px] ml-1">▾</Text>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View
            className="absolute bg-white rounded-xl border border-[#b9b9b9] overflow-hidden shadow"
            style={{
              top: dropdownPos.y + 4,
              left: dropdownPos.x,
              minWidth: Math.max(dropdownPos.width, 200),
            }}
          >
            {weeks.map((w, i) => {
              const isActive = w.week === selectedWeek;
              return (
                <TouchableOpacity
                  key={w.week}
                  onPress={() => { onSelect(w.week); setOpen(false); }}
                  className={`flex-row items-center justify-between px-4 py-2.5 ${
                    i < weeks.length - 1 ? "border-b border-[#ececec]" : ""
                  } ${isActive ? "bg-[#fff0f0]" : "bg-white"}`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs font-bold mr-3 ${isActive ? "text-[#E53935]" : "text-[#3a3a3a]"}`}>
                    {w.week}
                  </Text>
                  <Text className="text-[#7B82A0] text-[11px]">{w.label}</Text>
                  {isActive && <Text className="text-[#E53935] text-xs ml-2">✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Shared: Legend ───────────────────────────────────────────────────────────

function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <View className={`flex-row gap-3 mb-2.5 ${className || ""}`}>
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-1">
          <View className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <Text className="text-[#7B82A0] text-[11px]">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Shared: Stats Row ────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: { label: string; value: string; color: string }[] }) {
  return (
    <View className="flex-row justify-around mt-3.5">
      {stats.map((s) => (
        <View key={s.label} className="items-center">
          <Text className="text-xl font-bold" style={{ color: s.color }}>{s.value}</Text>
          <Text className="text-[#7B82A0] text-[10px] mt-0.5">{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Commit Size Chart ────────────────────────────────────────────────────────

function CommitSizeChart({ data, selectedWeek }: { data: CommitSizeWeek[]; selectedWeek: string }) {
  const d = data.find((x) => x.week === selectedWeek) ?? { additions: 0, deletions: 0, files: 0, week: '', label: '' };
  const maxVal = Math.max(d.additions, d.deletions, 1);

  return (
    <View>
      <Text className="text-[#7B82A0] text-xs mb-2">Lines added / removed</Text>
      <Legend items={[{ label: "Additions", color: "#31C48D" }, { label: "Deletions", color: "#978282" }]} className="pb-8" />

      <View className="flex-row items-end gap-8 px-8" style={{ height: CHART_H }}>
        {/* Additions bar */}
        <View className="flex-1 items-center justify-end h-full gap-1">
          <Text className="text-[#31C48D] text-xs font-bold">{d.additions.toLocaleString()}</Text>
          <View
            className="w-full rounded opacity-85"
            style={{ height: CHART_H * (d.additions / maxVal), backgroundColor: "#31C48D" }}
          />
          <Text className="text-[#7B82A0] text-[10px] mt-1">Additions</Text>
        </View>

        {/* Deletions bar */}
        <View className="flex-1 items-center justify-end h-full gap-1">
          <Text className="text-[#978282] text-xs font-bold">{d.deletions.toLocaleString()}</Text>
          <View
            className="w-full rounded opacity-85"
            style={{ height: CHART_H * (d.deletions / maxVal), backgroundColor: "#978282" }}
          />
          <Text className="text-[#7B82A0] text-[10px] mt-1">Deletions</Text>
        </View>
      </View>

      <StatsRow stats={[
        { label: "Additions",     value: d.additions.toLocaleString(), color: "#31C48D" },
        { label: "Deletions",     value: d.deletions.toLocaleString(), color: "#978282" },
        { label: "Files Changed", value: String(d.files),              color: "#6E57E0" },
      ]} />
    </View>
  );
}

// ─── Commit Frequency Chart ───────────────────────────────────────────────────

function CommitFrequencyChart({ data, selectedWeek }: { data: CommitFreqWeek[]; selectedWeek: string }) {
  const d = data.find((x) => x.week === selectedWeek) ?? { week: '', commits: 0 };
  const maxVal = Math.max(...data.map((x) => x.commits), 1);

  return (
    <View>
      <Text className="text-[#7B82A0] text-xs mb-12">Commits this week</Text>

      <View className="items-center justify-end px-16" style={{ height: CHART_H }}>
        <Text className="text-[#6E57E0] text-lg font-bold mb-2">{d.commits}</Text>
        <View
          className="w-full rounded opacity-85"
          style={{ height: CHART_H * (d.commits / maxVal), backgroundColor: "#6E57E0" }}
        />
        <Text className="text-[#7B82A0] text-[10px] mt-2">Commits</Text>
      </View>

      <StatsRow stats={[
        { label: "This Week",  value: String(d.commits), color: "#6E57E0" },
        { label: "Season Max", value: String(maxVal),     color: "#6E57E0" },
        { label: "vs Max",     value: `${Math.round((d.commits / Math.max(maxVal, 1)) * 100)}%`, color: "#6E57E0" },
      ]} />
    </View>
  );
}

// ─── Merge Request Chart ──────────────────────────────────────────────────────

function MergeRequestChart({ data, selectedWeek }: { data: MRWeek[]; selectedWeek: string }) {
  const d = data.find((x) => x.week === selectedWeek) ?? { week: '', opened: 0, merged: 0, closed: 0 };
  const MR_KEYS   = ["opened", "merged", "closed"] as const;
  const MR_LABELS = ["Opened", "Merged", "Closed"];
  const MR_COLORS = ["#E53935", "#31C48D", "#978282"];
  const maxVal    = Math.max(d.opened, d.merged, d.closed, 1);

  return (
    <View>
      <Text className="text-[#7B82A0] text-xs mb-2">Merge requests this week</Text>
      <Legend items={MR_LABELS.map((label, i) => ({ label, color: MR_COLORS[i] }))} className="pb-8"/>

      <View className="flex-row items-end gap-4 px-8" style={{ height: CHART_H }}>
        {MR_KEYS.map((key, ki) => (
          <View key={key} className="flex-1 items-center justify-end h-full gap-1">
            <Text className="text-xs font-bold" style={{ color: MR_COLORS[ki] }}>{d[key]}</Text>
            <View
              className="w-full rounded-sm opacity-85"
              style={{
                height: maxVal === 0 ? 4 : CHART_H * (d[key] / maxVal),
                backgroundColor: MR_COLORS[ki],
              }}
            />
            <Text className="text-[#7B82A0] text-[10px] mt-1">{MR_LABELS[ki]}</Text>
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
  { id: "size",      label: "Commit Size",    icon: "⬡" },
  { id: "frequency", label: "Frequency",      icon: "◈" },
  { id: "mrs",       label: "Merge Requests", icon: "⬀" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GitLabStatsPanel({
  gitlabUrl,
  memberNetid,
  memberName,
}: {
  gitlabUrl?: string;
  memberNetid?: string;
  memberName?: string;
}) {
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

      const buckets: WeekBucket[] = buildWeekBuckets(8);
      setWeeks(buckets.map((b) => ({ week: b.week, label: b.label })));
      setSelectedWeek(`W${buckets.length}`); // default to most recent

      const since = buckets[0].start.toISOString();

      const allCommits = await fetchAllCommitsSince(gitlabUrl, token, since).catch(() => []);
      const commits = filterCommitsByMember(allCommits, memberNetid, memberName ?? '');

      // Fetch individual commit details for additions/deletions (parallel)
      const details = await Promise.all(
        commits.map((c: { id: string }) =>
          fetchCommitDetail(gitlabUrl, token, c.id).catch(() => ({
            id: c.id,
            stats: { additions: 0, deletions: 0, total: 0 },
          }))
        )
      );
      const statsBySha: Record<string, { additions: number; deletions: number }> =
        Object.fromEntries(details.map((d: { id: string; stats: { additions: number; deletions: number } }) => [d.id, d.stats]));

      // Group into weekly buckets
      const sizeData: CommitSizeWeek[] = buckets.map((bucket) => {
        const weekCommits = commits.filter((c: { created_at: string }) => {
          const t = new Date(c.created_at).getTime();
          return t >= bucket.start.getTime() && t < bucket.end.getTime();
        });
        return {
          week: bucket.week,
          label: bucket.label,
          additions: weekCommits.reduce((sum: number, c: { id: string }) => sum + (statsBySha[c.id]?.additions ?? 0), 0),
          deletions: weekCommits.reduce((sum: number, c: { id: string }) => sum + (statsBySha[c.id]?.deletions ?? 0), 0),
          files: 0,
        };
      });
      setCommitSizeData(sizeData);

      const freqData: CommitFreqWeek[] = buckets.map((bucket) => ({
        week: bucket.week,
        commits: commits.filter((c: { created_at: string }) => {
          const t = new Date(c.created_at).getTime();
          return t >= bucket.start.getTime() && t < bucket.end.getTime();
        }).length,
      }));
      setCommitFreqData(freqData);

      // Fetch MRs authored by this member over the full period
      const mrs = await fetchMemberMergeRequests(gitlabUrl, token, memberNetid, since, memberName ?? '').catch(() => []);

      const mrBuckets: MRWeek[] = buckets.map((bucket) => {
        const inBucket = (iso: string | null) => {
          if (!iso) return false;
          const t = new Date(iso).getTime();
          return t >= bucket.start.getTime() && t < bucket.end.getTime();
        };
        return {
          week: bucket.week,
          // opened = MRs created this week
          opened: mrs.filter((mr) => inBucket(mr.created_at)).length,
          // merged = MRs merged this week
          merged: mrs.filter((mr) => inBucket(mr.merged_at)).length,
          // closed = MRs closed (not merged) this week
          closed: mrs.filter((mr) => mr.state === 'closed' && inBucket(mr.closed_at)).length,
        };
      });
      setMRData(mrBuckets);
    })();
  }, [gitlabUrl, memberNetid]);

  return (
    <View className="flex-1 bg-white shadow rounded-xl mt-6 mb-2 overflow-hidden">

      {/* ── Top Bar ── */}
      <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-[#b9b9b9] bg-white">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-lg bg-[#2D2D2D] items-center justify-center">
            <Text className="text-base">🦊</Text>
          </View>
          <Text className="text-base font-semibold ml-2">Gitlab Statistics</Text>
        </View>

        <TouchableOpacity
          onPress={() => gitlabUrl && Linking.openURL(gitlabUrl)}
          className="px-3.5 py-2 rounded-lg bg-[#E53935]"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-xs tracking-wide">Open Repo ↗</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ── */}
      <View className="flex-row bg-white border-b border-[#b9b9b9] px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              className="flex-row items-center gap-1.5 px-3.5 py-3"
              style={{
                borderBottomWidth: 2,
                borderBottomColor: isActive ? "#E53935" : "transparent",
                marginBottom: -1,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, color: isActive ? "#E53935" : "#7B82A0" }}>{tab.icon}</Text>
              <Text className={isActive ? "text-black font-bold text-[13px]" : "text-[#7B82A0] text-[13px]"}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab Content ── */}
      <ScrollView className="flex-1" contentContainerClassName="p-5" showsVerticalScrollIndicator={false}>

        {/* Week selector row */}
        <View className="flex-row items-center mb-4">
          {weeks.length > 0 && (
            <WeekDropdown weeks={weeks} selectedWeek={selectedWeek} onSelect={setSelectedWeek} />
          )}
        </View>

        {/* Chart card */}
        <View className="bg-white rounded-xl border border-[#b9b9b9] p-4">
          {activeTab === "size"      && <CommitSizeChart      data={commitSizeData} selectedWeek={selectedWeek} />}
          {activeTab === "frequency" && <CommitFrequencyChart data={commitFreqData} selectedWeek={selectedWeek} />}
          {activeTab === "mrs"       && <MergeRequestChart    data={mrData}         selectedWeek={selectedWeek} />}
        </View>

      </ScrollView>
    </View>
  );
}
