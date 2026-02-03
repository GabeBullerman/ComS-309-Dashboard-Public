import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';

const mockGroups = [
  { id: 'g1', name: 'Team Alpha', members: 4 },
  { id: 'g2', name: 'Team Beta', members: 3 },
  { id: 'g3', name: 'Team Gamma', members: 5 },
];

const GroupsSkeleton: React.FC = () => {
  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => Alert.alert('Group Details', `${item.name}\nMembers: ${item.members}`)}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>{item.members} members</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Groups (Skeleton)</Text>
      <FlatList data={mockGroups} keyExtractor={(i) => i.id} renderItem={renderItem} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f7fa',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 12,
  },
  row: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#C8102E',
  },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 4 },
});

export default GroupsSkeleton;