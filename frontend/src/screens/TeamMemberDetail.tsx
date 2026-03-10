import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from "App";
import { NativeStackScreenProps } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";
import { useState } from "react";

type ProgressLevel = "good" | "moderate" | "poor" | "ungraded";

interface DemoRow {
  demo: string;
  code: ProgressLevel;
  teamwork: ProgressLevel;
}

const demoData: DemoRow[] = [
  { demo: "Demo 1", code: "good", teamwork: "ungraded" },
  { demo: "Demo 2", code: "ungraded", teamwork: "ungraded" },
  { demo: "Demo 3", code: "ungraded", teamwork: "ungraded" },
  { demo: "Demo 4", code: "ungraded", teamwork: "ungraded" },
];

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

function ProgressBar({ level }: { level: ProgressLevel }) {
  return (
    <View className="flex-1 h-8 bg-gray-200 rounded-md overflow-hidden justify-center">
      <View className={`h-full ${colorMap[level]} items-center justify-center`}>
        <Text className="text-white text-xs font-semibold">
          {labelMap[level]}
        </Text>
      </View>
    </View>
  );
}

type TeamMemberDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamMemberDetail'>;

export default function TeamProgressScreen({navigation, route}: TeamMemberDetailProps) {
  const { member } = route.params;
  const [commentText, setCommentText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
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
        {demoData.map((row, index) => (
          <View
            key={index}
            className="flex-row items-center mb-3 space-x-2"
          >
            <TouchableOpacity className="w-20 bg-gray-100 py-2 rounded items-center">
              <Text className="text-xs">{row.demo}</Text>
            </TouchableOpacity>

            <ProgressBar level={row.code} />

            <ProgressBar level={row.teamwork} />
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

  {/* TEAM COMMENTS */}
  <View className="bg-white rounded-xl shadow mt-6 mb-12 overflow-hidden">
  
  {/* Header */}
  <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
    <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
    <Text className="text-lg font-semibold ml-2">Team Comments</Text>
  </View>

  {/* Two-column body */}
  <View className="flex-row">

    {/* LEFT: Comment History */}
    <View className="flex-1 p-4 border-r border-gray-200">
      <Text className="text-sm font-semibold text-gray-700 mb-3">Comment History</Text>
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-400 text-sm">No comments available for this team</Text>
      </View>
    </View>

    {/* RIGHT: Add Comment */}
    <View className="flex-1 p-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">Add Comment</Text>

      {/* Comment input */}
      <Text className="text-xs text-gray-600 mb-1">Comment</Text>
      <View className="border border-gray-300 rounded-md mb-1">
        <TextInput
          className="p-2 text-sm text-gray-800 h-28"
          placeholder="Write your comment..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1400} // ~200 words
          value={commentText}
          onChangeText={setCommentText}
          textAlignVertical="top"
        />
      </View>
      <Text className="text-xs text-gray-400 mb-3">
        {commentText.trim() === "" ? 0 : commentText.trim().split(/\s+/).length}/200 words
      </Text>

      {/* Status dropdown (simplified) */}
      <Text className="text-xs text-gray-600 mb-1">Status</Text>
      <View className="border border-gray-300 rounded-md mb-4 overflow-hidden">
        <TouchableOpacity
          className="flex-row items-center justify-between px-3 py-2"
          onPress={() => setStatusOpen(!statusOpen)}
        >
          <Text className={selectedStatus ? "text-sm text-gray-800" : "text-sm text-gray-400"}>
            {selectedStatus ?? "Select Status"}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>
        {statusOpen && (
          <View className="border-t border-gray-200">
            {["Good", "Moderate", "Poor"].map((s) => (
              <TouchableOpacity
                key={s}
                className="px-3 py-2"
                onPress={() => { setSelectedStatus(s); setStatusOpen(false); }}
              >
                <Text className="text-sm text-gray-700">{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity className="bg-red-700 rounded-lg py-3 items-center">
        <Text className="text-white font-semibold text-sm">Submit Comment</Text>
      </TouchableOpacity>
    </View>

  </View>
  </View>

    </ScrollView>
  );
}