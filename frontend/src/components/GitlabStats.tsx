import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Modal,
  Pressable,
} from "react-native";
 
// ─── Mock Data ────────────────────────────────────────────────────────────────
 
const GITLAB_URL = "https://gitlab.com/your-org/your-repo";
 
const commitSizeData = [
  { week: "W1", label: "Jan 27 – Feb 2",  additions: 420,  deletions: 130, files: 6  },
  { week: "W2", label: "Feb 3 – Feb 9",   additions: 890,  deletions: 240, files: 14 },
  { week: "W3", label: "Feb 10 – Feb 16", additions: 310,  deletions: 80,  files: 4  },
  { week: "W4", label: "Feb 17 – Feb 23", additions: 1240, deletions: 560, files: 22 },
  { week: "W5", label: "Feb 24 – Mar 2",  additions: 670,  deletions: 200, files: 9  },
  { week: "W6", label: "Mar 3 – Mar 9",   additions: 530,  deletions: 170, files: 7  },
  { week: "W7", label: "Mar 10 – Mar 16", additions: 980,  deletions: 390, files: 16 },
  { week: "W8", label: "Mar 17 – Mar 23", additions: 750,  deletions: 310, files: 11 },
];
 
const commitFrequencyData = [
  { week: "W1", commits: 8  },
  { week: "W2", commits: 15 },
  { week: "W3", commits: 5  },
  { week: "W4", commits: 21 },
  { week: "W5", commits: 12 },
  { week: "W6", commits: 9  },
  { week: "W7", commits: 18 },
  { week: "W8", commits: 14 },
];
 
const mergeRequestData = [
  { week: "W1", opened: 2, merged: 1, closed: 0 },
  { week: "W2", opened: 4, merged: 3, closed: 1 },
  { week: "W3", opened: 1, merged: 2, closed: 0 },
  { week: "W4", opened: 6, merged: 4, closed: 2 },
  { week: "W5", opened: 3, merged: 3, closed: 1 },
  { week: "W6", opened: 2, merged: 2, closed: 0 },
  { week: "W7", opened: 5, merged: 4, closed: 1 },
  { week: "W8", opened: 3, merged: 3, closed: 0 },
];
 
const WEEKS = commitSizeData.map((d) => ({ week: d.week, label: d.label }));
 
const CHART_H = 140;
 
// ─── Week Dropdown ────────────────────────────────────────────────────────────
 
function WeekDropdown({
  selectedWeek,
  onSelect,
}: {
  selectedWeek: string;
  onSelect: (week: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0, width: 0 });
  const triggerRef = useRef<TouchableOpacity>(null);
  const selected = WEEKS.find((w) => w.week === selectedWeek)!;

  const openDropdown = () => {
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setDropdownPos({ x: px, y: py + height, width });
      setOpen(true);
    });
  };

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
            {WEEKS.map((w, i) => {
              const isActive = w.week === selectedWeek;
              return (
                <TouchableOpacity
                  key={w.week}
                  onPress={() => { onSelect(w.week); setOpen(false); }}
                  className={`flex-row items-center justify-between px-4 py-2.5 ${
                    i < WEEKS.length - 1 ? "border-b border-[#ececec]" : ""
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
 
function CommitSizeChart({ selectedWeek }: { selectedWeek: string }) {
  const d = commitSizeData.find((x) => x.week === selectedWeek)!;
  const maxVal = Math.max(d.additions, d.deletions);
 
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
        { label: "Additions", value: d.additions.toLocaleString(), color: "#31C48D" },
        { label: "Deletions", value: d.deletions.toLocaleString(), color: "#978282" },
        { label: "Files Changed", value: String(d.files),          color: "#6E57E0" },
      ]} />
    </View>
  );
}
 
// ─── Commit Frequency Chart ───────────────────────────────────────────────────
 
function CommitFrequencyChart({ selectedWeek }: { selectedWeek: string }) {
  const d = commitFrequencyData.find((x) => x.week === selectedWeek)!;
  const maxVal = Math.max(...commitFrequencyData.map((x) => x.commits));
 
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
        { label: "vs Max",     value: `${Math.round((d.commits / maxVal) * 100)}%`, color: "#6E57E0" },
      ]} />
    </View>
  );
}
 
// ─── Merge Request Chart ──────────────────────────────────────────────────────
 
function MergeRequestChart({ selectedWeek }: { selectedWeek: string }) {
  const d = mergeRequestData.find((x) => x.week === selectedWeek)!;
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
 
export default function GitLabStatsPanel() {
  const [activeTab, setActiveTab] = useState("size");
  const [selectedWeek, setSelectedWeek] = useState("W8");
 
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
          onPress={() => Linking.openURL(GITLAB_URL)}
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
          <WeekDropdown selectedWeek={selectedWeek} onSelect={setSelectedWeek} />
        </View>
 
        {/* Chart card */}
        <View className="bg-white rounded-xl border border-[#b9b9b9] p-4">
          {activeTab === "size"      && <CommitSizeChart      selectedWeek={selectedWeek} />}
          {activeTab === "frequency" && <CommitFrequencyChart selectedWeek={selectedWeek} />}
          {activeTab === "mrs"       && <MergeRequestChart    selectedWeek={selectedWeek} />}
        </View>
 
      </ScrollView>
    </View>
  );
}