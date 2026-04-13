import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemberAvatar from './MemberAvatar';

export interface TeamCardProps {
  name: string;
  description: string;
  memberCount: number;
  ta: string;
  section: number;
  status: 'Good' | 'Moderate' | 'Poor';
  members: Array<{ initials: string; color: string; name: string; netid?: string }>;
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
  const [rowWidth, setRowWidth] = useState(0);

  const GAP = 6;
  const n = members.length || 1;
  const avatarSize = rowWidth > 0
    ? Math.min(72, Math.floor((rowWidth - GAP * (n - 1)) / n))
    : 48;

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
      <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>

        {/* Header */}
        <View className="flex-row items-start justify-between" style={{ marginBottom: 12 }}>
          <Text style={{ flex: 1, paddingRight: 8, fontSize: 18, fontWeight: '700', color: '#111827' }}>
            {name}
          </Text>
          <View className="rounded-full" style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: text }}>
              {status}
            </Text>
          </View>
        </View>

        {/* Member count */}
        <View className="flex-row items-center" style={{ marginBottom: 6 }}>
          <Ionicons name="people" size={17} color="#F1BE48" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, color: '#4B5563' }}>{memberCount} members</Text>
        </View>

        {/* TA */}
        <View className="flex-row items-center" style={{ marginBottom: 6 }}>
          <Ionicons name="person-sharp" size={17} color="#64f0cd" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, color: '#4B5563' }}>TA: {ta}</Text>
        </View>

        {/* Section */}
        <View className="flex-row items-center" style={{ marginBottom: 16 }}>
          <Ionicons name="book" size={17} color="#C8102E" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 14, color: '#4B5563' }}>Section: {section}</Text>
        </View>

        {/* Member avatars — fill full card width */}
        <View
          style={{ flexDirection: 'row', gap: GAP }}
          onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
        >
          {members.map((member, index) => (
            <MemberAvatar
              key={index}
              memberId={member.netid || member.name}
              initials={member.initials}
              size={avatarSize}
              borderRadius={avatarSize / 2}
              canEdit={false}
              bordered
            />
          ))}
        </View>

      </View>
    </Pressable>
  );
};