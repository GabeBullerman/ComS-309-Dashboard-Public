import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from "App";
import MemberAttendance from "@/components/MemberAttendance";
import MemberComments from "@/components/Comments";
import TeamProgress from "@/components/TeamProgress";
import GitLabStatsPanel from "@/components/GitlabStats";
import { NativeStackScreenProps } from "node_modules/@react-navigation/native-stack/lib/typescript/src/types";
import { getCurrentUser } from "@/api/users";

type TeamMemberDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamMemberDetail'>;

export default function TeamProgressScreen({ navigation, route }: TeamMemberDetailProps) {
  const { member, teamId } = route.params;
  const [authorNetid, setAuthorNetid] = useState<string | undefined>(undefined);
  const [isStudent, setIsStudent] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const pad = isMobile ? 12 : 20;

  const INNER = isMobile ? 80 : 128;
  const RADIUS_INNER = isMobile ? 20 : 32;

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.netid) setAuthorNetid(u.netid);
      if (u?.role?.toLowerCase() === 'student') setIsStudent(true);
    });
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F3F4F6', paddingTop: statusBarHeight + (isMobile ? 12 : 24) }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: pad, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '700', color: '#111827' }}>{member.name}</Text>
      </View>

      {/* Avatar */}
      <View style={{ alignItems: 'center', paddingVertical: isMobile ? 12 : 16 }}>
        <Image
          source={typeof member.photo === 'string' ? { uri: member.photo } : member.photo}
          style={{ width: INNER, height: INNER, borderRadius: RADIUS_INNER }}
        />
      </View>

      {/* Team Progress Card */}
      <View style={{ paddingHorizontal: pad, marginBottom: 12 }}>
        <TeamProgress readOnly={isStudent} />
      </View>

      {/* Attendance + GitLab Stats — side by side on desktop, stacked on mobile */}
      {isMobile ? (
        <View style={{ paddingHorizontal: pad, gap: 12 }}>
          <MemberAttendance readOnly={isStudent} />
          <GitLabStatsPanel gitlabUrl={route.params.gitlabUrl} memberNetid={member.netid} memberName={member.name} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', paddingHorizontal: pad, gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <MemberAttendance readOnly={isStudent} />
          </View>
          <View style={{ flex: 1 }}>
            <GitLabStatsPanel gitlabUrl={route.params.gitlabUrl} memberNetid={member.netid} memberName={member.name} />
          </View>
        </View>
      )}

      {/* Comments */}
      <View style={{ paddingHorizontal: pad, marginTop: 12 }}>
        <MemberComments recipientNetid={member.netid} teamId={teamId} authorNetid={authorNetid} isStudent={isStudent} />
      </View>
    </ScrollView>
  );
}
