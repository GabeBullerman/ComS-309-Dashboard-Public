import React, { useEffect, useState } from 'react';
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

type TeamDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

type TabKey = 'contributions' | 'demoResults' | 'Push frequency';
type ProjectRole = 'Frontend' | 'Backend' | 'Full Stack';

const PROJECT_ROLES: ProjectRole[] = ['Frontend', 'Backend', 'Full Stack'];

export default function TeamDetailsScreen({ navigation, route }: TeamDetailProps) {
  const { team, userRole } = route.params;
  const [selectedKey, setSelectedKey] = useState<string>('team');
  const selectedMember =
    selectedKey === 'team'
      ? team.members[0]
      : (team.members.find((m) => (m.netid || m.name) === selectedKey) ?? team.members[0]);
  const [activeTab, setActiveTab] = useState<TabKey>('contributions');
  const [gitlab, setGitlab] = useState<string>(team.gitlab || '');
  const [teamName, setTeamName] = useState(team.name);
  const [memberRoles, setMemberRoles] = useState<Record<string, ProjectRole>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<Record<string, ProjectRole>>({});
  const [saving, setSaving] = useState(false);

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

  const handleOpenRepo = () => {
    if (!gitlab) return;
    Linking.openURL(gitlab).catch(() => Alert.alert('Error', 'Could not open URL'));
  };

  const handleEditPress = () => {
    setEditUrl(gitlab);
    setEditName(teamName);
    setEditRoles({ ...memberRoles });
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
      // Save each member's project role to the backend
      for (const member of team.members) {
        const key = member.netid || member.name;
        const role = editRoles[key];
        if (member.id && role !== memberRoles[key]) {
          await setUserProjectRole(member.id, role ?? '');
        }
      }
      setGitlab(editUrl.trim());
      setTeamName(editName.trim());
      setMemberRoles(editRoles);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'contributions', label: 'Contributions' },
    { key: 'Push frequency', label: 'Push Frequency' },
    { key: 'demoResults', label: 'Demo Results' },
  ];

  return (
    <View className="flex-1 bg-white pt-16">
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

      {/* Team Members — "All Members" tile + individual members */}
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
            const isSelected = selectedKey === 'team';
            return (
              <TouchableOpacity
                onPress={() => setSelectedKey('team')}
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
                  <View style={{
                    width: INNER, height: INNER,
                    borderRadius: RADIUS_INNER,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="people" size={60} color={isSelected ? '#F1BE48' : '#9CA3AF'} />
                  </View>
                </View>
                <Text style={{ marginTop: 8, fontSize: 14, fontWeight: isSelected ? '700' : '400' }}>
                  All Members
                </Text>
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
              {role && (
                <View style={{ backgroundColor: '#C8102E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>{role}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Tab Panel */}
      <View className="flex-1 px-4">
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

        <View className="p-4 bg-gray-100 rounded-lg min-h-[200px]">
          {activeTab === 'contributions' && (
            <Text>{selectedMember.demoResults?.map((d) => d.contribution).join('\n')}</Text>
          )}
          {activeTab === 'demoResults' && (
            <Text>{selectedMember.demoResults?.map((d) => `${d.name}: ${d.result}`).join('\n')}</Text>
          )}
          {activeTab === 'Push frequency' && (
            <Text>{'feature not implemented yet :('}</Text>
          )}
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

              {/* Member Roles */}
              {team.members.length > 0 && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-3">Member Roles</Text>
                  {team.members.map((member) => {
                    const memberKey = member.netid || member.name;
                    const selected = editRoles[memberKey];
                    return (
                      <View key={memberKey} className="mb-4">
                        <Text className="text-sm text-gray-600 mb-1">{member.name}</Text>
                        <View className="flex-row" style={{ gap: 6 }}>
                          {PROJECT_ROLES.map((role) => (
                            <TouchableOpacity
                              key={role}
                              onPress={() =>
                                setEditRoles((prev) => ({ ...prev, [memberKey]: role }))
                              }
                              className="flex-1 items-center py-2 rounded-lg"
                              style={{
                                backgroundColor: selected === role ? '#C8102E' : '#F3F4F6',
                              }}
                            >
                              <Text
                                style={{
                                  color: selected === role ? 'white' : '#374151',
                                  fontSize: 12,
                                  fontWeight: '500',
                                }}
                              >
                                {role}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
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
    </View>
  );
}
