import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';

const mockTasks = [
  { id: 't1', title: 'Submit Project Proposal', due: '2026-02-12', status: 'In Progress' },
  { id: 't2', title: 'TA Live Demo 1', due: '2026-02-20', status: 'Not Started' },
  { id: 't3', title: 'Create Team', due: '2026-02-15', status: 'Completed' },
];

const TasksScreen: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Sort tasks by status priority (In Progress > Not Started > Completed), then by due date
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = mockTasks;

    if (filterStatus !== 'All') {
      filtered = mockTasks.filter(task => task.status === filterStatus);
    }

    // Define status priority: In Progress (1), Not Started (2), Completed (3)
    const getStatusPriority = (status: string) => {
      switch (status) {
        case 'In Progress': return 1;
        case 'Not Started': return 2;
        case 'Completed': return 3;
        default: return 4;
      }
    };

    // Sort by status priority first, then by due date (earliest first)
    return filtered.sort((a, b) => {
      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower number = higher priority
      }
      
      // If same priority, sort by due date (earliest first)
      return new Date(a.due).getTime() - new Date(b.due).getTime();
    });
  }, [filterStatus]);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => Alert.alert('Task Details', `${item.title}\nDue: ${item.due}\nStatus: ${item.status}`)}
    >
      <View style={styles.taskContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>Due: {item.due}</Text>
        <Text style={[styles.status, getStatusStyle(item.status)]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return styles.statusCompleted;
      case 'In Progress':
        return styles.statusInProgress;
      case 'Not Started':
        return styles.statusNotStarted;
      default:
        return styles.statusDefault;
    }
  };

  const filterOptions = ['All', 'Completed', 'In Progress', 'Not Started'];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Tasks</Text>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterButton,
              filterStatus === option && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(option)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === option && styles.filterButtonTextActive
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAndSortedTasks}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tasks match the selected filter.</Text>
        }
      />
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a8a',
    marginBottom: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#C8102E',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  row: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#C8102E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusInProgress: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusNotStarted: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusDefault: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    marginTop: 40,
  },
});

export default TasksScreen;