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

const statusStyle: Record<TeamCardProps['status'], { bg: string; text: string }> = {
  Good:     { bg: '#dcfce7', text: '#15803d' },
  Moderate: { bg: '#fef9c3', text: '#92400e' },
  Poor:     { bg: '#fee2e2', text: '#b91c1c' },
};

export const TeamCard: React.FC<TeamCardProps> = ({
  name, memberCount, ta, section, status, members, onPress,
}) => {
  const { bg, text } = statusStyle[status];

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
      <View style={{
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, paddingRight: 8 }}>
            {name}
          </Text>
          <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: text }}>{status}</Text>
          </View>
        </View>

        {/* Members count */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="people" size={15} color="#F1BE48" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, color: '#4B5563' }}>{memberCount} members</Text>
        </View>

        {/* TA */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="person-sharp" size={15} color="#64f0cd" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, color: '#4B5563' }}>TA: {ta}</Text>
        </View>

        {/* Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="book" size={15} color="#C8102E" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 13, color: '#4B5563' }}>Section: {section}</Text>
        </View>

        {/* Member Avatars */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {members.map((member, index) => (
            <View
              key={index}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#F1BE48',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#d97706',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1f2937' }}>
                {member.initials}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
};
