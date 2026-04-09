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
import { logout as apiLogout, storeToken, getRoleFromToken, getToken } from './src/utils/auth';
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
  TeamMemberDetail: { member: TeamMember; gitlabUrl?: string; teamId?: number };
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

  // Handle redirect back from backend Google OAuth (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#googleToken=')) return;

    const token = hash.slice('#googleToken='.length);
    // Clear the token from the URL immediately
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    storeToken(token).then(() => {
      const role = getRoleFromToken(token);
      handleLogin('', role);
    }).catch(() => {
      console.warn('Failed to store Google OAuth token');
    });
  }, []);

  useEffect(() => {
    // Only auto-login during development to avoid accidental persistence in production
    if (!__DEV__) return;

    const loadUser = async () => {
      try {
        const token = await getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp && (Date.now() / 1000) > payload.exp;
          if (isExpired) {
            await AsyncStorage.multiRemove(['userEmail', 'user_role']);
            return;
          }
        }

        const role = await AsyncStorage.getItem('user_role');
        if (token) {
          setIsLoggedIn(true);
          if (role) setUserRole(role as UserRole);
        }
      } catch (e) {
        console.warn('Failed to load stored user email', e);
      }
    };

    loadUser();
  }, []);

  const handleLogin = async (_email: string, role?: UserRole) => {
    if (role) setUserRole(role);
    setIsLoggedIn(true);

    if (!__DEV__) return;
    try {
      if (role) await AsyncStorage.setItem('user_role', String(role));
    } catch (e) {
      console.warn('Failed to persist user role', e);
    }
  };

  const handleLogout = async () => {
    // Call backend logout and clear stored credentials
    try {
      await apiLogout();
    } catch {
      // ignore errors
    }

    setIsLoggedIn(false);
    setUserRole('Student');

    if (!__DEV__) return;
    try {
      await AsyncStorage.removeItem('user_role');
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
