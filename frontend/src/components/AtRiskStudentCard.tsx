import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemberAvatar from './MemberAvatar';

export type RiskSeverity = 'warning' | 'critical';

export interface AtRiskFlag {
  reason: string;
  severity: RiskSeverity;
}

export interface AtRiskStudentProps {
  netid: string;
  studentName: string;
  teamName: string;
  ta: string;
  section: number;
  flags: AtRiskFlag[];
  onPress?: () => void;
}

export const AtRiskStudentCard: React.FC<AtRiskStudentProps> = ({
  netid, studentName, teamName, ta, section, flags, onPress,
}) => {
  const isCritical = flags.some(f => f.severity === 'critical');
  const borderColor = isCritical ? '#dc2626' : '#f59e0b';
  const badgeColor = isCritical ? '#fee2e2' : '#fef9c3';
  const badgeText = isCritical ? '#b91c1c' : '#92400e';
  const badgeLabel = isCritical ? 'Critical' : 'At Risk';
  const initials = studentName.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');

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
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
          {/* Avatar */}
          <View style={{ marginRight: 10 }}>
            <MemberAvatar memberId={netid || studentName} initials={initials} size={44} />
          </View>

          {/* Name + meta */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 6 }} numberOfLines={1}>
                {studentName}
              </Text>
              <View style={{ backgroundColor: badgeColor, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: badgeText }}>{badgeLabel}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="people-outline" size={12} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>{teamName}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="person-sharp" size={12} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>TA: {ta}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="book-outline" size={12} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>§{section}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Risk flags */}
        <View style={{ gap: 5 }}>
          {flags.map((flag, i) => (
            <View key={i} style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 6,
              backgroundColor: flag.severity === 'critical' ? '#fee2e2' : '#fefce8',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 5,
            }}>
              <Ionicons
                name={flag.severity === 'critical' ? 'alert-circle' : 'warning'}
                size={13}
                color={flag.severity === 'critical' ? '#dc2626' : '#d97706'}
                style={{ marginTop: 1 }}
              />
              <Text style={{ fontSize: 12, color: flag.severity === 'critical' ? '#b91c1c' : '#92400e', flex: 1 }}>
                {flag.reason}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
};
