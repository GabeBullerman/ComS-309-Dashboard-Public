import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { TeamMember } from '../data/teams';
import { getTeam, updateTeamInfo, setUserProjectRole } from '../utils/auth';
import {
  fetchContributors,
  fetchRecentCommits,
  fetchProjectMembers,
  getGitLabToken,
  saveGitLabToken,
  groupCommitsByWeek,
  matchContributors,
  GitLabContributor,
  GitLabCommit,
} from '../utils/gitlab';

type TeamDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

type TabKey = 'contributions' | 'demoResults' | 'Push frequency';
type ProjectRole = 'Frontend' | 'Backend';

const PROJECT_ROLES: ProjectRole[] = ['Frontend', 'Backend'];

export default function TeamDetailsScreen({ navigation, route }: TeamDetailProps) {
  const { team, userRole } = route.params;
  const [selectedKey, setSelectedKey] = useState<string>('team');
  const [commentText, setCommentText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const selectedMember =
    selectedKey === 'team'
      ? team.members[0]
      : (team.members.find((m) => (m.netid || m.name) === selectedKey) ?? team.members[0]);
  const [activeTab, setActiveTab] = useState<TabKey>('contributions');
  const [gitlab, setGitlab] = useState<string>(team.gitlab || '');
  const [teamName, setTeamName] = useState(team.name);
  const [memberRoles, setMemberRoles] = useState<Record<string, ProjectRole>>({});
  const [openRoleKey, setOpenRoleKey] = useState<string | null>(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState<{ pageX: number; pageY: number } | null>(null);
  const badgeRefs = useRef<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // GitLab API state
  const [glToken, setGlToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [contributors, setContributors] = useState<GitLabContributor[]>([]);
  const [weeklyCommits, setWeeklyCommits] = useState<{ label: string; count: number }[]>([]);
  const [glLoading, setGlLoading] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);

  const canEditRepo = userRole === 'TA' || userRole === 'HTA' || userRole === 'Instructor';

  // Fetch fresh team data and project roles from the backend on mount
  useEffect(() => {
    if (!team.id) return;
    getTeam(team.id)
      .then((fresh) => {
        if (fresh.gitlab != null) setGitlab(fresh.gitlab);
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
        setContributors(matchContributors(contribs, glMembers, team.members));
        setWeeklyCommits(groupCommitsByWeek(commits as GitLabCommit[], 6));
      })
      .catch((e: Error) => { if (!cancelled) setGlError(e.message); })
      .finally(() => { if (!cancelled) setGlLoading(false); });
    return () => { cancelled = true; };
  }, [gitlab, glToken]);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    await saveGitLabToken(tokenInput.trim());
    setGlToken(tokenInput.trim());
    setTokenInput('');
  };

  const handleOpenRepo = () => {
    if (!gitlab) return;
    Linking.openURL(gitlab).catch(() => Alert.alert('Error', 'Could not open URL'));
  };

  const handleEditPress = () => {
    setEditUrl(gitlab);
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
      await updateTeamInfo(team.id, { name: editName.trim(), gitlab: editUrl.trim() });
      setGitlab(editUrl.trim());
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
    { key: 'demoResults', label: 'Demo Results' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4 pt-16">
      {/* Header */}
      <View className="flex-row items-center px-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-4">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1 items-center mr-10">
          <Text className="text-xl font-bold">{teamName}</Text>
        </View>
      </View>

      {/* Repo / Edit Button */}
      <View className="px-4 pt-3 pb-1 mt-1">
        {canEditRepo ? (
          gitlab ? (
            // Split button: View Project (left) | Edit Info (right)
            <View className="flex-row rounded-lg overflow-hidden" style={{ backgroundColor: '#C8102E' }}>
              <TouchableOpacity
                onPress={handleOpenRepo}
                className="flex-1 flex-row items-center justify-center py-3 px-4"
              >
                <Ionicons name="git-branch-outline" size={16} color="white" />
                <Text className="ml-2 text-white font-semibold">View Project</Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.4)', marginVertical: 8 }} />
              <TouchableOpacity
                onPress={handleEditPress}
                className="flex-row items-center justify-center py-3 px-5"
              >
                <Ionicons name="pencil-outline" size={15} color="white" />
                <Text className="ml-1 text-white font-semibold">Edit Info</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Full-width Edit Team Info button
            <TouchableOpacity
              onPress={handleEditPress}
              className="flex-row items-center justify-center rounded-lg py-3 px-4"
              style={{ backgroundColor: '#C8102E' }}
            >
              <Ionicons name="create-outline" size={16} color="white" />
              <Text className="ml-2 text-white font-semibold">Edit Team Info</Text>
            </TouchableOpacity>
          )
        ) : gitlab ? (
          // Students: View Project only
          <TouchableOpacity
            onPress={handleOpenRepo}
            className="flex-row items-center justify-center rounded-lg py-3 px-4"
            style={{ backgroundColor: '#C8102E' }}
          >
            <Ionicons name="git-branch-outline" size={16} color="white" />
            <Text className="ml-2 text-white font-semibold">View Project</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Team Members */}
      <FlatList
        horizontal
        data={[
          { type: 'team' as const },
          ...team.members.map((m) => ({ type: 'member' as const, member: m })),
        ]}
        keyExtractor={(item) => item.type === 'team' ? 'team' : (item.member.netid || item.member.name)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          // Shared container size — 128 inner + 3 border + 2 padding on each side = 136 total
          const TILE = 136;
          const INNER = 128;
          const RADIUS_OUTER = 35;
          const RADIUS_INNER = 32;

          if (item.type === 'team') {

            return (
              <TouchableOpacity
                onPress={() => setSelectedKey('team')}
                style={{ marginRight: 16, alignItems: 'center' }}
              >
              </TouchableOpacity>
            );
          }

          const memberKey = item.member.netid || item.member.name;
          const role = memberRoles[memberKey];
          const isSelected = selectedKey === memberKey;
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('TeamMemberDetail', { member: item.member })}
              style={{ marginRight: 16, alignItems: 'center' }}
            >
              <View style={{
                width: TILE, height: TILE,
                borderRadius: RADIUS_OUTER,
                borderWidth: 3,
                borderColor: isSelected ? '#F1BE48' : 'transparent',
                padding: 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image
                  source={typeof item.member.photo === 'string' ? { uri: item.member.photo } : item.member.photo}
                  style={{ width: INNER, height: INNER, borderRadius: RADIUS_INNER }}
                />
              </View>
              <Text style={{ marginTop: 8, fontSize: 14, fontWeight: isSelected ? '700' : '400' }}>
                {item.member.name}
              </Text>
              {canEditRepo ? (
                <TouchableOpacity
                  ref={(ref) => { if (ref) badgeRefs.current[memberKey] = ref; }}
                  onPress={(e) => { e.stopPropagation(); handleBadgePress(memberKey); }}
                  style={{ backgroundColor: '#C8102E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>{role ?? 'Set Role'}</Text>
                  <Ionicons name="chevron-down" size={10} color="white" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ) : role ? (
                <View style={{ backgroundColor: '#C8102E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>{role}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

    <View className="bg-white rounded-xl shadow my-4 overflow-hidden pb-4">
      {/* Team Repo Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
        <Text className="text-lg font-semibold ml-2">Team Repo</Text>
      </View>

      {/* Repo URL */} 
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center mb-4">
        <Text className="text-lg text-gray-600">Repo URL:</Text>
        <Text className="text-sm ml-2">repo</Text>
      </View>

      {/* Go To Repo */}
      <View className="px-4 py-3 border-b border-gray-200 flex-row items-center mb-4">

      </View>
    </View>

    <View className="bg-white rounded-xl shadow my-4 overflow-hidden pb-4">

    {/* Team Results Header */}
    <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
      <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
      <Text className="text-lg font-semibold ml-2">Team Results</Text>
    </View>

      {/* Tab Panel */}
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row justify-around mb-4">
          {tabs.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              className={`py-2 px-4 rounded-lg ${activeTab === key ? 'bg-yellow-400' : 'bg-gray-200'}`}
              onPress={() => setActiveTab(key)}
            >
              <Text className={activeTab === key ? 'text-white font-bold' : 'text-gray-700'}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Token setup prompt — shown when no token is set and gitlab URL exists */}
        {!glToken && gitlab && (
          <View style={{ backgroundColor: '#FEF9C3', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E', marginBottom: 6 }}>GitLab personal access token required</Text>
            <Text style={{ fontSize: 12, color: '#78350F', marginBottom: 8 }}>Generate one at git.las.iastate.edu → Settings → Access Tokens (scope: read_api)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="glpat-xxxxxxxxxxxx"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, backgroundColor: 'white' }}
              />
              <TouchableOpacity onPress={handleSaveToken} style={{ backgroundColor: '#C8102E', borderRadius: 6, paddingHorizontal: 14, justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="p-4 bg-gray-100 rounded-lg min-h-[200px]">
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
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{c.commits} commits · +{c.additions} −{c.deletions}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                      <View style={{ height: 6, width: `${Math.round((c.commits / max) * 100)}%`, backgroundColor: '#C8102E', borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {activeTab === 'demoResults' && (
            <Text>{selectedMember.demoResults?.map((d) => `${d.name}: ${d.result}`).join('\n')}</Text>
          )}

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
       {/* MEMBER COMMENTS */}
  <View className="bg-white rounded-xl shadow mt-6 mb-12 overflow-hidden">
  
  {/* Header */}
  <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
    <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
    <Text className="text-lg font-semibold ml-2">Team Comments</Text>
  </View>

  {/* Two-column body */}
  <View className="flex-row">

    {/* LEFT: Comment History */}
    <View className="flex-1 p-4 border-r border-gray-200">
      <Text className="text-sm font-semibold text-gray-700 mb-3">Comment History</Text>
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-400 text-sm">No comments available for this team</Text>
      </View>
    </View>

    {/* RIGHT: Add Comment */}
    <View className="flex-1 p-4">
      <Text className="text-sm font-semibold text-gray-700 mb-3">Add Comment</Text>

      {/* Comment input */}
      <Text className="text-xs text-gray-600 mb-1">Comment</Text>
      <View className="border border-gray-300 rounded-md mb-1">
        <TextInput
          className="p-2 text-sm text-gray-800 h-28"
          placeholder="Write your comment..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1400} // ~200 words
          value={commentText}
          onChangeText={setCommentText}
          textAlignVertical="top"
        />
      </View>
      <Text className="text-xs text-gray-400 mb-3">
        {commentText.trim() === "" ? 0 : commentText.trim().split(/\s+/).length}/200 words
      </Text>

      {/* Status dropdown (simplified) */}
      <Text className="text-xs text-gray-600 mb-1">Status</Text>
      <View className="border border-gray-300 rounded-md mb-4 overflow-hidden">
        <TouchableOpacity
          className="flex-row items-center justify-between px-3 py-2"
          onPress={() => setStatusOpen(!statusOpen)}
        >
          <Text className={selectedStatus ? "text-sm text-gray-800" : "text-sm text-gray-400"}>
            {selectedStatus ?? "Select Status"}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
        </TouchableOpacity>
        {statusOpen && (
          <View className="border-t border-gray-200">
            {["Good", "Moderate", "Poor"].map((s) => (
              <TouchableOpacity
                key={s}
                className="px-3 py-2"
                onPress={() => { setSelectedStatus(s); setStatusOpen(false); }}
              >
                <Text className="text-sm text-gray-700">{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity className="bg-red-700 rounded-lg py-3 items-center">
        <Text className="text-white font-semibold text-sm">Submit Comment</Text>
      </TouchableOpacity>
    </View>
    </View>
    </View>

      {/* Edit Team Info Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="bg-white rounded-2xl w-full" style={{ maxHeight: '85%' }}>
            {/* Modal Header */}
            <View className="px-6 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-lg font-bold">Edit Team Info</Text>
            </View>

            <ScrollView className="px-6" contentContainerStyle={{ paddingVertical: 16 }}>
              {/* Team Name */}
              <Text className="text-sm font-semibold text-gray-700 mb-1">Team Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Team name"
                className="border border-gray-300 rounded-lg px-3 py-2 mb-5 text-gray-800"
                autoCorrect={false}
              />

              {/* Repo URL */}
              <Text className="text-sm font-semibold text-gray-700 mb-1">Repo URL</Text>
              <TextInput
                value={editUrl}
                onChangeText={setEditUrl}
                placeholder="https://gitlab.com/..."
                className="border border-gray-300 rounded-lg px-3 py-2 mb-5 text-gray-800"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

            </ScrollView>

            {/* Modal Footer */}
            <View
              className="px-6 py-4 border-t border-gray-100 flex-row justify-end"
              style={{ gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: '#C8102E' }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
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
