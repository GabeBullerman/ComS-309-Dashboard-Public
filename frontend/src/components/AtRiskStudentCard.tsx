import React from 'react';
import { View, Text, Pressable, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemberAvatar from './MemberAvatar';

export type RiskSeverity = 'warning' | 'critical';

export interface AtRiskFlag {
  reason: string;
  severity: RiskSeverity;
  category: 'attendance' | 'performance';
}

export interface AtRiskStudentProps {
  netid: string;
  studentName: string;
  teamName: string;
  ta: string;

  flags: AtRiskFlag[];
  onPress?: () => void;
}

export const AtRiskStudentCard: React.FC<AtRiskStudentProps> = ({
  netid, studentName, teamName, ta, flags, onPress,
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
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        padding: 18,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
          {/* Avatar */}
          <View style={{ marginRight: 14 }}>
            <MemberAvatar memberId={netid || studentName} initials={initials} size={60} />
          </View>

          {/* Name + meta */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 }} numberOfLines={1}>
                {studentName}
              </Text>
              <View style={{ backgroundColor: badgeColor, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: badgeText }}>{badgeLabel}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="people-outline" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>{teamName}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="person-sharp" size={14} color="#9ca3af" />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>TA: {ta}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Risk flags */}
        <View style={{ gap: 6 }}>
          {flags.map((flag, i) => (
            <View key={i} style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              backgroundColor: flag.severity === 'critical' ? '#fee2e2' : '#fefce8',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}>
              <Ionicons
                name={flag.severity === 'critical' ? 'alert-circle' : 'warning'}
                size={15}
                color={flag.severity === 'critical' ? '#dc2626' : '#d97706'}
                style={{ marginTop: 1 }}
              />
              <Text style={{ fontSize: 13, color: flag.severity === 'critical' ? '#b91c1c' : '#92400e', flex: 1, lineHeight: 18 }}>
                {flag.reason}
              </Text>
            </View>
          ))}
        </View>

        {/* Contact button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            const email = `${netid}@iastate.edu`;
            if (Platform.OS === 'web') {
              window.open(`https://outlook.office.com/mail/deeplink/compose?to=${email}`, '_blank');
            } else {
              Linking.openURL(`mailto:${email}`);
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#b91c1c' }}
        >
          <Ionicons name="mail-outline" size={14} color="white" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: 'white' }}>Email {netid}@iastate.edu</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};
