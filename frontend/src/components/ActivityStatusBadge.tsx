import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActivityStatus } from '../api/activity';

const STATUS_CONFIG: Record<ActivityStatus, { bg: string; icon: string }> = {
  online:  { bg: '#22c55e', icon: 'checkmark' },
  away:    { bg: '#eab308', icon: 'time-outline' },
  offline: { bg: '#ef4444', icon: 'close' },
};

interface Props {
  status: ActivityStatus;
  size?: number;
  borderColor?: string;
}

export default function ActivityStatusBadge({ status, size = 14, borderColor = '#fff' }: Props) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: cfg.bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor,
    }}>
      <Ionicons name={cfg.icon as any} size={size * 0.55} color="#fff" />
    </View>
  );
}
