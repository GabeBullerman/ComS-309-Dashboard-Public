import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../App';
import { TeamMember } from '../data/teams';

type TeamDetailProps = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export default function TeamDetailsScreen({ navigation, route }: TeamDetailProps) {
  const { team } = route.params;
  const [selectedMember, setSelectedMember] = useState<TeamMember>(team.members[0]); // Default to first member
  const [activeTab, setActiveTab] = useState<'contributions' | 'demoResults' | 'activity' | 'Push frequency'>('contributions');

  return (
    <View className="flex-1 bg-white pt-16">

      {/* Left Side*/}
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
              style={{ width: 128, height: 128, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}
              className={`w-16 h-16 rounded-full ${selectedMember.name === item.name ? 'ring-2 ring-yellow-400' : ''}`}
            />
            <Text className="mt-2 text-sm">{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Switch Panel */}
      <View className="flex-1 px-4">
        <View className="flex-row justify-around mb-4">
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${activeTab === 'contributions' ? 'bg-yellow-400' : 'bg-gray-200'}`}
            onPress={() => setActiveTab('contributions')}
          >
            <Text className={`${activeTab === 'contributions' ? 'text-white font-bold' : 'text-gray-700'}`}>
              Contributions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${activeTab === 'Push frequency' ? 'bg-yellow-400' : 'bg-gray-200'}`}
            onPress={() => setActiveTab('Push frequency')}
          >
            <Text className={`${activeTab === 'Push frequency' ? 'text-white font-bold' : 'text-gray-700'}`}>
              Push Frequency
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`py-2 px-4 rounded-lg ${activeTab === 'demoResults' ? 'bg-yellow-400' : 'bg-gray-200'}`}
            onPress={() => setActiveTab('demoResults')}
          >
            <Text className={`${activeTab === 'demoResults' ? 'text-white font-bold' : 'text-gray-700'}`}>
              Demo Results
            </Text>
          </TouchableOpacity>
        </View>

        <View className="p-4 bg-gray-100 rounded-lg min-h-[200px]">
          {activeTab === 'contributions' && <Text>{selectedMember.demoResults?.map((demo) => demo.contribution).join('\n')}</Text>}
          {activeTab === 'demoResults' && <Text>{selectedMember.demoResults?.map((demo) => demo.name + ': ' + demo.result).join('\n')}</Text>}
          {activeTab === 'Push frequency' && <Text>{'feature not implemented yet :('}</Text>}
        </View>
      </View>
    </View>
  );
}