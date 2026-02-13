import { View, Text } from "react-native";
import { Picker } from "@react-native-picker/picker";

interface FilterBarProps {
  status: string;
  semester: string;
  onStatusChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
}

export default function FilterBar({
  status,
  semester,
  onStatusChange,
  onSemesterChange,
}: FilterBarProps) {
  return (
    <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
      <Text>Status:</Text>
      <Picker
        selectedValue={status}
        onValueChange={(value) => onStatusChange(value)}
      >
        <Picker.Item label="All" value="All" />
        <Picker.Item label="Active" value="Active" />
        <Picker.Item label="Pending" value="Pending" />
        <Picker.Item label="Completed" value="Completed" />
      </Picker>

      <Text>Semester:</Text>
      <Picker
        selectedValue={semester}
        onValueChange={(value) => onSemesterChange(value)}
      >
        <Picker.Item label="All" value="All" />
        <Picker.Item label="Spring 2026" value="Spring 2026" />
        <Picker.Item label="Fall 2025" value="Fall 2025" />
      </Picker>
    </View>
  );
}