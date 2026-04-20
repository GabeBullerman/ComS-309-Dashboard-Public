import "nativewind/global.css";
import { Platform, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import React, { useState, useEffect, useCallback } from 'react';
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
import { setForceLogoutHandler, apiBaseUrl } from './src/api/client';
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

type ConnStatus = 'checking' | 'online' | 'offline';

function NoConnectionScreen({ onRetry, checking }: { onRetry: () => void; checking: boolean }) {
  return (
    <View style={conn.container}>
      <View style={conn.card}>
        <View style={conn.iconWrap}>
          <Ionicons name="wifi-outline" size={48} color="#94a3b8" />
        </View>
        <Text style={conn.title}>Cannot Reach Server</Text>
        <Text style={conn.body}>
          The dashboard server is only accessible on the{' '}
          <Text style={conn.bold}>ISU campus network</Text> or via the{' '}
          <Text style={conn.bold}>Iowa State VPN</Text>.
        </Text>
        <Text style={conn.sub}>
          Connect to the VPN, then tap Retry.
        </Text>
        <TouchableOpacity style={conn.button} onPress={onRetry} disabled={checking}>
          {checking
            ? <ActivityIndicator color="white" />
            : <Text style={conn.buttonText}>Retry</Text>}
        </TouchableOpacity>
        <Text style={conn.hint}>VPN: vpn.iastate.edu</Text>
      </View>
    </View>
  );
}

const conn = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  bold: { fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 28 },
  button: { backgroundColor: '#C8102E', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 40, marginBottom: 16, minWidth: 140, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 12, color: '#cbd5e1' },
});

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Student');
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking');

  const checkConnection = useCallback(async () => {
    setConnStatus('checking');
    try {
      await fetch(`${apiBaseUrl}/api/auth/login`, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      setConnStatus('online');
    } catch {
      setConnStatus('offline');
    }
  }, []);

  useEffect(() => { checkConnection(); }, []);

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

  if (!fontsLoaded || connStatus === 'checking') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f7fa', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#C8102E" />
      </View>
    );
  }

  if (connStatus === 'offline') {
    return <NoConnectionScreen onRetry={checkConnection} checking={connStatus === 'checking'} />;
  }

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
