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

const STATUS_STYLES: Record<TeamCardProps['status'], { bg: string; text: string }> = {
  Good:     { bg: '#dcfce7', text: '#15803d' },
  Moderate: { bg: '#fef9c3', text: '#92400e' },
  Poor:     { bg: '#fee2e2', text: '#b91c1c' },
};

export const TeamCard: React.FC<TeamCardProps> = ({
  name, memberCount, ta, section, status, members, onPress,
}) => {
  const { bg, text } = STATUS_STYLES[status];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#e5e7eb' }}
      style={({ pressed }) => ({
        flex: 1,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View className="flex-1 bg-white rounded-xl border border-gray-200 px-3.5 py-3 shadow-sm elevation-2">

        {/* Header */}
        <View className="flex-row items-start justify-between mb-2">
          <Text className="flex-1 pr-2 text-base font-semibold text-gray-900">
            {name}
          </Text>
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: bg }}>
            <Text className="text-[11px] font-semibold" style={{ color: text }}>
              {status}
            </Text>
          </View>
        </View>

        {/* Member count */}
        <View className="flex-row items-center mb-1">
          <Ionicons name="people" size={15} color="#F1BE48" className="mr-1.5" />
          <Text className="text-[13px] text-gray-600">{memberCount} members</Text>
        </View>

        {/* TA */}
        <View className="flex-row items-center mb-1">
          <Ionicons name="person-sharp" size={15} color="#64f0cd" className="mr-1.5" />
          <Text className="text-[13px] text-gray-600">TA: {ta}</Text>
        </View>

        {/* Section */}
        <View className="flex-row items-center mb-2.5">
          <Ionicons name="book" size={15} color="#C8102E" className="mr-1.5" />
          <Text className="text-[13px] text-gray-600">Section: {section}</Text>
        </View>

        {/* Member avatars */}
        <View className="flex-row flex-wrap gap-1.5">
          {members.map((member, index) => (
            <View
              key={index}
              className="w-9 h-9 rounded-full bg-yellow-400 items-center justify-center border-[1.5px] border-amber-600"
            >
              <Text className="text-xs font-semibold text-gray-800">
                {member.initials}
              </Text>
            </View>
          ))}
        </View>

      </View>
    </Pressable>
  );
};