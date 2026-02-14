import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface TeamCardProps {
  name: string;
  description: string;
  memberCount: number;
  ta: string;
  section: number;
  status: 'Good' | 'Moderate' | 'Poor';
  members: Array<{ initials: string; color: string }>;
  onPress?: () => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({name, description, memberCount, ta, section, status, members, onPress,}) => {
  const statusColors: Record<TeamCardProps['status'],string> = {
    Good: 'bg-green-100 text-green-700',
    Moderate: 'bg-yellow-100 text-yellow-700',
    Poor: 'bg-red-100 text-red-700',
  };

  return (
    <Pressable
    onPress={onPress}
    className=""
    android_ripple={{ color: '#e5e7eb' }}
    style={({ pressed }) => [
      {
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      },
    ]}
    >
    <View className="bg-white rounded-xl border border-gray-200 p-6 mb-4 shadow-sm">
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-lg font-semibold text-gray-900 flex-1 pr-2">
          {name}
        </Text>

        <View
          className={`px-3 py-1 rounded-full ${statusColors[status].split(' ')[0]}`}
        >
          <Text
            className={`text-xs font-medium ${statusColors[status].split(' ')[1]}`}
          >
            {status}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text className="text-sm text-gray-600 mb-4">
        {description}
      </Text>

      {/* Members */}
      <View className="space-y-2">
        <View className="flex-row items-center mb-2">
          <Ionicons
            name="people"
            size={16}
            color="#F1BE48"
            style={{ marginRight: 8 }}
          />
          <Text className="text-sm text-gray-600">
            {memberCount} members
          </Text>
        </View>
      </View>

      {/* TA */}
      <View className="space-y-2">
        <View className="flex-row items-center mb-2">
          <Ionicons
            name="person-sharp"
            size={16}
            color="#64f0cd"
            style={{ marginRight: 8 }}
          />
          <Text className="text-sm text-gray-600">
            TA: {ta}
          </Text>
        </View>
      </View>

      {/* Section */}
      <View className="space-y-2 mb-3">
        <View className="flex-row items-center mb-2">
          <Ionicons
            name="book"
            size={16}
            color="#C8102E"
            style={{ marginRight: 8 }}
          />
          <Text className="text-sm text-gray-600">
            Section: {section}
          </Text>
        </View>
      </View>

      {/* Member Avatars */}
      <View className="flex-row items-center">
        {members.map((member, index) => (
          <View
            key={index}
            className={`w-10 h-10 rounded-full items-center justify-center mr-5 ${member.color}`}
          >
            <Text className="text-sm font-semibold text-white">
              {member.initials}
            </Text>
          </View>
        ))}
      </View>
    </View>
    </Pressable>
  );
};