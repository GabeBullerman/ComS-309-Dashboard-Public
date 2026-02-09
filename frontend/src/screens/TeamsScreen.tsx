import { FlatList, View } from "react-native";
import FilterBar from "../components/FilterBar.tsx";
import TeamCard from "../components/TeamCard.tsx";
import { teams } from "../data/teams.ts";
import { useState } from "react";

export default function TeamsScreen() {
  const [status, setStatus] = useState("All");
  const [semester, setSemester] = useState("All");

  const filteredTeams = teams.filter(t =>
    (status === "All" || t.status === status) &&
    (semester === "All" || t.semester === semester)
  );

  return (
    <View style={{ padding: 16 }}>
      <FilterBar
        status={status}
        semester={semester}
        onStatusChange={setStatus}
        onSemesterChange={setSemester}
      />

      <FlatList
        data={filteredTeams}
        numColumns={3} // works great on web/tablet
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TeamCard team={item} />}
      />
    </View>
  );
}