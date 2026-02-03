import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';

const mockAssignments = [
  { id: 'a1', title: 'Lab 1', due: '2026-02-12' },
  { id: 'a2', title: 'Project Proposal', due: '2026-02-19' },
];

const AssignmentsSkeleton: React.FC = () => {
  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => Alert.alert('Assignment', `${item.title}\nDue: ${item.due}`)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.meta}>Due: {item.due}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Assignments (Skeleton)</Text>
      <FlatList data={mockAssignments} keyExtractor={(i) => i.id} renderItem={renderItem} />
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
  title: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 4 },
});

export default AssignmentsSkeleton;