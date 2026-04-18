import "nativewind/global.css";
import { Platform } from "react-native";
import React, { useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPage from './src/screens/LoginPage';
import TAManager from "./src/screens/TAManager";
import UploadScreen from "./src/screens/UploadScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import TeamDetailScreen from "./src/screens/TeamDetail";
import { logout as apiLogout, getToken } from './src/utils/auth';
import { setForceLogoutHandler } from './src/api/client';
import type { UserRole } from './src/utils/auth';
import { Team, TeamMember } from "@/data/teams";
import TeamMemberDetail from "@/screens/TeamMemberDetail";

if (Platform.OS === "web") {
  import("./nativewind/output.css"); // Use the built file
}

// This is how you pass screen props to the screen since navigation doesn't support it directly
export type RootStackParamList = {
  Home: undefined;
  TeamDetail: { team: Team; userRole: UserRole };
  TeamMemberDetail: { member: TeamMember; gitlabUrl?: string; teamId?: number; teamName?: string };
  Teams: {userRole: UserRole};
  TAManager: undefined;
  Courses: undefined;
  Upload: undefined;
  Landing: { userEmail: string; onLogout: () => void };
  Login: { onLogin: (email: string, role?: string) => void };
  DashboardScreen: { userRole: UserRole; onLogout: () => void };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Student');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const role = await AsyncStorage.getItem('user_role');
        setIsLoggedIn(true);
        if (role) setUserRole(role as UserRole);
      } catch (e) {
        console.warn('Failed to load stored session', e);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    setForceLogoutHandler(() => {
      setIsLoggedIn(false);
      setUserRole('Student');
      AsyncStorage.multiRemove(['user_role']).catch(() => {});
      if (typeof localStorage !== 'undefined') localStorage.removeItem('dashboard_active_screen');
    });
  }, []);

  const handleLogin = async (_email: string, role?: UserRole) => {
    if (role) setUserRole(role);
    setIsLoggedIn(true);
    try {
      if (role) await AsyncStorage.setItem('user_role', String(role));
    } catch (e) {
      console.warn('Failed to persist user role', e);
    }
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore errors
    }

    setIsLoggedIn(false);
    setUserRole('Student');
    try {
      await AsyncStorage.removeItem('user_role');
      if (typeof localStorage !== 'undefined') localStorage.removeItem('dashboard_active_screen');
    } catch (e) {
      console.warn('Failed to remove stored user data', e);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
          >
            {(props) => <LoginPage {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="DashboardScreen" component={DashboardScreen} options={{ headerShown: false, title: 'Dashboard' }} initialParams={{ userRole, onLogout: handleLogout }} />
            <Stack.Screen name="TAManager" component={TAManager} options={{ headerShown: false }} />
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TeamMemberDetail" component={TeamMemberDetail} options={{ headerShown: false }} />
            <Stack.Screen name="Upload" component={UploadScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Landing" options={{ headerShown: false }}>
              {(props) => <LandingPage {...props} userEmail={userEmail} onLogout={handleLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
