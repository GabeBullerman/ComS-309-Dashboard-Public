import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { teamsData } from '../data/teams';
import { TeamCard } from '../components/TeamCard';

type StatusFilter = 'All' | 'Good' | 'Moderate' | 'Poor';
type SemesterFilter = 'All' | 'Spring 2026' | 'Fall 2025';

export default function ClassTeamsScreen() {

const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [semesterFilter, setSemesterFilter] =
    useState<SemesterFilter>('All');

  const filteredTeams = useMemo(() => {
    return teamsData.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || team.status === statusFilter;

      const matchesSemester =
        semesterFilter === 'All' || team.semester === semesterFilter;

      return matchesSearch && matchesStatus && matchesSemester;
    });
  }, [searchQuery, statusFilter, semesterFilter]);


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
        <View className="flex-row items-center bg-white rounded-lg px-3 py-2 mb-3">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
          placeholder="Search teams, projects, or members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg"
          />
        </View>

      {/* Filters */}
      <View className="mb-4">
        <Text className="text-sm text-gray-600 mb-2">Status</Text>
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
              <TeamCard {...item} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}