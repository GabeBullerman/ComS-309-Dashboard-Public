import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TaskStatus = 'Assigned' | 'In Progress' | 'Completed';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: TaskStatus;
}

const TA_LIST = ['John Smith', 'Alice Brown', 'Michael Lee'];

export default function TaskAssignmentScreen() {
  const [selectedTA, setSelectedTA] = useState<string>(TA_LIST[0]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: TA_LIST[0],
    dueDate: '',
  });

  const handleCreateTask = () => {
    if (!newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      ...newTask,
      status: 'Assigned',
    };

    setTasks((prev) => [...prev, task]);

    setNewTask({
      title: '',
      description: '',
      assignedTo: selectedTA,
      dueDate: '',
    });
  };

  const filteredTasks = tasks.filter(
    (task) => task.assignedTo === selectedTA
  );

  const statusColors: Record<TaskStatus, string> = {
    Assigned: 'bg-yellow-100 text-yellow-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
  };

  return (
    <View className="flex-1 bg-gray-50 p-6">
      {/* Header */}
      <Text className="text-2xl font-bold">Task Assignment</Text>
      <Text className="text-gray-500 mb-6">
        Create and assign tasks to teaching assistants
      </Text>

      <View className="flex-row gap-6 flex-1">

        {/* LEFT: Create Task Panel */}
        <View className="w-1/3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <Text className="text-lg font-semibold mb-4">
            Create Task
          </Text>

          <TextInput
            placeholder="Task Title"
            value={newTask.title}
            onChangeText={(text) =>
              setNewTask({ ...newTask, title: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
          />

          <TextInput
            placeholder="Description"
            multiline
            value={newTask.description}
            onChangeText={(text) =>
              setNewTask({ ...newTask, description: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
          />

          <TextInput
            placeholder="Due Date"
            value={newTask.dueDate}
            onChangeText={(text) =>
              setNewTask({ ...newTask, dueDate: text })
            }
            className="border border-gray-300 rounded-lg px-3 py-2 mb-4"
          />

          <TouchableOpacity
            onPress={handleCreateTask}
            className="bg-[#C8102E] py-3 rounded-lg items-center"
          >
            <Text className="text-white font-semibold">
              Create Task
            </Text>
          </TouchableOpacity>
        </View>

        {/* RIGHT: Scrollable Task Menu */}
        <View className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* TA Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'baseline' }}
            className="border-b border-gray-200 px-4 py-3"
          >
            {TA_LIST.map((ta) => (
              <TouchableOpacity
                key={ta}
                onPress={() => {
                  setSelectedTA(ta);
                  setNewTask({ ...newTask, assignedTo: ta });
                }}
                className={`px-4 py-2 rounded-md mr-2 ${
                  selectedTA === ta
                    ? 'bg-[#C8102E]'
                    : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedTA === ta
                      ? 'text-white'
                      : 'text-gray-800'
                  }`}
                >
                  {ta}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Task List */}
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <View className="flex-row justify-between mb-2">
                  <Text className="font-semibold text-gray-900">
                    {item.title}
                  </Text>

                  <View
                    className={`px-3 py-1 rounded-full ${
                      statusColors[item.status].split(' ')[0]
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        statusColors[item.status].split(' ')[1]
                      }`}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-600 mb-3">
                  {item.description}
                </Text>

                <View className="flex-row items-center">
                  <Ionicons
                    name="calendar"
                    size={14}
                    color="#F1BE48"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-sm text-gray-600">
                    Due: {item.dueDate || 'No due date'}
                  </Text>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={true}
          />
        </View>
      </View>
    </View>
  );
}