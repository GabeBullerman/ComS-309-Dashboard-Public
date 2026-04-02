import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
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
import MemberAvatar from "@/components/MemberAvatar";

type TeamMemberDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamMemberDetail'>;

export default function TeamProgressScreen({ navigation, route }: TeamMemberDetailProps) {
  const { member, teamId, teamName } = route.params;
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
      <View style={{ paddingHorizontal: pad, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>{teamName ?? 'Team'}</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar + name */}
      <View style={{ alignItems: 'center', paddingVertical: isMobile ? 12 : 16 }}>
        <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
          {member.name}
        </Text>
        <MemberAvatar
          memberId={member.netid || member.name}
          initials={member.initials}
          size={INNER}
          borderRadius={RADIUS_INNER}
          canEdit={!isStudent}
          bordered
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
            <MemberAttendance readOnly={isStudent} style={{ flex: 1, marginBottom: 0 }} />
          </View>
          <View style={{ flex: 1 }}>
            <GitLabStatsPanel gitlabUrl={route.params.gitlabUrl} memberNetid={member.netid} memberName={member.name} style={{ flex: 1, marginBottom: 0 }} />
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
