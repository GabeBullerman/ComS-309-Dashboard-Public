import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { teamsData } from '../data/teams';
import { TeamCard } from '../components/TeamCard';
import { getUserPermissions, UserRole } from '../utils/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { Picker } from '@react-native-picker/picker';

type StatusFilter = 'All' | 'Good' | 'Moderate' | 'Poor';
type SemesterFilter = 'All' | 'Spring 2026' | 'Fall 2025';

interface Props {
  userRole: UserRole;
}

export default function ClassTeamsScreen({ userRole }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const permissions = getUserPermissions(userRole);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('All');
  const [user, setUser] = useState({ name: 'John Smith', role: 'Instructor' });
  const [selectedTeam, setSelectedTeam] = useState<typeof teamsData[0] | null>(null);

  const filteredTeams = useMemo(() => {
    return teamsData.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.section.toString().includes(searchQuery) ||
        team.ta.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members.some((member) =>
          member.initials.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesTA = user.name.toLowerCase() === team.ta.toLowerCase();

      const matchesStatus =
        statusFilter === 'All' || team.status === statusFilter;

      const matchesSemester =
        semesterFilter === 'All' || team.semester === semesterFilter;

      // Role-based filtering
      const matchesRole =
        userRole === 'Student'
          ? team.name === permissions.assignedTeam // Students only see their team
          : permissions.canViewPastSemesters || team.semester === 'Spring 2026'; // Others can see past if allowed

      return matchesSearch && matchesTA && matchesStatus && matchesSemester && matchesRole;
    }).sort((a, b) => a.section - b.section);
  }, [searchQuery, statusFilter, semesterFilter, userRole, permissions]);


  return (
    <View className="flex-row flex-1 bg-gray-50">
      {/* Main Content */}
      <View className="flex-1 p-6">
        <Text className="text-2xl font-bold">
          Class Teams
        </Text>
        <Text className="text-gray-500 mb-4">
          Manage and view all student teams for your courses
        </Text>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-lg px-4 py-2 mb-3">
          <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
          placeholder="Search teams, projects, section, or members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="w-full pl-3 pr-4 py-3 bg-white border border-gray-300 rounded-lg"
          />
        </View>

      {/* Filters */}
      <View className="flex-row mb-4">
        <Text className="text-sm text-gray-600 mb-2 mr-2 my-2">Status</Text>
        <View className="flex-row flex-wrap gap-2">
              <Picker
                selectedValue={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                dropdownIconColor="#000"
                style={{ height: 44, backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8 }}
              >
                {(['All', 'Poor', 'Moderate', 'Good'] as StatusFilter[]).map(
                  (status) => (
                    <Picker.Item key={status} label={status} value={status} />
                  )
                )}
              </Picker>
        </View>

        {permissions.canViewPastSemesters && (
          <>
            <Text className="text-sm text-gray-600 mx-2 my-2 mb-2">Semester</Text>
            <View className="flex-row flex-wrap gap-2">
              <Picker
                selectedValue={semesterFilter}
                onValueChange={(value) => setSemesterFilter(value as SemesterFilter)}
                dropdownIconColor="#000"
                style={{ height: 44, backgroundColor: '#fff', borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8 }}
              >
                {(['All', 'Spring 2026', 'Fall 2025'] as SemesterFilter[]).map(
                  (semester) => (
                    <Picker.Item key={semester} label={semester} value={semester} />
                  )
                )}
              </Picker>
            </View>
          </>
        )}
      </View>

      <Text className="text-gray-500 mb-4">
        Showing {filteredTeams.length} of {teamsData.length} teams
      </Text>

        {/* Teams List */}
        <FlatList
          data={filteredTeams}
          keyExtractor={(_, index) => index.toString()}
          numColumns={4}
          columnWrapperStyle={{ gap: 8 }}   // spacing between columns
          contentContainerStyle={{
            paddingBottom: 40,
            gap: 8,                          // spacing between rows
          }}
          renderItem={({ item }) => (
            <View style={{ width: '24.5%' }}>
              <TeamCard {...item} onPress={() => {  
                setSelectedTeam(item);
                navigation.navigate('TeamDetail', { team: item });
              }}/>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}