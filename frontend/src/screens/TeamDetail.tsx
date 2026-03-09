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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { TeamMember } from '../data/teams';
import { getTeam, updateTeamGitlab } from '../utils/auth';

type TeamDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

type TabKey = 'contributions' | 'demoResults' | 'Push frequency';

export default function TeamDetailsScreen({ navigation, route }: TeamDetailProps) {
  const { team, userRole } = route.params;
  const [selectedMember, setSelectedMember] = useState<TeamMember>(team.members[0]);
  const [activeTab, setActiveTab] = useState<TabKey>('contributions');
  const [gitlab, setGitlab] = useState<string>(team.gitlab || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const canEditRepo = userRole === 'TA' || userRole === 'HTA' || userRole === 'Instructor';

  // Fetch fresh team data on mount so gitlab is always up to date
  useEffect(() => {
    if (!team.id) return;
    getTeam(team.id)
      .then((fresh) => { if (fresh.gitlab != null) setGitlab(fresh.gitlab); })
      .catch(() => {}); // silently fall back to whatever was in nav params
  }, [team.id]);

  const handleOpenRepo = () => {
    if (!gitlab) return;
    Linking.openURL(gitlab).catch(() => Alert.alert('Error', 'Could not open URL'));
  };

  const handleEditPress = () => {
    setEditUrl(gitlab);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!team.id) {
      Alert.alert('Error', 'Team ID is missing — cannot save.');
      return;
    }
    setSaving(true);
    try {
      await updateTeamGitlab(team.id, editUrl.trim());
      setGitlab(editUrl.trim());
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save repo URL. Please try again.');
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
          <Text className="text-xl font-bold">{team.name}</Text>
          <Text className="text-gray-500 text-sm">{team.description}</Text>
        </View>
      </View>

      {/* Repo Button */}
      <View className="px-4 pt-3 pb-1 mt-1">
        {canEditRepo ? (
          gitlab ? (
            // Split button: View Project (left) | Edit (right)
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
                <Text className="ml-1 text-white font-semibold">Edit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Full-width Add Repo button
            <TouchableOpacity
              onPress={handleEditPress}
              className="flex-row items-center justify-center rounded-lg py-3 px-4"
              style={{ backgroundColor: '#C8102E' }}
            >
              <Ionicons name="add-circle-outline" size={16} color="white" />
              <Text className="ml-2 text-white font-semibold">Add Repo</Text>
            </TouchableOpacity>
          )
        ) : gitlab ? (
          // Students/read-only: View Project only
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
        keyExtractor={(item) => item.name}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-grow justify-center items-center py-5 px-4"
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedMember(item)} className="mr-4 items-center">
            <Image
              source={typeof item.photo === 'string' ? { uri: item.photo } : item.photo}
              style={{ width: 128, height: 128, borderRadius: 32 }}
            />
            <Text className="mt-2 text-sm">{item.name}</Text>
          </TouchableOpacity>
        )}
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

      {/* Edit / Add Repo Modal */}
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
          <View className="bg-white rounded-2xl p-6 w-full">
            <Text className="text-lg font-bold mb-1">
              {gitlab ? 'Edit Repo URL' : 'Add Repo URL'}
            </Text>
            <Text className="text-gray-500 text-sm mb-4">
              Enter the full URL for {team.name}'s repository.
            </Text>
            <TextInput
              value={editUrl}
              onChangeText={setEditUrl}
              placeholder="https://gitlab.com/..."
              className="border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-800"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View className="flex-row justify-end" style={{ gap: 8 }}>
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
