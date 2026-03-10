import { View, Text, ScrollView, TouchableOpacity } from "react-native";

type ProgressLevel = "excellent" | "good" | "moderate" | "danger" | "ungraded";

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
  excellent: "bg-blue-500",
  good: "bg-green-500",
  moderate: "bg-yellow-400",
  danger: "bg-red-500",
  ungraded: "bg-gray-400",
};

const labelMap = {
  excellent: "Excellent",
  good: "Good",
  moderate: "Moderate",
  danger: "In Danger",
  ungraded: "Ungraded",
};

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

export default function TeamProgressScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">

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

      {/* CATME CARD */}
      <View className="bg-white rounded-xl p-4 shadow mt-6">
        <Text className="text-lg font-semibold mb-3">
          CATME Peer Evaluation Results
        </Text>

        <View className="flex-row mb-2">
          <Text className="flex-1 text-gray-500 text-xs">Student Name</Text>
          <Text className="flex-1 text-gray-500 text-xs">Ratings</Text>
          <Text className="flex-1 text-gray-500 text-xs">Adjustment Factor</Text>
          <Text className="flex-1 text-gray-500 text-xs">Status</Text>
        </View>

        <View className="py-6 items-center">
          <Text className="text-gray-400 text-sm">
            No CATME data available.
          </Text>
        </View>
      </View>

      {/* TEAM COMMENTS */}
      <View className="bg-white rounded-xl p-4 shadow mt-6 mb-12">
        <Text className="text-lg font-semibold mb-3">Team Comments</Text>
        <Text className="text-gray-400">No comments yet.</Text>
      </View>

    </ScrollView>
  );
}