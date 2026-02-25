import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TA {
  id: string;
  name: string;
  email: string;
  role: 'TA' | 'HTA';
  courses: string[];
}

const mockTAs: TA[] = [
  { id: '1', name: 'John Smith', email: 'john.smith@iastate.edu', role: 'HTA', courses: ['CS 309', 'CS 319'] },
  { id: '2', name: 'Alice Brown', email: 'alice.brown@iastate.edu', role: 'TA', courses: ['CS 309'] },
  { id: '3', name: 'Michael Lee', email: 'michael.lee@iastate.edu', role: 'TA', courses: ['CS 319'] },
];

const COURSES = ['CS 309', 'CS 319', 'CS 229'];

export default function TAManagerScreen() {
  const [tas, setTAs] = useState<TA[]>(mockTAs);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'TA' as 'TA' | 'HTA',
    courses: [] as string[],
  });

  const handleInviteTA = () => {
    if (!inviteForm.name || !inviteForm.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const newTA: TA = {
      id: Date.now().toString(),
      ...inviteForm,
    };

    setTAs(prev => [...prev, newTA]);
    setInviteForm({ name: '', email: '', role: 'TA', courses: [] });
    setShowInviteForm(false);
    Alert.alert('Success', 'TA invitation sent successfully!');
  };

  const handleRemoveTA = (taId: string) => {
    Alert.alert(
      'Remove TA',
      'Are you sure you want to remove this TA?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setTAs(prev => prev.filter(ta => ta.id !== taId))
        },
      ]
    );
  };

  const handleUpdateRole = (taId: string, newRole: 'TA' | 'HTA') => {
    setTAs(prev => prev.map(ta =>
      ta.id === taId ? { ...ta, role: newRole } : ta
    ));
  };

  const toggleCourse = (course: string) => {
    setInviteForm(prev => ({
      ...prev,
      courses: prev.courses.includes(course)
        ? prev.courses.filter(c => c !== course)
        : [...prev.courses, course]
    }));
  };

  const renderTAItem = ({ item }: { item: TA }) => (
    <View className="bg-white p-4 rounded-lg mb-3 border border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-gray-600">{item.email}</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => handleUpdateRole(item.id, item.role === 'TA' ? 'HTA' : 'TA')}
            className={`px-3 py-1 rounded-full mr-2 ${
              item.role === 'HTA' ? 'bg-yellow-100' : 'bg-blue-100'
            }`}
          >
            <Text className={`text-xs font-medium ${
              item.role === 'HTA' ? 'text-yellow-800' : 'text-blue-800'
            }`}>
              {item.role}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRemoveTA(item.id)}
            className="p-1"
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row flex-wrap">
        {item.courses.map(course => (
          <View key={course} className="bg-gray-100 px-2 py-1 rounded mr-2 mb-1">
            <Text className="text-xs text-gray-700">{course}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-bold text-gray-800">TA Management</Text>
        <TouchableOpacity
          onPress={() => setShowInviteForm(!showInviteForm)}
          className="bg-red-700 px-4 py-2 rounded-lg flex-row items-center"
        >
          <Ionicons name="person-add" size={16} color="white" />
          <Text className="text-white font-medium ml-2">
            {showInviteForm ? 'Cancel' : 'Invite TA'}
          </Text>
        </TouchableOpacity>
      </View>

      {showInviteForm && (
        <View className="bg-white p-4 rounded-lg mb-6 border border-gray-200">
          <Text className="text-lg font-semibold mb-4">Invite New TA</Text>

          <TextInput
            placeholder="Full Name"
            value={inviteForm.name}
            onChangeText={(text) => setInviteForm(prev => ({ ...prev, name: text }))}
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
          />

          <TextInput
            placeholder="Email Address"
            value={inviteForm.email}
            onChangeText={(text) => setInviteForm(prev => ({ ...prev, email: text }))}
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
          />

          <Text className="text-sm font-medium mb-2">Role:</Text>
          <View className="flex-row mb-3">
            {(['TA', 'HTA'] as const).map(role => (
              <TouchableOpacity
                key={role}
                onPress={() => setInviteForm(prev => ({ ...prev, role }))}
                className={`px-4 py-2 rounded-lg mr-2 ${
                  inviteForm.role === role ? 'bg-red-700' : 'bg-gray-200'
                }`}
              >
                <Text className={`font-medium ${
                  inviteForm.role === role ? 'text-white' : 'text-gray-700'
                }`}>
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-medium mb-2">Assign to Courses:</Text>
          <View className="flex-row flex-wrap mb-4">
            {COURSES.map(course => (
              <TouchableOpacity
                key={course}
                onPress={() => toggleCourse(course)}
                className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                  inviteForm.courses.includes(course) ? 'bg-red-700' : 'bg-gray-200'
                }`}
              >
                <Text className={`text-xs ${
                  inviteForm.courses.includes(course) ? 'text-white' : 'text-gray-700'
                }`}>
                  {course}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleInviteTA}
            className="bg-red-700 px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-medium text-center">Send Invitation</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text className="text-lg font-semibold mb-3">Current TAs ({tas.length})</Text>
      <FlatList
        data={tas}
        keyExtractor={(item) => item.id}
        renderItem={renderTAItem}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text className="text-center text-gray-500 py-8">No TAs assigned yet</Text>
        }
      />
    </ScrollView>
  );
}