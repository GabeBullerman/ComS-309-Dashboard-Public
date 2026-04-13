import { View, Text, TouchableOpacity, Image, Dimensions, StatusBar, Platform } from "react-native";
import TeamsScreen from "../screens/TeamsScreen";
import TAManager from "../screens/TAManager";
import TaskAssignmentScreen from "../screens/TaskAssignmentScreen";
import AssignmentsScreen from "../screens/AssignmentsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useEffect, useState } from "react";
import { getUserPermissions } from "../utils/auth";
import { getCurrentUser } from "../api/users";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from "@expo/vector-icons";
import ProfileAvatar from "../components/ProfileAvatar";
import UploadScreen from "./UploadScreen";
import AtRiskStudentsScreen from "./AtRiskStudentsScreen";
import StudentListScreen from "./StudentListScreen";

type Props = NativeStackScreenProps<RootStackParamList, 'DashboardScreen'>;

export default function DashboardScreen({route}: Props) {
  const [activeScreen, setActiveScreen] = useState("Teams");
  const [displayName, setDisplayName] = useState("User");
  const [netid, setNetid] = useState("");
  const permissions = getUserPermissions(route.params.userRole);
  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;
  const role = route.params.userRole;

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (user?.netid) setNetid(user.netid);
        if (user?.name && user.name.trim().length > 0) {
          setDisplayName(user.name);
          return;
        }
        if (user?.netid && user.netid.trim().length > 0) {
          setDisplayName(user.netid);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const navItems = [
    { label: "Teams",        mobileLabel: "Teams",  icon: "people-outline" },
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "Assign Tasks", mobileLabel: "Assign", icon: "clipboard-outline" }] : []),
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "Student List", mobileLabel: "Students", icon: "clipboard-outline" }] : []),
    ...(permissions.canManageTAs
      ? [{ label: "TA Manager",   mobileLabel: "TAs",    icon: "shield-outline" }] : []),
    ...(role == 'Instructor' || role == "HTA"
      ? [{ label: "Upload",   mobileLabel: "Upload",    icon: "cloud-upload-outline" }] : []),
    ...(role !== 'Instructor'
      ? [{ label: "Tasks",        mobileLabel: "Tasks",  icon: "checkmark-circle-outline" }] : []),
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "At-Risk Students",   mobileLabel: "At-Risk",    icon: "alert-circle-outline" }] : []),
    { label: "Profile",      mobileLabel: "Profile",icon: "person-circle-outline" },
  ] as { label: string; mobileLabel: string; icon: string }[];

  const renderScreen = () => {
    switch (activeScreen) {
      case "Teams":        return <TeamsScreen userRole={route.params.userRole} />;
      case "Student List": return <StudentListScreen userRole={route.params.userRole} />;
      case "Assign Tasks": return <TaskAssignmentScreen />;
      case "TA Manager":   return <TAManager />;
      case "Upload":       return <UploadScreen/>;
      case "Tasks":        return <AssignmentsScreen />;
      case "Profile":      return <ProfileScreen userRole={role} onLogout={isMobile ? route.params.onLogout : undefined} />;
      case "At-Risk Students": return <AtRiskStudentsScreen userRole={route.params.userRole} />;
      default:             return <TeamsScreen userRole={route.params.userRole} />;
    }
  };

  const renderSidebarContent = () => (
    <>
      <View className="p-4" style={{ borderBottomWidth: 1.5, borderBottomColor: 'rgba(241,190,72,0.45)' }}>
        <Image
          source={require("../Images/Iowa_State_Cyclones_logo.png")}
          style={{ width: 80, height: 80, transform: [{ scale: 1.2 }], alignSelf: 'center' }}
          resizeMode="contain"
        />
        <Text className="text-white text-lg font-bold text-center mt-1">
          Class Dashboard
        </Text>
        <Text className="text-yellow-200 mb-6 text-center">
          Iowa State University
        </Text>
      </View>

      {navItems.filter(i => i.label !== 'Profile').map((item) => {
        const isActive = activeScreen === item.label;
        return (
          <TouchableOpacity
            key={item.label}
            onPress={() => setActiveScreen(item.label)}
            className={`flex-row items-center gap-3 rounded-lg px-4 py-3 mb-2 ${isActive ? "bg-yellow-400" : ""}`}
          >
            <Ionicons
              name={item.icon as any}
              size={18}
              color={isActive ? "#713f12" : "rgba(255,255,255,0.85)"}
            />
            <Text className={`font-medium ${isActive ? "text-yellow-900" : "text-white"}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* User Section */}
      <View className="mt-auto pt-6" style={{ borderTopWidth: 1.5, borderTopColor: 'rgba(241,190,72,0.45)' }}>
        <TouchableOpacity
          className="flex-row items-center gap-3"
          onPress={() => setActiveScreen('Profile')}
        >
          <ProfileAvatar
            userId={netid || displayName}
            initials={initials}
            size={40}
            style={{ borderWidth: 3, borderColor: '#111827' }}
          />
          <View style={{ flex: 1 }}>
            <Text className="font-semibold text-sm text-white">{displayName}</Text>
            <Text className="text-xs text-white/70">{role} · Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={route.params.onLogout}
          className="mt-4 px-4 py-2 bg-red-600 rounded-lg"
        >
          <Text className="text-white text-sm font-medium text-center">Logout</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── Mobile layout: content + bottom tab bar ───────────────────────────────
  const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 58 : 72;

  if (isMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {/* Push content below Android status bar */}
        {Platform.OS === 'android' && (
          <View style={{ height: StatusBar.currentHeight ?? 0, backgroundColor: '#b91c1c' }} />
        )}

        {/* Screen content — padded so it doesn't hide behind the fixed tab bar */}
        <View style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT }}>
          {renderScreen()}
        </View>

        {/* Bottom tab bar — absolutely pinned to the bottom */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          backgroundColor: '#b91c1c',
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 8 : 20,
          borderTopWidth: 1.5,
          borderTopColor: 'rgba(241,190,72,0.45)',
        }}>
          {navItems.map((item) => {
            const isActive = activeScreen === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                onPress={() => setActiveScreen(item.label)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color={isActive ? '#F1BE48' : 'rgba(255,255,255,0.65)'}
                />
                <Text style={{
                  color: isActive ? '#F1BE48' : 'rgba(255,255,255,0.65)',
                  fontSize: 10,
                  marginTop: 2,
                  fontWeight: isActive ? '600' : '400',
                }}>
                  {item.mobileLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Desktop layout: sidebar + content ────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-1 flex-row">
        <View className="w-60 bg-red-700 p-5">
          {renderSidebarContent()}
        </View>
        <View className="flex-1">
          {renderScreen()}
        </View>
      </View>
    </View>
  );
}
