import { View, Text, TouchableOpacity, Image, Animated, Dimensions } from "react-native";
import CoursesScreen from "../screens/Courses";
import UploadScreen from "../screens/UploadScreen";
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

type Props = NativeStackScreenProps<RootStackParamList, 'SidebarLayout'>;

export default function SidebarLayout({route}: Props) {
  const [activeScreen, setActiveScreen] = useState("Teams");
  const [displayName, setDisplayName] = useState("User");
  // Get permissions based on role
  const permissions = getUserPermissions(route.params.userRole);
  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(-240))[0]; // sidebar width

  const role = route.params.userRole;

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (user?.name && user.name.trim().length > 0) {
          setDisplayName(user.name);
          return;
        }
        if (user?.netid && user.netid.trim().length > 0) {
          setDisplayName(user.netid);
        }
      })
      .catch(() => {
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Generate initials for user
  const initials = displayName
  .split(" ")
  .map((n: string) => n[0])
  .join("")
  .toUpperCase();

  // for use on mobile to slide the navbar in and out
  const toggleDrawer = () => {
  Animated.timing(slideAnim, {
    toValue: drawerOpen ? -240 : 0,
    duration: 250,
    useNativeDriver: true,
  }).start();
    setDrawerOpen(!drawerOpen);
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case "Teams":
        return <TeamsScreen userRole={route.params.userRole} />;
      case "Courses":
        return <CoursesScreen />;
      case "Upload Teams":
        return <UploadScreen />;
      case "Assign Tasks":
        return <TaskAssignmentScreen />;
      case "TA Manager":
        return <TAManager />;
      case "Tasks":
        return <AssignmentsScreen />;
      case "Profile":
        return <ProfileScreen userRole={role} />;
      default:
        return <TeamsScreen userRole={route.params.userRole} />;
    }
  };

  const renderSidebarContent = () => (
    <>
      <View className="p-4 border-b border-white/10">
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

      {/* Role-based menu items */}
      {[
        "Teams",
        ...(role === 'TA' || role === 'HTA' || role === 'Instructor' ? ["Assign Tasks"] : []),
        ...(role === 'HTA' || role === 'Instructor' ? ["Upload Teams"] : []),
        ...(permissions.canManageTAs ? ["TA Manager"] : []),
        ...(role !== 'Instructor' ? ["Tasks"] : []),
        ...(permissions.canAccessCourses ? ["Courses"] : []),
      ].map((item) => (
        <TouchableOpacity
          key={item}
          onPress={() => {
            setActiveScreen(item);
            if (isMobile) toggleDrawer();
          }}
          className={`rounded-lg px-4 py-3 mb-2 ${
            activeScreen === item ? "bg-yellow-400" : ""
          }`}
        >
          <Text
            className={`font-medium ${
              activeScreen === item
                ? "text-yellow-900"
                : "text-white"
            }`}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}

      {/* User Section */}
      <View className="mt-auto pt-6 border-t border-white/10">
        <TouchableOpacity
          className="flex-row items-center gap-3"
          onPress={() => {
            setActiveScreen('Profile');
            if (isMobile) toggleDrawer();
          }}
        >
          <View className="w-10 h-10 rounded-full bg-[#F1BE48] items-center justify-center">
            <Text className="text-gray-800 font-semibold">
              {initials}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text className="font-semibold text-sm text-white">
              {displayName}
            </Text>
            <Text className="text-xs text-white/70">
              {role} · Profile
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={route.params.onLogout}
          className="mt-4 px-4 py-2 bg-red-600 rounded-lg"
        >
          <Text className="text-white text-sm font-medium text-center">
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
  <View className="flex-1 bg-gray-100">

    {/* Mobile Header */}
    {isMobile && (
      <View className="flex-row items-center p-4 bg-red-700">
        <TouchableOpacity onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold ml-4">
          Class Dashboard
        </Text>
      </View>
    )}

    <View className="flex-1 flex-row">

      {/* Sidebar */}
      {isMobile ? (
        <Animated.View
          style={{
            transform: [{ translateX: slideAnim }],
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 240,
            zIndex: 50,
          }}
          className="bg-red-700 p-5"
        >
          {renderSidebarContent()}
        </Animated.View>
      ) : (
        <View className="w-60 bg-red-700 p-5">
          {renderSidebarContent()}
        </View>
      )}

      {/* Overlay when open */}
      {isMobile && drawerOpen && (
        <TouchableOpacity
          className="absolute inset-0 bg-black/40"
          onPress={toggleDrawer}
        />
      )}

      {/* Main Content */}
      <View className="flex-1">
        {renderScreen()}
      </View>

    </View>
  </View>
);
}