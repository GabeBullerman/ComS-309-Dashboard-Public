import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { teamsData } from '../data/teams';
import { TeamCard } from '../components/TeamCard';
import { UserRole, getUserPermissions } from '../utils/auth';

type StatusFilter = 'All' | 'Good' | 'Moderate' | 'Poor';
type SemesterFilter = 'All' | 'Spring 2026' | 'Fall 2025';

export default function ClassTeamsScreen({ userRole }: { userRole: UserRole }) {
  const permissions = getUserPermissions(userRole);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>('All');
  const [user, setUser] = useState({ name: 'John Smith', role: 'Instructor' });
  const [selectedTeam, setSelectedTeam] = useState<typeof teamsData[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filteredTeams = useMemo(() => {
    return teamsData.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.section.toString().includes(searchQuery) ||
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

      return matchesSearch && matchesStatus && matchesSemester && matchesRole;
    });
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
          {(['All', 'Good', 'Moderate', 'Poor'] as StatusFilter[]).map(
            (status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-md ${
                  statusFilter === status
                    ? 'bg-[#C8102E]'
                    : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-sm ${
                    statusFilter === status
                      ? 'text-white'
                      : 'text-gray-800'
                  }`}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {permissions.canViewPastSemesters && (
          <>
            <Text className="text-sm text-gray-600 mb-2">Semester</Text>
            <View className="flex-row flex-wrap gap-2">
              {(['All', 'Spring 2026', 'Fall 2025'] as SemesterFilter[]).map(
                (semester) => (
                  <TouchableOpacity
                    key={semester}
                    onPress={() => setSemesterFilter(semester)}
                    className={`px-3 py-2 rounded-md ${
                      semesterFilter === semester
                        ? 'bg-[#C8102E]'
                        : 'bg-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        semesterFilter === semester
                          ? 'text-white'
                          : 'text-gray-800'
                      }`}
                    >
                      {semester}
                    </Text>
                  </TouchableOpacity>
                )
              )}
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
                setModalVisible(true);
              }}/>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/*Overlay on team card click*/}
      <Modal
      visible={modalVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <View className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-lg">

          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">
              {selectedTeam?.name}
            </Text>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text className="text-gray-600 mb-4">
            {selectedTeam?.description}
          </Text>

          {/* Details */}
          <View className="space-y-2">
            <Text>Section: {selectedTeam?.section}</Text>
            <Text>Status: {selectedTeam?.status}</Text>
            <Text>TA: {selectedTeam?.ta}</Text>
            <Text>Members: {selectedTeam?.members.map((member) => member.name).join(', ')}</Text>
          </View>

        </View>
      </View>
    </Modal>
    </View>
  );
}