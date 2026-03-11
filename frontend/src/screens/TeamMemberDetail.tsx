import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from "App";
import MemberAttendance from "@/components/MemberAttendance";
import MemberComments from "@/components/Comments";
import { NativeStackScreenProps } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";
import { useState } from "react";

type ProgressLevel = "good" | "moderate" | "poor" | "ungraded";

interface DemoRow {
  demo: string;
  code: ProgressLevel;
  teamwork: ProgressLevel;
}

const colorMap = {
  good: "bg-green-500",
  moderate: "bg-yellow-400",
  poor: "bg-red-500",
  ungraded: "bg-gray-400",
};

const labelMap = {
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
  ungraded: "Ungraded",
};

const INNER = 128;
const RADIUS_INNER = 32;
const levels: ProgressLevel[] = ["ungraded", "good", "moderate", "poor"];
function ProgressBar({ level, onPress }: { level: ProgressLevel; onPress: (level: ProgressLevel) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1">
      {/* The bar itself */}
      <TouchableOpacity
        className="h-8 bg-gray-200 rounded-md overflow-hidden justify-center"
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <View className={`h-full ${colorMap[level]} items-center justify-center flex-row`}>
          <Text className="text-white text-xs font-semibold mr-1">{labelMap[level]}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color="white" />
        </View>
      </TouchableOpacity>

      {/* Inline dropdown */}
      {open && (
        <View className="bg-white border border-gray-200 rounded-md shadow mt-1 z-10">
          {levels.map((l) => (
            <TouchableOpacity
              key={l}
              className="flex-row items-center px-3 py-2 border-b border-gray-100"
              onPress={() => { onPress(l); setOpen(false); }}
            >
              <View className={`w-3 h-3 rounded-full mr-2 ${colorMap[l]}`} />
              <Text className="text-xs text-gray-700">{labelMap[l]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

type TeamMemberDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamMemberDetail'>;

export default function TeamProgressScreen({navigation, route}: TeamMemberDetailProps) {
  const { member } = route.params;
  const [commentText, setCommentText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  const [demos, setDemos] = useState<DemoRow[]>([
    { demo: "Demo 1", code: "good", teamwork: "ungraded" },
    { demo: "Demo 2", code: "ungraded", teamwork: "ungraded" },
    { demo: "Demo 3", code: "ungraded", teamwork: "ungraded" },
    { demo: "Demo 4", code: "ungraded", teamwork: "ungraded" },
  ]);

  const setLevel = (rowIndex: number, field: "code" | "teamwork", level: ProgressLevel) => {
  setDemos(prev => prev.map((row, i) =>
    i === rowIndex ? { ...row, [field]: level } : row
  ));
};

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4 pt-16">
      {/* Back Button */}
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-4">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-xl text-center font-bold flex-1">{member.name}</Text>
      </View>
      {/* Header */}
      <View className="flex-row items-center pl-10 py-4">
        <View className="flex-1 items-center">
          <Image
            source={typeof member.photo === 'string' ? { uri: member.photo } : member.photo}
            style={{ width: INNER, height: INNER, borderRadius: RADIUS_INNER }}
          />
        </View>
      </View>

      {/* TEAM PROGRESS CARD */}
      <View className="bg-white rounded-xl p-4 shadow">

        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold mr-3">Team Progress</Text>

            <View className="bg-yellow-100 px-2 py-1 rounded">
              <Text className="text-yellow-700 text-xs font-medium">
                Unsaved Changes
              </Text>
            </View>
          </View>

          <TouchableOpacity className="bg-red-600 px-4 py-2 rounded-lg">
            <Text className="text-white font-semibold">Save Changes</Text>
          </TouchableOpacity>
        </View>

        {/* COLUMN HEADERS */}
        <View className="flex-row mb-2">
          <Text className="w-20 text-gray-500 text-xs">Demo</Text>
          <Text className="flex-1 text-gray-500 text-xs">Code Progress</Text>
          <Text className="flex-1 text-gray-500 text-xs">Teamwork</Text>
        </View>

        {/* ROWS */}
        {demos.map((row, index) => (
          <View key={index} className="flex-row items-center mb-3 space-x-2">
            <TouchableOpacity className="w-20 bg-gray-100 py-2 rounded items-center">
              <Text className="text-xs">{row.demo}</Text>
            </TouchableOpacity>

          <ProgressBar level={row.code} onPress={(l) => setLevel(index, "code", l)} />
          <ProgressBar level={row.teamwork} onPress={(l) => setLevel(index, "teamwork", l)} />
          </View>
        ))}

        {/* LEGEND */}
        <View className="flex-row flex-wrap mt-4 items-center">
          {Object.entries(labelMap).map(([key, label]) => (
            <View key={key} className="flex-row items-center mr-4 mb-2">
              <View className={`w-3 h-3 rounded-full mr-2 ${colorMap[key as ProgressLevel]}`} />
              <Text className="text-xs text-gray-600">{label}</Text>
            </View>
          ))}
        </View>
      </View>

  {/* MEMBER ATTENDANCE */}
    <MemberAttendance />

  {/* MEMBER COMMENTS */}
    <MemberComments />
  </ScrollView>
  );
}