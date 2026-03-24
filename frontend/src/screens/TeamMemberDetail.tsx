import { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from "App";
import MemberAttendance from "@/components/MemberAttendance";
import MemberComments from "@/components/Comments";
import TeamProgress from "@/components/TeamProgress";
import GitLabStatsPanel from "@/components/GitlabStats";
import { NativeStackScreenProps } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";
import { getCurrentUser } from "@/api/users";

const INNER = 128;
const RADIUS_INNER = 32;

type TeamMemberDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamMemberDetail'>;

export default function TeamProgressScreen({navigation, route}: TeamMemberDetailProps) {
  const { member, teamId } = route.params;
  const [authorNetid, setAuthorNetid] = useState<string | undefined>(undefined);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.netid) setAuthorNetid(u.netid);
      if (u?.role?.toLowerCase() === 'student') setIsStudent(true);
    });
  }, []);

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

      {/* MEMBER ATTENDANCE + GITLAB STATS */}
      <View className="flex-row gap-4 mt-4">
        <View className="flex-1">
          <MemberAttendance readOnly={isStudent} />
        </View>
        <View className="flex-1">
          <GitLabStatsPanel gitlabUrl={route.params.gitlabUrl} memberNetid={member.netid} memberName={member.name} />
        </View>
      </View>

      {/* MEMBER COMMENTS */}
      <MemberComments recipientNetid={member.netid} teamId={teamId} authorNetid={authorNetid} isStudent={isStudent} />
    </ScrollView>
  );
}