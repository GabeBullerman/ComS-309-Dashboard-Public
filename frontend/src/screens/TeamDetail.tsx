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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { TeamMember } from '../data/teams';
import { getTeam, updateTeamInfo } from '../utils/auth';

type TeamDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

type TabKey = 'contributions' | 'demoResults' | 'Push frequency';
type ProjectRole = 'Frontend' | 'Backend' | 'Full Stack';

const PROJECT_ROLES: ProjectRole[] = ['Frontend', 'Backend', 'Full Stack'];

export default function TeamDetailsScreen({ navigation, route }: TeamDetailProps) {
  const { team, userRole } = route.params;
  const [selectedMember, setSelectedMember] = useState<TeamMember>(team.members[0]);
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
  const rolesKey = `team_member_roles_${team.id}`;

  // Fetch fresh team data and stored member roles on mount
  useEffect(() => {
    if (!team.id) return;
    getTeam(team.id)
      .then((fresh) => {
        if (fresh.gitlab != null) setGitlab(fresh.gitlab);
        if (fresh.name) setTeamName(fresh.name);
      })
      .catch(() => {});
    AsyncStorage.getItem(rolesKey)
      .then((stored) => { if (stored) setMemberRoles(JSON.parse(stored)); })
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
      await AsyncStorage.setItem(rolesKey, JSON.stringify(editRoles));
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

      {/* Team Members */}
      <FlatList
        horizontal
        data={team.members}
        keyExtractor={(item) => item.netid || item.name}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-grow justify-center items-center py-5 px-4"
        renderItem={({ item }) => {
          const memberKey = item.netid || item.name;
          const role = memberRoles[memberKey];
          return (
            <TouchableOpacity onPress={() => setSelectedMember(item)} className="mr-4 items-center">
              <Image
                source={typeof item.photo === 'string' ? { uri: item.photo } : item.photo}
                style={{ width: 128, height: 128, borderRadius: 32 }}
              />
              <Text className="mt-2 text-sm">{item.name}</Text>
              {role && (
                <View
                  className="mt-1 px-2 rounded-full"
                  style={{ backgroundColor: '#C8102E', paddingVertical: 2 }}
                >
                  <Text className="text-white text-xs font-medium">{role}</Text>
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
