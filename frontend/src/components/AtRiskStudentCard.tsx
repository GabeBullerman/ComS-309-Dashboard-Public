import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AtRiskStudentProps {
  name: string;
  ta: string;
  section: number;
  atRiskReason: string;
  onPress?: () => void;
}

export const AtRiskStudentCard: React.FC<AtRiskStudentProps> = ({
  name, ta, section, atRiskReason, onPress,
}) => {

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
      <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3.5 py-3 shadow-sm elevation-2">
        {/* Avatar with initials */}
        <View className="w-16 h-16 mr-3 rounded-full bg-yellow-400 items-center justify-center border-[1.5px] border-amber-600">
            <Text className="text-gray-800 font-semibold">{name.split(' ').map(n => n[0]).join('').toUpperCase()}</Text>
        </View>

        <View className="flex-1 mb-2">
            {/* Header */}
            <View className="flex-row items-start justify-between mb-2">
            <Text className="flex-1 pr-2 text-base font-semibold text-gray-900">
                {name}
            </Text>
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

            {/* Risk Reason */}
            <View className="bg-gray-100 p-2 rounded-lg">
                <Text className="text-xs text-gray-500 mb-1">At risk reason: {atRiskReason}</Text>
            </View>
        </View>
      </View>
    </Pressable>
  );
};