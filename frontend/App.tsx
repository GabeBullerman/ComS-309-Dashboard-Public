import "nativewind/global.css";
import { Platform, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
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
import axiosInstance, { setForceLogoutHandler, apiBaseUrl } from './src/api/client';
import type { UserRole } from './src/utils/auth';
import { Team, TeamMember } from "@/data/teams";
import TeamMemberDetail from "@/screens/TeamMemberDetail";
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

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
  Login: { onLogin: (email: string, role?: string) => void };
  DashboardScreen: { userRole: UserRole; onLogout: () => void };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type ConnStatus = 'checking' | 'online' | 'offline';

function NoConnectionScreen({ onRetry, checking }: { onRetry: () => void; checking: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="wifi-outline" size={48} color={colors.textFaint} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12, textAlign: 'center' }}>Cannot Reach Server</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
          The dashboard server is only accessible on the{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>ISU campus network</Text> or via the{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>Iowa State VPN</Text>.
        </Text>
        <Text style={{ fontSize: 13, color: colors.textFaint, textAlign: 'center', marginBottom: 28 }}>
          Connect to the VPN, then tap Retry.
        </Text>
        <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 40, marginBottom: 16, minWidth: 140, alignItems: 'center' }} onPress={onRetry} disabled={checking}>
          {checking
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 15 }}>Retry</Text>}
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: colors.borderMedium }}>VPN: vpn.iastate.edu</Text>
      </View>
    </View>
  );
}

function AppInner() {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Student');
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking');
  const [updateReady, setUpdateReady] = useState(false);

  // Listen for Electron's "update downloaded" signal via the preload bridge
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onUpdateReady) api.onUpdateReady(() => setUpdateReady(true));
  }, []);

  const checkConnection = useCallback(async () => {
    setConnStatus('checking');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        await axiosInstance.get('/api/auth/login', { timeout: 6000 });
        setConnStatus('online');
        return;
      } catch (e: any) {
        // Any HTTP response (401, 400, etc.) means the server is reachable
        if (e?.response) { setConnStatus('online'); return; }
        // Otherwise it's a network error — retry
      }
    }
    setConnStatus('offline');
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
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (connStatus === 'offline') {
    return <NoConnectionScreen onRetry={checkConnection} checking={false} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {updateReady && (
        <TouchableOpacity
          onPress={() => (window as any).electronAPI?.installUpdate()}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
            backgroundColor: colors.updateBanner,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: 10, paddingHorizontal: 16, gap: 10,
          }}
        >
          <Ionicons name="arrow-up-circle-outline" size={18} color={colors.textInverse} />
          <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 13 }}>
            Update ready — click to restart and install
          </Text>
        </TouchableOpacity>
      )}
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
            <Stack.Screen name="TAManager" options={{ headerShown: false }}>
              {(props) => <TAManager {...props} userRole={userRole} />}
            </Stack.Screen>
            <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TeamMemberDetail" component={TeamMemberDetail} options={{ headerShown: false }} />
            <Stack.Screen name="Upload" component={UploadScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
