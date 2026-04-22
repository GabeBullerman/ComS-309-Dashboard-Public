import React from 'react';
import { View, Text, Pressable, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MemberAvatar from './MemberAvatar';
import { useTheme } from '../contexts/ThemeContext';

export interface StudentListCardProps {
  netid: string;
  studentFirstName: string;
  studentLastName: string;
  ta: string;

  onPress?: () => void;
}

export const StudentListCard: React.FC<StudentListCardProps> = ({
  netid, studentFirstName, studentLastName, ta, onPress,
}) => {
  const { colors } = useTheme();
  const initials = `${studentFirstName.charAt(0)}${studentLastName.charAt(0)}`.toUpperCase();

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
        borderColor: colors.border,
        padding: 18,
        shadowColor: colors.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
          <View style={{ marginRight: 14 }}>
            <MemberAvatar memberId={netid || `${studentFirstName} ${studentLastName}`} initials={initials} size={60} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
                {studentFirstName} {studentLastName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="person-sharp" size={14} color={colors.textFaint} />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>TA: {ta}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="mail-outline" size={14} color={colors.textFaint} />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Net ID: {netid}</Text>
              </View>
            </View>
          </View>
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
