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
  demoScores?: Array<{ code: number | null; teamwork: number | null }>;
  onPress?: () => void;
}

const STATUS_STYLES: Record<TeamCardProps['status'], { bg: string; text: string }> = {
  Good:     { bg: '#dcfce7', text: '#15803d' },
  Moderate: { bg: '#fef9c3', text: '#92400e' },
  Poor:     { bg: '#fee2e2', text: '#b91c1c' },
};

const SCORE_COLOR: Record<number, string> = { 0: '#fca5a5', 1: '#fde68a', 2: '#86efac' };
const SCORE_BORDER: Record<number, string> = { 0: '#dc2626', 1: '#d97706', 2: '#16a34a' };

export const TeamCard: React.FC<TeamCardProps> = ({
  name, memberCount, ta, section, status, members, demoScores, onPress,
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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ flex: 1, paddingRight: 8, fontSize: 18, fontWeight: '700', color: '#111827' }}>
            {name}
          </Text>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: text }}>{status}</Text>
            </View>
            {demoScores && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {demoScores.map((d, i) => (
                  <View key={`ds-${i}`} style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, color: '#111827', marginRight: 1 }}>D{i + 1}</Text>
                    {[d.code, d.teamwork].map((score, j) => (
                      <View key={`ds-${i}-${j}`} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: score != null ? SCORE_COLOR[score] : '#e5e7eb', borderWidth: 1, borderColor: score != null ? SCORE_BORDER[score] : '#d1d5db' }} />
                    ))}
                  </View>
                ))}
              </View>
            )}
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
          {members.map((member) => (
            <MemberAvatar
              key={member.netid || member.name}
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