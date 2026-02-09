import { View, Text } from "react-native";
import { Team } from "../types/Teams.ts";

interface TeamCardProps {
  team: Team;
}

export default function TeamCard({ team }: TeamCardProps) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        margin: 8,
        flex: 1,
        elevation: 2,
      }}
    >
      <Text style={{ fontWeight: "bold", fontSize: 16 }}>
        {team.name}
      </Text>

      <Text style={{ color: "#666" }}>
        {team.project}
      </Text>

      <Text>{team.members} members</Text>
      <Text>Last active: {team.lastActive}</Text>
      <Text>{team.semester}</Text>

      <View
        style={{
          marginTop: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 16,
          backgroundColor:
            team.status === "Active" ? "#d4f7dc" : "#ffe4b5",
          alignSelf: "flex-start",
        }}
      >
        <Text>{team.status}</Text>
      </View>
    </View>
  );
}