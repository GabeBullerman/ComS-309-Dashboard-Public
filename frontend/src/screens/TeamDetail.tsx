import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { TeamMember } from '../types/Teams';
import { getTeam, updateTeamInfo } from '../api/teams';
import { setUserProjectRole, getCurrentUser } from '../api/users';
import MemberComments from '../components/Comments';
import MemberAvatar from '../components/MemberAvatar';
import WeeklyPerformance from '../components/WeeklyPerformance';
import {
  fetchContributors,
  fetchRecentCommits,
  fetchProjectMembers,
  fetchAllCommitsSince,
  getGitLabToken,
  groupCommitsByWeek,
  matchContributors,
  analyzeWeekCompliance,
  getWeekBounds,
  GitLabContributor,
  GitLabCommit,
  MemberComplianceResult,
} from '../utils/gitlab';
import {
  AttendanceStatus,
  AttendanceType,
  createAttendance,
  updateAttendance,
  getAttendanceForStudent,
  AttendanceRecord,
} from '../api/attendance';

type TeamDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

type TabKey = 'contributions' | 'Push frequency' | 'compliance';
type ProjectRole = 'Frontend' | 'Backend';

const PROJECT_ROLES: ProjectRole[] = ['Frontend', 'Backend'];

export default function TeamDetailsScreen({ navigation, route }: TeamDetailProps) {
  const { team, userRole } = route.params;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [authorNetid, setAuthorNetid] = useState<string | undefined>(undefined);
  useEffect(() => {
    getCurrentUser().then((u) => { if (u?.netid) setAuthorNetid(u.netid); });
  }, []);
  const [activeTab, setActiveTab] = useState<TabKey>('contributions');
  const [gitlab, setGitlab] = useState<string>(team.gitlab || '');
  const [discord, setDiscord] = useState<string>(team.discord || '');
  const [teamName, setTeamName] = useState(team.name);
  const [memberRoles, setMemberRoles] = useState<Record<string, ProjectRole>>({});
  const [openRoleKey, setOpenRoleKey] = useState<string | null>(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState<{ pageX: number; pageY: number } | null>(null);
  const badgeRefs = useRef<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editDiscord, setEditDiscord] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);


  // GitLab API state
  const [glToken, setGlToken] = useState<string | null>(null);
  const [contributors, setContributors] = useState<GitLabContributor[]>([]);
  const [weeklyCommits, setWeeklyCommits] = useState<{ label: string; count: number }[]>([]);
  const [glLoading, setGlLoading] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);

  const canEditRepo = userRole === 'TA' || userRole === 'HTA' || userRole === 'Instructor';

  // Compliance state
  const [complianceWeekOffset, setComplianceWeekOffset] = useState(0);
  const [complianceResults, setComplianceResults] = useState<MemberComplianceResult[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [showComplianceInfo, setShowComplianceInfo] = useState(false);

  useEffect(() => {
    if (activeTab !== 'compliance' || !gitlab || !glToken) return;
    let cancelled = false;
    setComplianceLoading(true);
    setComplianceError(null);
    setComplianceResults([]);
    const { start, end } = getWeekBounds(complianceWeekOffset);
    fetchAllCommitsSince(gitlab, glToken, start.toISOString())
      .then((commits) => {
        if (cancelled) return;
        const weekCommits = commits.filter((c) => new Date(c.created_at) <= end);
        const membersWithRoles = team.members.map((m) => ({
          name: m.name,
          netid: m.netid,
          role: memberRoles[m.netid || m.name] ?? null,
        }));
        return analyzeWeekCompliance(gitlab, glToken!, weekCommits, membersWithRoles);
      })
      .then((results) => { if (!cancelled && results) setComplianceResults(results); })
      .catch((e: Error) => { if (!cancelled) setComplianceError(e.message); })
      .finally(() => { if (!cancelled) setComplianceLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, gitlab, glToken, complianceWeekOffset, memberRoles]);

  // Bulk attendance state
  const today = new Date().toISOString().split('T')[0];
  const datePickerRef = useRef<any>(null);
  const [bulkDate, setBulkDate] = useState(today);
  const [bulkType, setBulkType] = useState<AttendanceType>('LECTURE');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDone, setBulkDone] = useState('');
  const [bulkStatus, setBulkStatus] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(team.members.filter(m => m.netid).map(m => [m.netid!, 'PRESENT' as AttendanceStatus]))
  );

  const handleBulkAttendance = async (statusMap?: Record<string, AttendanceStatus>) => {
    if (!bulkDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    const members = team.members.filter(m => m.netid);
    if (members.length === 0) return;
    setBulkSaving(true);
    setBulkDone('');
    const results = await Promise.allSettled(members.map(async (m) => {
      const status: AttendanceStatus = statusMap ? statusMap[m.netid!] : (bulkStatus[m.netid!] ?? 'PRESENT');
      const existing = await getAttendanceForStudent(m.netid!).catch((): AttendanceRecord[] => []);
      const record = existing.find(r => r.attendanceDate === bulkDate && r.type === bulkType);
      if (record) {
        await updateAttendance(record.id, m.netid!, bulkDate, status, bulkType);
      } else {
        await createAttendance(m.netid!, bulkDate, status, bulkType);
      }
    }));
    setBulkSaving(false);
    const failed = results.filter(r => r.status === 'rejected').length;
    const succeeded = results.length - failed;
    if (failed === 0) {
      setBulkDone(`Saved attendance for ${succeeded} member${succeeded !== 1 ? 's' : ''}`);
    } else if (succeeded === 0) {
      setBulkDone(`Failed to save attendance — please try again.`);
    } else {
      setBulkDone(`Saved ${succeeded} of ${results.length} — ${failed} failed, please retry.`);
    }
  };

  // Fetch fresh team data and project roles from the backend on mount
  useEffect(() => {
    if (!team.id) return;
    getTeam(team.id)
      .then((fresh) => {
        if (fresh.gitlab != null) setGitlab(fresh.gitlab);
        if (fresh.discord != null) setDiscord(fresh.discord);
        if (fresh.name) setTeamName(fresh.name);
        // Build member roles map from each student's projectRole field
        if (fresh.students) {
          const rolesFromApi: Record<string, ProjectRole> = {};
          for (const student of fresh.students) {
            const key = student.netid || String(student.id);
            if (student.projectRole) {
              rolesFromApi[key] = student.projectRole as ProjectRole;
            }
          }
          setMemberRoles(rolesFromApi);
        }
      })
      .catch(() => {});
  }, [team.id]);

  // Load stored GitLab token on mount
  useEffect(() => {
    getGitLabToken().then((t) => { if (t) setGlToken(t); });
  }, []);

  // Fetch GitLab data whenever token or gitlab URL changes
  useEffect(() => {
    if (!gitlab || !glToken) return;
    let cancelled = false;
    setGlLoading(true);
    setGlError(null);
    Promise.all([
      fetchContributors(gitlab, glToken),
      fetchRecentCommits(gitlab, glToken, 42),
      fetchProjectMembers(gitlab, glToken),
    ])
      .then(([contribs, commits, glMembers]) => {
        if (cancelled) return;
        const matched = matchContributors(contribs, glMembers, team.members);
        setContributors(matched.length > 0 ? matched : contribs);
        setWeeklyCommits(groupCommitsByWeek(commits as GitLabCommit[], 6));

        // Compute per-member week-over-week commit counts.
        // ISU GitLab username === netid, so author_email will contain the netid.
        // Falls back to partial name matching if no netid is available.
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
        const recentCommits = (commits as GitLabCommit[]).filter(
          (c) => new Date(c.created_at).getTime() >= twoWeeksAgo
        );

        const analytics: Record<string, { thisWeek: number; lastWeek: number }> = {};
        for (const member of team.members) {
          const key = member.netid || member.name;
          const mine = recentCommits.filter((c) => {
            if (member.netid && c.author_email.toLowerCase().includes(member.netid.toLowerCase())) return true;
            const authorLower = c.author_name.toLowerCase();
            return member.name.toLowerCase().split(/\s+/)
              .filter((p) => p.length > 2)
              .some((part) => authorLower.includes(part));
          });
          const thisWeek = mine.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length;
          const lastWeek = mine.filter((c) => {
            const t = new Date(c.created_at).getTime();
            return t >= twoWeeksAgo && t < weekAgo;
          }).length;
          analytics[key] = { thisWeek, lastWeek };
        }
      })
      .catch((e: Error) => { if (!cancelled) setGlError(e.message); })
      .finally(() => { if (!cancelled) setGlLoading(false); });
    return () => { cancelled = true; };
  }, [gitlab, glToken]);


  const handleOpenRepo = () => {
    if (!gitlab) return;
    Linking.openURL(gitlab).catch(() => Alert.alert('Error', 'Could not open URL'));
  };

  const handleEditPress = () => {
    setEditUrl(gitlab);
    setEditDiscord(discord);
    setEditName(teamName);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!team.id) {
      Alert.alert('Error', 'Team ID is missing — cannot save.');
      return;
    }
    setSaving(true);
    try {
      await updateTeamInfo(team.id, { name: editName.trim(), gitlab: editUrl.trim(), discord: editDiscord.trim() });
      setGitlab(editUrl.trim());
      setDiscord(editDiscord.trim());
      setTeamName(editName.trim());
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const closeRoleDropdown = () => {
    setOpenRoleKey(null);
    setRoleDropdownPos(null);
  };

  const handleBadgePress = (memberKey: string) => {
    if (openRoleKey === memberKey) { closeRoleDropdown(); return; }
    const ref = badgeRefs.current[memberKey];
    if (ref) {
      ref.measure((_fx: number, _fy: number, _w: number, height: number, pageX: number, pageY: number) => {
        setOpenRoleKey(memberKey);
        setRoleDropdownPos({ pageX, pageY: pageY + height + 4 });
      });
    }
  };

  const handleRoleSelect = async (member: TeamMember, role: ProjectRole | null) => {
    if (!member.id) return;
    const key = member.netid || member.name;
    closeRoleDropdown();
    try {
      await setUserProjectRole(member.id, role ?? '');
      setMemberRoles((prev) => {
        const next = { ...prev };
        if (role) next[key] = role;
        else delete next[key];
        return next;
      });
    } catch {
      Alert.alert('Error', 'Failed to update role.');
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'contributions', label: 'Contributions' },
    { key: 'Push frequency', label: 'Push Frequency' },
    { key: 'compliance', label: 'Compliance' },
  ];

  const pad = isMobile ? 12 : 20;
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F3F4F6', paddingTop: statusBarHeight + (isMobile ? 12 : 24) }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: pad, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>All Teams</Text>
        </TouchableOpacity>
      </View>

      {/* Team name — centered, large */}
      <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: '#111827', textAlign: 'center', paddingHorizontal: pad, marginTop: 8, marginBottom: 4 }}>
        {teamName}
      </Text>

      {/* Unified action bar — below team name, above members */}
      {(gitlab || discord || canEditRepo) && (
        <View style={{ paddingHorizontal: pad, paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: '#C8102E' }}>
            <TouchableOpacity
              onPress={() => discord
                ? Linking.openURL(discord).catch(() => Alert.alert('Error', 'Could not open Discord link'))
                : canEditRepo ? handleEditPress() : null
              }
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 8, opacity: !discord && !canEditRepo ? 0.4 : 1 }}
              disabled={!discord && !canEditRepo}
            >
              <Ionicons name="logo-discord" size={16} color="white" />
              <Text style={{ marginLeft: 7, color: 'white', fontWeight: '600', fontSize: 13 }}>
                {discord ? 'Discord' : 'Add Discord'}
              </Text>
            </TouchableOpacity>

            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 8 }} />

            <TouchableOpacity
              onPress={() => gitlab ? handleOpenRepo() : canEditRepo ? handleEditPress() : null}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 8, opacity: !gitlab && !canEditRepo ? 0.4 : 1 }}
              disabled={!gitlab && !canEditRepo}
            >
              <Text style={{ fontSize: 15 }}>🦊</Text>
              <Text style={{ marginLeft: 7, color: 'white', fontWeight: '600', fontSize: 13 }}>
                {gitlab ? 'View Repo' : 'Add Repo'}
              </Text>
            </TouchableOpacity>

            {canEditRepo && (
              <>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 8 }} />
                <TouchableOpacity
                  onPress={handleEditPress}
                  style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 16 }}
                >
                  <Ionicons name="pencil-outline" size={16} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Team Members */}
      {/* Member tiles — wrapping row on mobile, horizontal scroll on desktop */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: pad, gap: 12 }}>
        {team.members.map((m) => {
          const INNER = isMobile ? 64 : 200;
          const RADIUS = isMobile ? 20 : 35;
          const memberKey = m.netid || m.name;
          const role = memberRoles[memberKey];
          return (
            <TouchableOpacity
              key={memberKey}
              onPress={() => navigation.navigate('TeamMemberDetail', { member: m, gitlabUrl: gitlab || undefined, teamId: team.id, teamName: teamName })}
              style={{ alignItems: 'center', width: isMobile ? 80 : 152, marginHorizontal: isMobile ? 0 : INNER / 4 }}
            >
              {/* Role badge — above photo, always same position */}
              {canEditRepo ? (
                <TouchableOpacity
                  ref={(ref) => { if (ref) badgeRefs.current[memberKey] = ref; }}
                  onPress={(e) => { e.stopPropagation(); handleBadgePress(memberKey); }}
                  style={{ backgroundColor: '#C8102E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                >
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '500' }}>{role ?? 'Set Role'}</Text>
                  <Ionicons name="chevron-down" size={10} color="white" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ) : role ? (
                <View style={{ backgroundColor: '#C8102E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 6 }}>
                  <Text style={{ color: 'white', fontSize: 11, fontWeight: '500' }}>{role}</Text>
                </View>
              ) : (
                <View style={{ height: isMobile ? 22 : 24, marginBottom: 6 }} />
              )}
              <MemberAvatar
                memberId={m.netid || m.name}
                initials={m.initials}
                size={INNER}
                
                borderRadius={RADIUS - 4}
                bordered
              />
              <Text style={{ marginTop: 6, fontSize: isMobile ? 11 : 14, textAlign: 'center', lineHeight: isMobile ? 16 : 22 }} numberOfLines={2}>
                {m.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

    <View style={{ backgroundColor: 'white', borderRadius: 12, marginHorizontal: pad, marginVertical: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>

    {/* Team Results Header */}
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
      <Ionicons name="logo-gitlab" size={18} color="#be123c" />
      <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8, color: '#111827' }}>GitLab Analysis</Text>
    </View>

      {/* Tab Panel */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          {tabs.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={{ paddingVertical: 8, paddingHorizontal: isMobile ? 10 : 16, borderRadius: 8, backgroundColor: activeTab === key ? '#F1BE48' : '#E5E7EB' }}
            >
              <Text style={{ color: activeTab === key ? '#111827' : '#374151', fontWeight: activeTab === key ? '700' : '400', fontSize: isMobile ? 12 : 14 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Token prompt — only shown when no token is set */}
        {!glToken && gitlab && (
          <View style={{ backgroundColor: '#FEF9C3', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E', marginBottom: 6 }}>
              GitLab personal access token required
            </Text>
            <Text style={{ fontSize: 12, color: '#78350F', marginBottom: 8 }}>Generate one at git.las.iastate.edu → Settings → Access Tokens (scope: read_api), then add it in your Profile.</Text>
          </View>
        )}

        <View style={{ padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8, minHeight: 160, marginBottom: 16 }}>
          {activeTab === 'contributions' && (() => {
            if (!gitlab) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>No GitLab repo linked.</Text>;
            if (!glToken) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>Enter your GitLab token above to load contributions.</Text>;
            if (glLoading) return <ActivityIndicator color="#C8102E" />;
            if (glError) return <Text style={{ color: '#DC2626', fontSize: 13 }}>{glError}</Text>;
            if (contributors.length === 0) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>No contributions found.</Text>;
            const max = Math.max(...contributors.map((c) => c.commits));
            return (
              <View style={{ gap: 10 }}>
                {contributors.map((c) => (
                  <View key={c.email}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{c.name}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{c.commits} commits</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.round((c.commits / max) * 100)}%`, backgroundColor: '#C8102E', borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {activeTab === 'compliance' && (() => {
            if (!gitlab) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>No GitLab repo linked.</Text>;
            if (!glToken) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>Enter your GitLab token in Profile to use compliance analysis.</Text>;
            const { label } = getWeekBounds(complianceWeekOffset);
            return (
              <View>
                {/* Week navigator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setComplianceWeekOffset(o => o - 1)} style={{ padding: 6 }}>
                    <Ionicons name="chevron-back" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity onPress={() => setShowComplianceInfo(v => !v)} style={{ padding: 4 }}>
                      <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setComplianceWeekOffset(o => Math.min(0, o + 1))}
                      disabled={complianceWeekOffset === 0}
                      style={{ padding: 6, opacity: complianceWeekOffset === 0 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Criteria info panel */}
                {showComplianceInfo && (
                  <View style={{ backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1', marginBottom: 6 }}>Compliance Criteria</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0c4a6e', marginBottom: 2 }}>🔧 Backend</Text>
                    <Text style={{ fontSize: 11, color: '#0c4a6e', marginBottom: 6 }}>Each commit must contain 2+ annotation tags in the message body (e.g. @author, @reviewer, @tested-by). Commits without sufficient annotations do not count toward compliance.</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0c4a6e', marginBottom: 2 }}>🖥 Frontend</Text>
                    <Text style={{ fontSize: 11, color: '#0c4a6e', marginBottom: 6 }}>Each commit must add 40+ qualifying lines (non-blank, non-comment lines in UI/style files). Whitespace-only or comment-only changes do not count.</Text>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>Analysis covers all branches. Merged commits are counted once (deduplicated by commit ID).</Text>
                  </View>
                )}

                {complianceLoading && (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <ActivityIndicator color="#C8102E" />
                    <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>Fetching diffs — this may take a moment…</Text>
                  </View>
                )}

                {complianceError && (
                  <Text style={{ color: '#dc2626', fontSize: 13 }}>{complianceError}</Text>
                )}

                {!complianceLoading && !complianceError && complianceResults.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {complianceResults.map((r) => {
                      const noRole = r.role === null;
                      const borderColor = noRole ? '#e5e7eb' : r.passed ? '#86efac' : '#fca5a5';
                      const metricLabel = r.role === 'Backend'
                        ? `${r.metric} annotation${r.metric !== 1 ? 's' : ''} (need 2)`
                        : `${r.metric} qualifying addition${r.metric !== 1 ? 's' : ''} (need 40)`;
                      return (
                        <View key={r.netid} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor, padding: 10, gap: 10 }}>
                          {/* Pass/fail icon */}
                          {noRole
                            ? <Ionicons name="help-circle-outline" size={18} color="#9ca3af" />
                            : <Ionicons name={r.passed ? 'checkmark-circle' : 'close-circle'} size={18} color={r.passed ? '#16a34a' : '#dc2626'} />
                          }
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{r.name}</Text>
                              {r.role && (
                                <View style={{ backgroundColor: '#C8102E', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '600', color: 'white' }}>{r.role}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                              {noRole
                                ? 'No role assigned — set a role to enable compliance tracking'
                                : r.commitCount === 0
                                  ? 'No commits this week'
                                  : metricLabel
                              }
                            </Text>
                          </View>
                          {!noRole && r.commitCount > 0 && (
                            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{r.commitCount} commit{r.commitCount !== 1 ? 's' : ''}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {!complianceLoading && !complianceError && complianceResults.length === 0 && (
                  <Text style={{ color: '#9ca3af', fontSize: 13 }}>No results yet.</Text>
                )}
              </View>
            );
          })()}


          {activeTab === 'Push frequency' && (() => {
            if (!gitlab) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>No GitLab repo linked.</Text>;
            if (!glToken) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>Enter your GitLab token above to load push frequency.</Text>;
            if (glLoading) return <ActivityIndicator color="#C8102E" />;
            if (glError) return <Text style={{ color: '#DC2626', fontSize: 13 }}>{glError}</Text>;
            if (weeklyCommits.length === 0) return <Text style={{ color: '#9ca3af', fontSize: 13 }}>No recent commits found.</Text>;
            const max = Math.max(...weeklyCommits.map((w) => w.count), 1);
            return (
              <View style={{ gap: 10 }}>
                {weeklyCommits.map((w) => (
                  <View key={w.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, color: '#374151' }}>{w.label}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{w.count} commit{w.count !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.round((w.count / max) * 100)}%`, backgroundColor: '#F1BE48', borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>
      </View>
      </View>
      {/* Weekly Performance */}
      <View style={{ marginHorizontal: pad, marginBottom: 12 }}>
        <WeeklyPerformance members={team.members} readOnly={userRole === 'Student'} />
      </View>

      {/* Bulk Attendance — staff only */}
      {userRole !== 'Student' && (
        <View style={{ marginHorizontal: pad, marginBottom: 12, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 }}>Bulk Attendance</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Mark all {team.members.length} team members at once</Text>

          {/* Date + Type row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Date picker — calendar popout on web, text input fallback on native */}
            {Platform.OS === 'web' ? (
              <TouchableOpacity
                onPress={() => { (datePickerRef.current as any)?.showPicker?.() ?? (datePickerRef.current as any)?.click?.(); }}
                style={{ flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#f9fafb' }}
              >
                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                <Text style={{ fontSize: 13, color: '#111827' }}>{bulkDate}</Text>
                {/* Hidden native date input */}
                <input
                  ref={datePickerRef}
                  type="date"
                  value={bulkDate}
                  onChange={(e: any) => setBulkDate(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                />
              </TouchableOpacity>
            ) : (
              <TextInput
                value={bulkDate}
                onChangeText={setBulkDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#111827', flex: 1, minWidth: 120 }}
              />
            )}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['LECTURE', 'MEETING'] as AttendanceType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setBulkType(t)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: bulkType === t ? '#b91c1c' : '#f3f4f6', borderWidth: 1, borderColor: bulkType === t ? '#b91c1c' : '#e5e7eb' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: bulkType === t ? 'white' : '#374151' }}>
                    {t === 'LECTURE' ? 'Class' : 'TA Meeting'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Per-student status selector */}
          <View style={{ marginBottom: 12 }}>
            {/* Set-all row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 12, color: '#6b7280', marginRight: 2 }}>Set all:</Text>
              {([
                { s: 'PRESENT' as AttendanceStatus, label: 'Present', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
                { s: 'LATE'    as AttendanceStatus, label: 'Late',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                { s: 'ABSENT'  as AttendanceStatus, label: 'Absent',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                { s: 'EXCUSED' as AttendanceStatus, label: 'Excused', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
              ]).map(({ s, label, color, bg, border }) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setBulkStatus(Object.fromEntries(team.members.filter(m => m.netid).map(m => [m.netid!, s])))}
                  style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: bg, borderWidth: 1, borderColor: border }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Per-member rows */}
            <View style={{ gap: 6 }}>
              {team.members.filter(m => m.netid).map(m => {
                const current = bulkStatus[m.netid!] ?? 'PRESENT';
                return (
                  <View key={m.netid} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: '#111827', width: 120 }} numberOfLines={1}>{m.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
                      {([
                        { s: 'PRESENT' as AttendanceStatus, label: 'Present', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
                        { s: 'LATE'    as AttendanceStatus, label: 'Late',    color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                        { s: 'ABSENT'  as AttendanceStatus, label: 'Absent',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                        { s: 'EXCUSED' as AttendanceStatus, label: 'Excused', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
                      ]).map(({ s, label, color, bg, border }) => {
                        const active = current === s;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setBulkStatus(prev => ({ ...prev, [m.netid!]: s }))}
                            style={{
                              flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 6,
                              backgroundColor: active ? bg : '#f9fafb',
                              borderWidth: 1,
                              borderColor: active ? border : '#e5e7eb',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: active ? '700' : '400', color: active ? color : '#9ca3af' }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={() => handleBulkAttendance()}
            disabled={bulkSaving}
            style={{ alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: '#b91c1c', opacity: bulkSaving ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: 'white' }}>Save Attendance</Text>
          </TouchableOpacity>

          {bulkSaving && <ActivityIndicator size="small" color="#6b7280" style={{ marginTop: 10, alignSelf: 'center' }} />}
          {!!bulkDone && (
            <Text style={{ fontSize: 12, color: bulkDone.startsWith('Error') ? '#dc2626' : '#16a34a', marginTop: 8, textAlign: 'center' }}>
              {bulkDone}
            </Text>
          )}
        </View>
      )}

      <MemberComments teamId={team.id} authorNetid={authorNetid} isStudent={userRole === 'Student'} />

      {/* Edit Team Info Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxHeight: '85%' }}>
            <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Edit Team Info</Text>
            </View>

            <ScrollView style={{ paddingHorizontal: 24 }} contentContainerStyle={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Team Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Team name"
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, fontSize: 14, color: '#111827' }}
              />

              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Repo URL</Text>
              <TextInput
                value={editUrl}
                onChangeText={setEditUrl}
                placeholder="https://gitlab.com/..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, fontSize: 14, color: '#111827' }}
              />

              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Discord Channel URL</Text>
              <TextInput
                value={editDiscord}
                onChangeText={setEditDiscord}
                placeholder="https://discord.com/channels/..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, fontSize: 14, color: '#111827' }}
              />
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: '#E5E7EB' }}>
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: '#C8102E' }}>
                {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role dropdown Modal — renders above everything */}
      <Modal
        visible={openRoleKey !== null}
        transparent
        animationType="none"
        onRequestClose={closeRoleDropdown}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={closeRoleDropdown} activeOpacity={1}>
          {roleDropdownPos && openRoleKey && (
            <View style={{
              position: 'absolute',
              left: roleDropdownPos.pageX,
              top: roleDropdownPos.pageY,
              backgroundColor: 'white',
              borderRadius: 8,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 8,
              minWidth: 110,
            }}>
              {PROJECT_ROLES.map((r) => {
                const currentRole = memberRoles[openRoleKey];
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => {
                      const member = team.members.find((m) => (m.netid || m.name) === openRoleKey);
                      if (member) handleRoleSelect(member, r);
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                  >
                    <Text style={{ fontSize: 13, color: currentRole === r ? '#C8102E' : '#374151', fontWeight: currentRole === r ? '600' : '400' }}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
              {memberRoles[openRoleKey] && (
                <TouchableOpacity
                  onPress={() => {
                    const member = team.members.find((m) => (m.netid || m.name) === openRoleKey);
                    if (member) handleRoleSelect(member, null);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}
                >
                  <Text style={{ fontSize: 13, color: '#9ca3af' }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Modal>
      </ScrollView>
  );
}
