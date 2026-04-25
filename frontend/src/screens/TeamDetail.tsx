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
import { useTheme } from '../contexts/ThemeContext';
import { TeamMember } from '../types/Teams';
import { getTeam, updateTeamInfo, addStudentToTeam, removeStudentFromTeam, getTeams } from '../api/teams';
import { getSemesterStartDate } from '../api/settings';
import { setUserProjectRole, getCurrentUser, getUsersByRole, getUserByNetid } from '../api/users';
import { UserSummary } from '../utils/auth';
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
  const { colors } = useTheme();
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
  const [semesterStart, setSemesterStart] = useState<Date | undefined>(undefined);
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

  // Local member list — reflects add/remove after mount
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(team.members);

  // Add-member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [allStudents, setAllStudents] = useState<UserSummary[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [netidLookupResult, setNetidLookupResult] = useState<UserSummary | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  // Tracks members removed this session so they stay findable in the add modal
  const removedMembersRef = useRef<TeamMember[]>([]);

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
    const members = teamMembers.filter(m => m.netid);
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

  // Load stored GitLab token and semester start on mount
  useEffect(() => {
    getGitLabToken().then((t) => { if (t) setGlToken(t); });
    getSemesterStartDate().then((d) => { if (d) setSemesterStart(new Date(d)); }).catch(() => {});
  }, []);

  // Fetch GitLab data whenever token, gitlab URL, or semester start changes
  useEffect(() => {
    if (!gitlab || !glToken) return;
    let cancelled = false;
    setGlLoading(true);
    setGlError(null);
    const daysFetch = semesterStart
      ? Math.ceil((Date.now() - semesterStart.getTime()) / 86_400_000) + 7
      : 120;
    const weeksElapsed = semesterStart
      ? Math.min(Math.max(Math.ceil((Date.now() - semesterStart.getTime()) / (7 * 86_400_000)), 1), 16)
      : 16;

    Promise.all([
      fetchContributors(gitlab, glToken),
      fetchRecentCommits(gitlab, glToken, daysFetch),
      fetchProjectMembers(gitlab, glToken),
    ])
      .then(([contribs, commits, glMembers]) => {
        if (cancelled) return;
        const matched = matchContributors(contribs, glMembers, team.members);
        setContributors(matched.length > 0 ? matched : contribs);
        setWeeklyCommits(groupCommitsByWeek(commits as GitLabCommit[], weeksElapsed, semesterStart));

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
  }, [gitlab, glToken, semesterStart]);


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

  const toInitials = (name?: string) => {
    if (!name) return 'NA';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'NA';
  };

  const openAddMemberModal = async () => {
    setShowAddMemberModal(true);
    setStudentsLoading(true);
    try {
      // Fetch all students by role (works across all TAs) and all teams in parallel.
      // getUsersByRole('Student') is the authoritative source — it returns every student
      // account including those not currently on any team.
      // getTeams() supplements with team-member data (id fields) for students who may
      // not appear via the role endpoint.
      const [roleResult, teamsResult] = await Promise.allSettled([
        getUsersByRole('Student'),
        getTeams(),
      ]);

      const studentMap = new Map<string, UserSummary>();

      // Seed from teams first (gives us id + netid + name for all team-assigned students)
      if (teamsResult.status === 'fulfilled') {
        for (const t of teamsResult.value) {
          for (const s of t.students ?? []) {
            if (s.netid && !studentMap.has(s.netid)) {
              studentMap.set(s.netid, { id: s.id, name: s.name, netid: s.netid });
            }
          }
        }
      }

      // Overlay with role-endpoint results — this adds unassigned students and any
      // students on teams the current user's role can't see via getTeams().
      if (roleResult.status === 'fulfilled') {
        for (const s of roleResult.value) {
          if (!s.netid) continue;
          if (!studentMap.has(s.netid)) {
            studentMap.set(s.netid, s);
          } else {
            // Prefer role-endpoint data (more complete) but keep id from teams if missing
            const existing = studentMap.get(s.netid)!;
            studentMap.set(s.netid, { ...s, id: s.id ?? existing.id });
          }
        }
      }

      // Also include members removed from this team this session —
      // they are no longer in any team list but can be re-added.
      for (const m of removedMembersRef.current) {
        if (m.netid && !studentMap.has(m.netid)) {
          studentMap.set(m.netid, { id: m.id, name: m.name, netid: m.netid });
        }
      }

      setAllStudents([...studentMap.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
    } catch {
      Alert.alert('Error', 'Failed to load students.');
    } finally {
      setStudentsLoading(false);
    }
  };

  // When the search looks like a netid (no spaces, ≥3 chars), debounce-lookup by netid.
  // This surfaces students who aren't on any team (invisible to getTeams) and not in
  // the role endpoint, like gbulle after being removed from all teams.
  useEffect(() => {
    if (!showAddMemberModal) return;
    const q = addMemberSearch.trim().toLowerCase();
    if (!q || q.includes(' ') || q.length < 3) {
      setNetidLookupResult(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await getUserByNetid(q);
      if (found && found.netid) {
        setNetidLookupResult(found);
        // Also merge into allStudents so they persist after the search is cleared
        setAllStudents(prev => {
          const exists = prev.some(s => s.netid === found.netid);
          if (exists) return prev;
          return [...prev, found].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        });
      } else {
        setNetidLookupResult(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [addMemberSearch, showAddMemberModal]);

  const handleAddMember = async (student: UserSummary) => {
    if (!team.id || !student.id) return;
    setAddingId(student.id);
    try {
      await addStudentToTeam(team.id, student.id);
      const newMember: TeamMember = {
        id: student.id,
        name: student.name || student.netid || 'Unknown',
        netid: student.netid,
        initials: toInitials(student.name || student.netid),
        color: '',
        photo: '',
        demoResults: [],
      };
      setTeamMembers((prev) => [...prev, newMember]);
    } catch {
      Alert.alert('Error', 'Failed to add student to team.');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team.id || !member.id) return;
    const doRemove = async () => {
      setRemovingId(member.id!);
      try {
        await removeStudentFromTeam(team.id!, member.id!);
        setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
        removedMembersRef.current = [...removedMembersRef.current, member];
      } catch {
        Alert.alert('Error', 'Failed to remove member from team.');
      } finally {
        setRemovingId(null);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${member.name} from this team?`)) doRemove();
    } else {
      Alert.alert('Remove Member', `Remove ${member.name} from this team?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  const availableStudents = (() => {
    const onTeamIds = new Set(teamMembers.map((m) => m.id).filter(Boolean));
    const onTeamNetids = new Set(teamMembers.map((m) => m.netid).filter(Boolean));
    const q = addMemberSearch.toLowerCase();
    // Merge netidLookupResult if not already in allStudents
    const pool = [...allStudents];
    if (netidLookupResult?.netid && !pool.some(s => s.netid === netidLookupResult.netid)) {
      pool.push(netidLookupResult);
    }
    return pool.filter((s) => {
      if ((s.id && onTeamIds.has(s.id)) || (s.netid && onTeamNetids.has(s.netid))) return false;
      if (!q) return true;
      return s.name?.toLowerCase().includes(q) || s.netid?.toLowerCase().includes(q);
    });
  })();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'contributions', label: 'Contributions' },
    { key: 'Push frequency', label: 'Push Frequency' },
    { key: 'compliance', label: 'Compliance' },
  ];

  const pad = isMobile ? 12 : 20;
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: statusBarHeight + (isMobile ? 12 : 24) }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: pad, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>All Teams</Text>
        </TouchableOpacity>
      </View>

      {/* Team name — centered, large */}
      <Text style={{ fontSize: isMobile ? 22 : 28, fontWeight: '700', color: colors.text, textAlign: 'center', paddingHorizontal: pad, marginTop: 8, marginBottom: 4 }}>
        {teamName}
      </Text>

      {/* Unified action bar — below team name, above members */}
      {(gitlab || discord || canEditRepo) && (
        <View style={{ paddingHorizontal: pad, paddingTop: 8, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: colors.primary }}>
            <TouchableOpacity
              onPress={() => discord
                ? Linking.openURL(discord).catch(() => Alert.alert('Error', 'Could not open Discord link'))
                : canEditRepo ? handleEditPress() : null
              }
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 8, opacity: !discord && !canEditRepo ? 0.4 : 1 }}
              disabled={!discord && !canEditRepo}
            >
              <Ionicons name="logo-discord" size={16} color={colors.textInverse} />
              <Text style={{ marginLeft: 7, color: colors.textInverse, fontWeight: '600', fontSize: 13 }}>
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
              <Text style={{ marginLeft: 7, color: colors.textInverse, fontWeight: '600', fontSize: 13 }}>
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
                  <Ionicons name="pencil-outline" size={16} color={colors.textInverse} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Team Members */}
      {(() => {
        const INNER = isMobile ? 64 : 200;
        const RADIUS = isMobile ? 20 : 35;
        const tileW = isMobile ? 80 : 152;
        const tileHMargin = isMobile ? 0 : INNER / 4;
        const addColW = canEditRepo ? 56 : 0;
        return (
          <View style={{ paddingVertical: 16, paddingHorizontal: pad }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            {/* Left spacer mirrors the add-button column so tiles stay centered (desktop only) */}
            {canEditRepo && !isMobile && <View style={{ width: addColW }} />}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {teamMembers.map((m) => {
                const memberKey = m.netid || m.name;
                const role = memberRoles[memberKey];
                return (
                  <View key={memberKey} style={{ alignItems: 'center', width: tileW, marginHorizontal: tileHMargin }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('TeamMemberDetail', { member: m, gitlabUrl: gitlab || undefined, teamId: team.id, teamName: teamName })}
                      style={{ alignItems: 'center', width: tileW }}
                    >
                      {canEditRepo ? (
                        <TouchableOpacity
                          ref={(ref) => { if (ref) badgeRefs.current[memberKey] = ref; }}
                          onPress={(e) => { e.stopPropagation(); handleBadgePress(memberKey); }}
                          style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                        >
                          <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: '500' }}>{role ?? 'Set Role'}</Text>
                          <Ionicons name="chevron-down" size={10} color={colors.textInverse} style={{ marginLeft: 3 }} />
                        </TouchableOpacity>
                      ) : role ? (
                        <View style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 6 }}>
                          <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: '500' }}>{role}</Text>
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
                      <Text style={{ marginTop: 6, fontSize: isMobile ? 11 : 14, textAlign: 'center', lineHeight: isMobile ? 16 : 22, color: colors.text }} numberOfLines={2}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                    {canEditRepo && (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(m)}
                        disabled={removingId === m.id}
                        style={{ position: 'absolute', top: isMobile ? 22 : 28, right: isMobile ? 0 : -((INNER - tileW) / 2) + 4, width: 20, height: 20, borderRadius: 10, backgroundColor: removingId === m.id ? colors.border : colors.criticalBorder, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {removingId === m.id
                          ? <ActivityIndicator size="small" color="white" />
                          : <Ionicons name="close" size={11} color="white" />}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
            {canEditRepo && !isMobile && (
              <View style={{ width: addColW, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity onPress={openAddMemberModal} style={{ alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed' }}>
                    <Text style={{ fontSize: 22, lineHeight: 26, color: colors.primary, fontWeight: '300' }}>+</Text>
                  </View>
                  <Text style={{ marginTop: 4, fontSize: 12, textAlign: 'center', color: colors.primary }}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {canEditRepo && isMobile && (
            <TouchableOpacity
              onPress={openAddMemberModal}
              style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed' }}
            >
              <Text style={{ fontSize: 15, color: colors.primary, fontWeight: '300' }}>+</Text>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>Add Member</Text>
            </TouchableOpacity>
          )}
          </View>
        );
      })()}

    <View style={{ backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: pad, marginVertical: 12, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>

    {/* Team Results Header */}
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Ionicons name="logo-gitlab" size={18} color={colors.primary} />
      <Text style={{ fontSize: 16, fontWeight: '600', marginLeft: 8, color: colors.text }}>GitLab Analysis</Text>
    </View>

      {/* Tab Panel */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          {tabs.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={{ paddingVertical: 8, paddingHorizontal: isMobile ? 10 : 16, borderRadius: 8, backgroundColor: activeTab === key ? colors.gold : colors.borderLight }}
            >
              <Text style={{ color: activeTab === key ? '#111827' : colors.textSecondary, fontWeight: activeTab === key ? '700' : '400', fontSize: isMobile ? 12 : 14 }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Token prompt — only shown when no token is set */}
        {!glToken && gitlab && (
          <View style={{ backgroundColor: colors.warningBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warningText, marginBottom: 6 }}>
              GitLab personal access token required
            </Text>
            <Text style={{ fontSize: 12, color: colors.warningText, marginBottom: 8 }}>Generate one at git.las.iastate.edu → Settings → Access Tokens (scope: read_api), then add it in your Profile.</Text>
          </View>
        )}

        <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 8, minHeight: 160, marginBottom: 16 }}>
          {activeTab === 'contributions' && (() => {
            if (!gitlab) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>No GitLab repo linked.</Text>;
            if (!glToken) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>Enter your GitLab token above to load contributions.</Text>;
            if (glLoading) return <ActivityIndicator color={colors.primary} />;
            if (glError) return <Text style={{ color: colors.criticalBorder, fontSize: 13 }}>{glError}</Text>;
            if (contributors.length === 0) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>No contributions found.</Text>;
            const max = Math.max(...contributors.map((c) => c.commits));
            return (
              <View style={{ gap: 10 }}>
                {contributors.map((c) => (
                  <View key={c.email}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{c.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{c.commits} commits</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.round((c.commits / max) * 100)}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {activeTab === 'compliance' && (() => {
            if (!gitlab) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>No GitLab repo linked.</Text>;
            if (!glToken) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>Enter your GitLab token in Profile to use compliance analysis.</Text>;
            const { label } = getWeekBounds(complianceWeekOffset);
            return (
              <View>
                {/* Week navigator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setComplianceWeekOffset(o => o - 1)} style={{ padding: 6 }}>
                    <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity onPress={() => setShowComplianceInfo(v => !v)} style={{ padding: 4 }}>
                      <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setComplianceWeekOffset(o => Math.min(0, o + 1))}
                      disabled={complianceWeekOffset === 0}
                      style={{ padding: 6, opacity: complianceWeekOffset === 0 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Criteria info panel */}
                {showComplianceInfo && (
                  <View style={{ backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warningText, marginBottom: 6 }}>Compliance Criteria</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warningText, marginBottom: 2 }}>🔧 Backend</Text>
                    <Text style={{ fontSize: 11, color: colors.warningText, marginBottom: 6 }}>Each commit must contain 2+ annotation tags in the message body (e.g. @author, @reviewer, @tested-by). Commits without sufficient annotations do not count toward compliance.</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warningText, marginBottom: 2 }}>🖥 Frontend</Text>
                    <Text style={{ fontSize: 11, color: colors.warningText, marginBottom: 6 }}>Each commit must add 40+ qualifying lines (non-blank, non-comment lines in UI/style files). Whitespace-only or comment-only changes do not count.</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>Analysis covers all branches. Merged commits are counted once (deduplicated by commit ID).</Text>
                  </View>
                )}

                {complianceLoading && (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 8 }}>Fetching diffs — this may take a moment…</Text>
                  </View>
                )}

                {complianceError && (
                  <Text style={{ color: colors.criticalBorder, fontSize: 13 }}>{complianceError}</Text>
                )}

                {!complianceLoading && !complianceError && complianceResults.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {complianceResults.map((r) => {
                      const noRole = r.role === null;
                      const borderColor = noRole ? colors.border : r.passed ? colors.statusGoodBar : colors.statusPoorBar;
                      const metricLabel = r.role === 'Backend'
                        ? `${r.metric} annotation${r.metric !== 1 ? 's' : ''} (need 2)`
                        : `${r.metric} qualifying addition${r.metric !== 1 ? 's' : ''} (need 40)`;
                      return (
                        <View key={r.netid} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor, padding: 10, gap: 10 }}>
                          {/* Pass/fail icon */}
                          {noRole
                            ? <Ionicons name="help-circle-outline" size={18} color={colors.textFaint} />
                            : <Ionicons name={r.passed ? 'checkmark-circle' : 'close-circle'} size={18} color={r.passed ? colors.statusGoodText : colors.criticalBorder} />
                          }
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{r.name}</Text>
                              {r.role && (
                                <View style={{ backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textInverse }}>{r.role}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                              {noRole
                                ? 'No role assigned — set a role to enable compliance tracking'
                                : r.commitCount === 0
                                  ? 'No commits this week'
                                  : metricLabel
                              }
                            </Text>
                          </View>
                          {!noRole && r.commitCount > 0 && (
                            <Text style={{ fontSize: 11, color: colors.textFaint }}>{r.commitCount} commit{r.commitCount !== 1 ? 's' : ''}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {!complianceLoading && !complianceError && complianceResults.length === 0 && (
                  <Text style={{ color: colors.textFaint, fontSize: 13 }}>No results yet.</Text>
                )}
              </View>
            );
          })()}


          {activeTab === 'Push frequency' && (() => {
            if (!gitlab) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>No GitLab repo linked.</Text>;
            if (!glToken) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>Enter your GitLab token above to load push frequency.</Text>;
            if (glLoading) return <ActivityIndicator color={colors.primary} />;
            if (glError) return <Text style={{ color: colors.criticalBorder, fontSize: 13 }}>{glError}</Text>;
            if (weeklyCommits.length === 0) return <Text style={{ color: colors.textFaint, fontSize: 13 }}>No recent commits found.</Text>;
            const max = Math.max(...weeklyCommits.map((w) => w.count), 1);
            return (
              <View style={{ gap: 10 }}>
                {weeklyCommits.map((w) => (
                  <View key={w.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{w.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{w.count} commit{w.count !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.round((w.count / max) * 100)}%`, backgroundColor: colors.gold, borderRadius: 3 }} />
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
        <WeeklyPerformance members={teamMembers} readOnly={userRole === 'Student'} semesterStart={semesterStart} />
      </View>

      {/* Bulk Attendance — staff only */}
      {userRole !== 'Student' && (
        <View style={{ marginHorizontal: pad, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 16, shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 }}>Bulk Attendance</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>Mark all {teamMembers.length} team members at once</Text>

          {/* Date + Type row */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Date picker — calendar popout on web, text input fallback on native */}
            {Platform.OS === 'web' ? (
              <TouchableOpacity
                onPress={() => { (datePickerRef.current as any)?.showPicker?.() ?? (datePickerRef.current as any)?.click?.(); }}
                style={{ flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.inputBg }}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.text }}>{bulkDate}</Text>
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
                placeholderTextColor={colors.textFaint}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: colors.text, flex: 1, minWidth: 120 }}
              />
            )}
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['LECTURE', 'MEETING'] as AttendanceType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setBulkType(t)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: bulkType === t ? colors.primary : colors.background, borderWidth: 1, borderColor: bulkType === t ? colors.primary : colors.border }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: bulkType === t ? colors.textInverse : colors.textSecondary }}>
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
              <Text style={{ fontSize: 12, color: colors.textMuted, marginRight: 2 }}>Set all:</Text>
              {([
                { s: 'PRESENT' as AttendanceStatus, label: 'Present', color: colors.statusGoodText,     bg: colors.statusGoodBg,     border: colors.statusGoodBar },
                { s: 'LATE'    as AttendanceStatus, label: 'Late',    color: colors.statusModerateText, bg: colors.statusModerateBg, border: colors.statusModerateBar },
                { s: 'ABSENT'  as AttendanceStatus, label: 'Absent',  color: colors.statusPoorText,     bg: colors.statusPoorBg,     border: colors.statusPoorBar },
                { s: 'EXCUSED' as AttendanceStatus, label: 'Excused', color: colors.excusedText,        bg: colors.excusedBg,        border: colors.excusedBorder },
              ]).map(({ s, label, color, bg, border }) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setBulkStatus(Object.fromEntries(teamMembers.filter(m => m.netid).map(m => [m.netid!, s])))}
                  style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: bg, borderWidth: 1, borderColor: border }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Per-member rows */}
            <View style={{ gap: 6 }}>
              {teamMembers.filter(m => m.netid).map(m => {
                const current = bulkStatus[m.netid!] ?? 'PRESENT';
                return (
                  <View key={m.netid} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.text, width: 120 }} numberOfLines={1}>{m.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
                      {([
                        { s: 'PRESENT' as AttendanceStatus, label: 'Present', color: colors.statusGoodText,     bg: colors.statusGoodBg,     border: colors.statusGoodBar },
                        { s: 'LATE'    as AttendanceStatus, label: 'Late',    color: colors.statusModerateText, bg: colors.statusModerateBg, border: colors.statusModerateBar },
                        { s: 'ABSENT'  as AttendanceStatus, label: 'Absent',  color: colors.statusPoorText,     bg: colors.statusPoorBg,     border: colors.statusPoorBar },
                        { s: 'EXCUSED' as AttendanceStatus, label: 'Excused', color: colors.excusedText,        bg: colors.excusedBg,        border: colors.excusedBorder },
                      ]).map(({ s, label, color, bg, border }) => {
                        const active = current === s;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setBulkStatus(prev => ({ ...prev, [m.netid!]: s }))}
                            style={{
                              flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 6,
                              backgroundColor: active ? bg : colors.background,
                              borderWidth: 1,
                              borderColor: active ? border : colors.border,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: active ? '700' : '400', color: active ? color : colors.textFaint }}>
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
            style={{ alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary, opacity: bulkSaving ? 0.6 : 1 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textInverse }}>Save Attendance</Text>
          </TouchableOpacity>

          {bulkSaving && <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 10, alignSelf: 'center' }} />}
          {!!bulkDone && (
            <Text style={{ fontSize: 12, color: bulkDone.startsWith('Error') ? colors.criticalBorder : colors.statusGoodText, marginTop: 8, textAlign: 'center' }}>
              {bulkDone}
            </Text>
          )}
        </View>
      )}

      <MemberComments teamId={team.id} authorNetid={authorNetid} isStudent={userRole === 'Student'} />

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowAddMemberModal(false); setAddMemberSearch(''); setNetidLookupResult(null); }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: colors.overlay }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Add Member</Text>
              <TouchableOpacity onPress={() => { setShowAddMemberModal(false); setAddMemberSearch(''); setNetidLookupResult(null); }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.inputBorder }}>
                <Ionicons name="search-outline" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
                <TextInput
                  value={addMemberSearch}
                  onChangeText={setAddMemberSearch}
                  placeholder="Search by name or NetID..."
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ flex: 1, fontSize: 14, color: colors.text }}
                />
              </View>
            </View>

            {studentsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}>
                {availableStudents.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: colors.textFaint, paddingVertical: 24, fontSize: 14 }}>
                    {addMemberSearch
                      ? addMemberSearch.trim().length >= 3 && !addMemberSearch.includes(' ')
                        ? 'No students found. Looking up NetID...'
                        : 'No students match your search.'
                      : 'No unassigned students available.'}
                  </Text>
                ) : (
                  availableStudents.map((s) => (
                    <View key={s.netid ?? s.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{s.name ?? '—'}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>{s.netid}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleAddMember(s)}
                        disabled={addingId === s.id}
                        style={{ backgroundColor: addingId === s.id ? colors.border : colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }}
                      >
                        {addingId === s.id
                          ? <ActivityIndicator size="small" color={colors.textInverse} />
                          : <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textInverse }}>Add</Text>}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Team Info Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.overlay }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, width: '100%', maxHeight: '85%' }}>
            <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Edit Team Info</Text>
            </View>

            <ScrollView style={{ paddingHorizontal: 24 }} contentContainerStyle={{ paddingVertical: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Team Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Team name"
                placeholderTextColor={colors.textFaint}
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
              />

              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Repo URL</Text>
              <TextInput
                value={editUrl}
                onChangeText={setEditUrl}
                placeholder="https://gitlab.com/..."
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
              />

              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Discord Channel URL</Text>
              <TextInput
                value={editDiscord}
                onChangeText={setEditDiscord}
                placeholder="https://discord.com/channels/..."
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg }}
              />
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.borderLight }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.primary }}>
                {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={{ color: colors.textInverse, fontWeight: '600' }}>Save</Text>}
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
              backgroundColor: colors.surface,
              borderRadius: 8,
              shadowColor: colors.shadow,
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
                      const member = teamMembers.find((m) => (m.netid || m.name) === openRoleKey);
                      if (member) handleRoleSelect(member, r);
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                  >
                    <Text style={{ fontSize: 13, color: currentRole === r ? colors.primary : colors.textSecondary, fontWeight: currentRole === r ? '600' : '400' }}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
              {memberRoles[openRoleKey] && (
                <TouchableOpacity
                  onPress={() => {
                    const member = teamMembers.find((m) => (m.netid || m.name) === openRoleKey);
                    if (member) handleRoleSelect(member, null);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}
                >
                  <Text style={{ fontSize: 13, color: colors.textFaint }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Modal>
      </ScrollView>
  );
}
