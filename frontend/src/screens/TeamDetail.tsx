import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from 'App';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export default function TeamDetailScreen() {

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
      </Text>

      <Text style={{ marginTop: 10 }}>
      </Text>
    </View>
  );
}