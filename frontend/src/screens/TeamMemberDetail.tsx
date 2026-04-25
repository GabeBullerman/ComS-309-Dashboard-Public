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
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { colors } = useTheme();
  const member = route.params?.member ?? null;
  const teamId = route.params?.teamId;
  const teamName = route.params?.teamName;

  const [authorNetid, setAuthorNetid] = useState<string | undefined>(undefined);
  const [isStudent, setIsStudent] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : insets.top;
  const pad = isMobile ? 12 : 20;

  const INNER = isMobile ? 80 : 200;
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
    if (!member?.netid || isStudent) return;
    getAtRiskOverridesForStudent(member.netid).then(setOverrides).catch(() => {});
  }, [member?.netid, isStudent]);

  if (!member) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textMuted }}>Member not found.</Text>
      </View>
    );
  }

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
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: statusBarHeight + (isMobile ? 12 : 24) }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: pad, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{teamName ?? 'Team'}</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar + name */}
      <View style={{ alignItems: 'center', paddingVertical: isMobile ? 12 : 16 }}>
        <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
          {member.name}
        </Text>
        <MemberAvatar
          memberId={member.netid || member.name}
          initials={member.initials}
          size={INNER}
          borderRadius={RADIUS_INNER}
          canEdit
          bordered
        />

        {/* At-risk flag button — staff only */}
        {!isStudent && (
          <View style={{ marginTop: 12 }}>
            {isFlagged ? (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.criticalBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Ionicons name="alert-circle" size={14} color={colors.criticalBorder} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.criticalText }}>Manually flagged at-risk</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', maxWidth: 260 }} numberOfLines={2}>
                  {overrides[0]?.reason}
                </Text>
                <TouchableOpacity
                  onPress={handleUnflag}
                  disabled={flagSaving}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, opacity: flagSaving ? 0.6 : 1 }}
                >
                  {flagSaving ? <ActivityIndicator size="small" color={colors.textMuted} /> : <Ionicons name="close-circle-outline" size={14} color={colors.textMuted} />}
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>Remove flag</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setFlagModalVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.score0Bg, backgroundColor: colors.criticalBg }}
              >
                <Ionicons name="flag-outline" size={14} color={colors.criticalBorder} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.criticalBorder }}>Flag as at-risk</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Flag reason modal */}
      <Modal visible={flagModalVisible} transparent animationType="fade" onRequestClose={() => setFlagModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }} onPress={() => setFlagModalVisible(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, width: Math.min(360, width - 40), gap: 12 }} onPress={e => e.stopPropagation()}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Flag {member.name} as at-risk</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Provide a reason — this will appear on the at-risk students screen.</Text>
            <TextInput
              value={flagReason}
              onChangeText={setFlagReason}
              placeholder="e.g. Missed multiple team meetings, not contributing..."
              placeholderTextColor={colors.textFaint}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 13, color: colors.text, minHeight: 72, textAlignVertical: 'top' }}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => { setFlagModalVisible(false); setFlagReason(''); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFlag}
                disabled={!flagReason.trim() || flagSaving}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: flagReason.trim() ? colors.criticalBorder : colors.score0Bg, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                {flagSaving && <ActivityIndicator size="small" color={colors.textInverse} />}
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textInverse }}>Flag student</Text>
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
