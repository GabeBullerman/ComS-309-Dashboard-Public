import React from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Status = "Active" | "Pending" | "Completed";

interface Team {
  name: string;
  project: string;
  members: number;
  lastActive: string;
  semester: string;
  status: Status;
  avatars: string[];
}

const TEAMS: Team[] = [
  {
    name: "Team Cyclone",
    project: "IoT Smart Home System",
    members: 4,
    lastActive: "2 hours ago",
    semester: "Spring 2026",
    status: "Active",
    avatars: ["AJ", "EC", "MB", "+1"],
  },
  {
    name: "Cardinal Engineers",
    project: "Machine Learning Optimization",
    members: 3,
    lastActive: "1 day ago",
    semester: "Spring 2026",
    status: "Active",
    avatars: ["DW", "JM", "RT"],
  },
  {
    name: "Gold Rush",
    project: "Sustainable Energy Dashboard",
    members: 5,
    lastActive: "3 days ago",
    semester: "Spring 2026",
    status: "Pending",
    avatars: ["AW", "CA", "NT", "+2"],
  },
  {
    name: "Innovators United",
    project: "Campus Navigation App",
    members: 4,
    lastActive: "1 week ago",
    semester: "Fall 2025",
    status: "Completed",
    avatars: ["DH", "OM", "MT", "+1"],
  },
];

export default function ClassTeamsScreen() {
  return (
    <View className="flex-row flex-1 bg-gray-50">
      {/* Sidebar */}
      <View className="w-60 bg-red-700 p-5">
        <Text className="text-white text-lg font-bold">
          Class Dashboard
        </Text>
        <Text className="text-red-200 mb-6">
          Iowa State University
        </Text>

        {[
          "Dashboard",
          "Teams",
          "Courses",
          "Analytics",
          "Assignments",
          "Settings",
        ].map((item) => (
          <TouchableOpacity
            key={item}
            className={`rounded-lg px-4 py-3 mb-2 ${
              item === "Teams"
                ? "bg-yellow-400"
                : ""
            }`}
          >
            <Text
              className={`font-medium ${
                item === "Teams"
                  ? "text-yellow-900"
                  : "text-white"
              }`}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <View className="flex-1 p-6">
        <Text className="text-2xl font-bold">
          Class Teams
        </Text>
        <Text className="text-gray-500 mb-4">
          Manage and view all student teams for your courses
        </Text>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search teams, projects, or members..."
            className="ml-2 flex-1 text-sm"
          />
        </View>

        {/* Filters */}
        <View className="flex-row space-x-6 mb-4">
          <Text className="text-gray-700">Status: All</Text>
          <Text className="text-gray-700">Semester: All</Text>
        </View>

        <Text className="text-gray-500 mb-4">
          Showing {TEAMS.length} of {TEAMS.length} teams
        </Text>

        {/* Cards */}
        <ScrollView contentContainerClassName="flex-row flex-wrap gap-4">
          {TEAMS.map((team) => (
            <View
              key={team.name}
              className="w-80 bg-white rounded-xl p-4"
            >
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-bold text-base">
                  {team.name}
                </Text>
                <StatusBadge status={team.status} />
              </View>

              <Text className="text-gray-500 mb-3">
                {team.project}
              </Text>

              <InfoRow
                icon="people-outline"
                text={`${team.members} members`}
              />
              <InfoRow
                icon="time-outline"
                text={`Last active: ${team.lastActive}`}
              />
              <InfoRow
                icon="calendar-outline"
                text={team.semester}
              />

              <View className="flex-row mt-3">
                {team.avatars.map((a) => (
                  <View
                    key={a}
                    className="w-8 h-8 rounded-full bg-yellow-400 items-center justify-center mr-2"
                  >
                    <Text className="text-xs font-bold text-yellow-900">
                      {a}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View className="flex-row items-center mb-1">
      <Ionicons name={icon} size={14} color="#6B7280" />
      <Text className="ml-2 text-sm text-gray-700">
        {text}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles =
    status === "Active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-blue-100 text-blue-700";

  return (
    <View className={`px-3 py-1 rounded-full ${styles}`}>
      <Text className="text-xs font-semibold">
        {status}
      </Text>
    </View>
  );
}