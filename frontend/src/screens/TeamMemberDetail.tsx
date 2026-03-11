import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from "App";
import MemberAttendance from "@/components/MemberAttendance";
import MemberComments from "@/components/Comments";
import TeamProgress from "@/components/TeamProgress";
import { NativeStackScreenProps } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";

const INNER = 128;
const RADIUS_INNER = 32;

type TeamMemberDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamMemberDetail'>;

export default function TeamProgressScreen({navigation, route}: TeamMemberDetailProps) {
  const { member } = route.params;

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
    <TeamProgress />

  {/* MEMBER ATTENDANCE */}
    <MemberAttendance />

  {/* MEMBER COMMENTS */}
    <MemberComments />
  </ScrollView>
  );
}