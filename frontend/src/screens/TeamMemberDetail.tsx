import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
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
import {
  AtRiskOverride,
  getAtRiskOverridesForStudent,
  createAtRiskOverride,
  clearAtRiskOverridesForStudent,
} from "@/api/atRiskOverrides";

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

  // At-risk override state
  const [overrides, setOverrides] = useState<AtRiskOverride[]>([]);
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagSaving, setFlagSaving] = useState(false);
  const isFlagged = overrides.length > 0;

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u?.netid) setAuthorNetid(u.netid);
      if (u?.role?.toLowerCase() === 'student') setIsStudent(true);
    });
  }, []);

  useEffect(() => {
    if (!member.netid || isStudent) return;
    getAtRiskOverridesForStudent(member.netid).then(setOverrides).catch(() => {});
  }, [member.netid, isStudent]);

  const handleFlag = async () => {
    if (!flagReason.trim() || !member.netid) return;
    setFlagSaving(true);
    try {
      const created = await createAtRiskOverride(member.netid, flagReason.trim());
      setOverrides(prev => [...prev, created]);
      setFlagModalVisible(false);
      setFlagReason('');
    } catch {} finally {
      setFlagSaving(false);
    }
  };

  const handleUnflag = async () => {
    if (!member.netid) return;
    setFlagSaving(true);
    try {
      await clearAtRiskOverridesForStudent(member.netid);
      setOverrides([]);
    } catch {} finally {
      setFlagSaving(false);
    }
  };

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

        {/* At-risk flag button — staff only */}
        {!isStudent && (
          <View style={{ marginTop: 12 }}>
            {isFlagged ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Ionicons name="alert-circle" size={14} color="#dc2626" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#b91c1c' }}>Manually flagged at-risk</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', maxWidth: 260 }} numberOfLines={2}>
                  {overrides[0]?.reason}
                </Text>
                <TouchableOpacity
                  onPress={handleUnflag}
                  disabled={flagSaving}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', opacity: flagSaving ? 0.6 : 1 }}
                >
                  {flagSaving ? <ActivityIndicator size="small" color="#6b7280" /> : <Ionicons name="close-circle-outline" size={14} color="#6b7280" />}
                  <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>Remove flag</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setFlagModalVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff1f2' }}
              >
                <Ionicons name="flag-outline" size={14} color="#dc2626" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#dc2626' }}>Flag as at-risk</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Flag reason modal */}
      <Modal visible={flagModalVisible} transparent animationType="fade" onRequestClose={() => setFlagModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setFlagModalVisible(false)}>
          <Pressable style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, width: Math.min(360, width - 40), gap: 12 }} onPress={e => e.stopPropagation()}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Flag {member.name} as at-risk</Text>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Provide a reason — this will appear on the at-risk students screen.</Text>
            <TextInput
              value={flagReason}
              onChangeText={setFlagReason}
              placeholder="e.g. Missed multiple team meetings, not contributing..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, fontSize: 13, color: '#111827', minHeight: 72, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => { setFlagModalVisible(false); setFlagReason(''); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFlag}
                disabled={!flagReason.trim() || flagSaving}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: flagReason.trim() ? '#dc2626' : '#fca5a5', flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                {flagSaving && <ActivityIndicator size="small" color="white" />}
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'white' }}>Flag student</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Team Progress Card */}
      <View style={{ paddingHorizontal: pad, marginBottom: 12 }}>
        <TeamProgress netid={member.netid ?? ''} readOnly={isStudent} />
      </View>

      {/* Attendance + GitLab Stats — side by side on desktop, stacked on mobile */}
      {isMobile ? (
        <View style={{ paddingHorizontal: pad, gap: 12 }}>
          <MemberAttendance netid={member.netid ?? ''} readOnly={isStudent} />
          <GitLabStatsPanel gitlabUrl={route.params.gitlabUrl} memberNetid={member.netid} memberName={member.name} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', paddingHorizontal: pad, gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <MemberAttendance netid={member.netid ?? ''} readOnly={isStudent} style={{ flex: 1, marginBottom: 0 }} />
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
