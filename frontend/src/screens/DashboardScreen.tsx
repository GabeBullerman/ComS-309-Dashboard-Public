import { View, Text, TouchableOpacity, Image, Animated, Dimensions } from "react-native";
import CoursesScreen from "../screens/Courses";
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

type Props = NativeStackScreenProps<RootStackParamList, 'DashboardScreen'>;

export default function DashboardScreen({route}: Props) {
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

      {([
        { label: "Teams",        icon: "people-outline" },
        ...(role === 'TA' || role === 'HTA' || role === 'Instructor' ? [{ label: "Assign Tasks", icon: "clipboard-outline" }] : []),
        ...(permissions.canManageTAs ? [{ label: "TA Manager", icon: "shield-outline" }] : []),
        ...(role !== 'Instructor' ? [{ label: "Tasks", icon: "checkmark-circle-outline" }] : []),
        ...(permissions.canAccessCourses ? [{ label: "Courses", icon: "book-outline" }] : []),
      ] as { label: string; icon: string }[]).map((item) => {
        const isActive = activeScreen === item.label;
        return (
          <TouchableOpacity
            key={item.label}
            onPress={() => {
              setActiveScreen(item.label);
              if (isMobile) toggleDrawer();
            }}
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