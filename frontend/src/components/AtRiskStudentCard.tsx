import React from 'react';
import { View, Text, Pressable, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemberAvatar from './MemberAvatar';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors, isDark } = useTheme();

  const isCritical = flags.some(f => f.severity === 'critical');
  const borderColor = isCritical ? colors.criticalBorder : isDark ? '#F1BE48' : colors.warningBorder;
  const badgeColor  = isCritical ? colors.criticalBg     : isDark ? '#F1BE48' : colors.statusModerateBg;
  const badgeText   = isCritical ? colors.criticalText   : isDark ? '#111827' : colors.statusModerateText;
  const badgeLabel  = isCritical ? 'Critical' : 'At Risk';
  const initials = studentName.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
      style={({ pressed }) => ({
        flex: 1,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        padding: 18,
        shadowColor: colors.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
          <View style={{ marginRight: 14 }}>
            <MemberAvatar memberId={netid || studentName} initials={initials} size={60} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                {studentName}
              </Text>
              <View style={{ backgroundColor: badgeColor, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: badgeText }}>{badgeLabel}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="people-outline" size={14} color={colors.textFaint} />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{teamName}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="person-sharp" size={14} color={colors.textFaint} />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>TA: {ta}</Text>
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
              backgroundColor: flag.severity === 'critical' ? colors.criticalBg : isDark ? '#F1BE48' : colors.warningBg,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}>
              <Ionicons
                name={flag.severity === 'critical' ? 'alert-circle' : 'warning'}
                size={15}
                color={flag.severity === 'critical' ? colors.criticalBorder : isDark ? '#92400e' : colors.warningIcon}
                style={{ marginTop: 1 }}
              />
              <Text style={{ fontSize: 13, color: flag.severity === 'critical' ? colors.criticalText : isDark ? '#111827' : colors.warningText, flex: 1, lineHeight: 18 }}>
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
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary }}
        >
          <Ionicons name="mail-outline" size={14} color={colors.textInverse} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textInverse }}>Email {netid}@iastate.edu</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};
