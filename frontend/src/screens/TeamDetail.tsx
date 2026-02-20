import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';

type TeamMember = {
  id: string;
  name: string;
  photo: string;
  contributions: string;
  demoResults: string;
  activity: string;
};

const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Alice',
    photo: 'https://randomuser.me/api/portraits/women/1.jpg',
    contributions: 'Designed UI, implemented components',
    demoResults: 'Demo 1: 90%, Demo 2: 95%',
    activity: 'Active, submitted updates daily',
  },
  {
    id: '2',
    name: 'Bob',
    photo: 'https://randomuser.me/api/portraits/men/2.jpg',
    contributions: 'Backend API, database',
    demoResults: 'Demo 1: 85%, Demo 2: 88%',
    activity: 'Active, fixed bugs quickly',
  },
  {
    id: '3',
    name: 'Charlie',
    photo: 'https://randomuser.me/api/portraits/men/3.jpg',
    contributions: 'Testing, QA',
    demoResults: 'Demo 1: 92%, Demo 2: 96%',
    activity: 'Moderately active, thorough testing',
  },
  {
    id: '4',
    name: 'Diana',
    photo: 'https://randomuser.me/api/portraits/women/4.jpg',
    contributions: 'Documentation, presentations',
    demoResults: 'Demo 1: 100%, Demo 2: 100%',
    activity: 'Very active, excellent communication',
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export default function TeamDetailsScreen({ navigation, route }: Props) {
//   const { team } = route.params.team;
  const [selectedMember, setSelectedMember] = useState<TeamMember>(teamMembers[0]);
  const [activeTab, setActiveTab] = useState<'contributions' | 'demoResults' | 'activity'>('contributions');

  return (
    <View className="flex-1 bg-white pt-16">
      {/* Header */}
      <View className="flex-row items-center px-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="pr-4">
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View className="flex-1 items-center mr-10">
          <Text className="text-xl font-bold">Team Phoenix</Text>
          <Text className="text-gray-500 text-sm">AI-powered task manager</Text>
        </View>
      </View>

      {/* Team Members */}
      <FlatList
        horizontal
        data={teamMembers}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="py-5 px-4"
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedMember(item)} className="mr-4 items-center">
            <Image
              source={{ uri: item.photo }}
              className={`w-16 h-16 rounded-full ${selectedMember.id === item.id ? 'ring-2 ring-blue-500' : ''}`}
            />
            <Text className="mt-2 text-sm">{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Switch Panel */}
      <View className="flex-1 px-4">
        <View className="flex-row justify-around mb-4">
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${activeTab === 'contributions' ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setActiveTab('contributions')}
          >
            <Text className={`${activeTab === 'contributions' ? 'text-white font-bold' : 'text-gray-700'}`}>
              Contributions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${activeTab === 'demoResults' ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setActiveTab('demoResults')}
          >
            <Text className={`${activeTab === 'demoResults' ? 'text-white font-bold' : 'text-gray-700'}`}>
              Demo Results
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${activeTab === 'activity' ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setActiveTab('activity')}
          >
            <Text className={`${activeTab === 'activity' ? 'text-white font-bold' : 'text-gray-700'}`}>Activity</Text>
          </TouchableOpacity>
        </View>

        <View className="p-4 bg-gray-100 rounded-lg min-h-[100px]">
          {activeTab === 'contributions' && <Text>{selectedMember.contributions}</Text>}
          {activeTab === 'demoResults' && <Text>{selectedMember.demoResults}</Text>}
          {activeTab === 'activity' && <Text>{selectedMember.activity}</Text>}
        </View>
      </View>
    </View>
  );
}