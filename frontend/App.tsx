import "nativewind/global.css";
import { Platform, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPage from './src/screens/LoginPage';
import TAManager from "./src/screens/TAManager";
import UploadScreen from "./src/screens/UploadScreen";
import NavBar from "./src/screens/NavBar";
import TeamDetailScreen from "./src/screens/TeamDetail";
import { logout as apiLogout, getToken } from './src/utils/auth';
import axiosInstance, { setForceLogoutHandler, apiBaseUrl } from './src/api/client';
import type { UserRole } from './src/utils/auth';
import { Team, TeamMember } from "@/data/teams";
import TeamMemberDetail from "@/screens/TeamMemberDetail";
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { getCurrentUser } from './src/api/users';
import { getTodayEventCount } from './src/api/calendar';
import CalendarModal from './src/components/CalendarModal';

if (Platform.OS === "web") {
  import("./nativewind/output.css"); // Use the built file
}

// Ensure PWA on iPhone gets safe-area-inset values via CSS env()
if (Platform.OS === "web" && typeof document !== "undefined") {
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");

  const setMeta = (name: string, content: string) => {
    let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!m) { m = document.createElement('meta'); m.name = name; document.head.appendChild(m); }
    m.content = content;
  };
  setMeta('theme-color', '#C8102E');
  setMeta('apple-mobile-web-app-capable', 'yes');
  setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');

  // Fill the area outside the RN layout (home indicator, overscroll) with ISU red
  // so it doesn't show as white on iOS PWA.
  document.documentElement.style.backgroundColor = '#C8102E';
  document.body.style.backgroundColor = '#C8102E';
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
  NavBar: { userRole: UserRole; onLogout: () => void };
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
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Student');
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking');
  const [updateReady, setUpdateReady] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarBadge, setCalendarBadge] = useState(0);
  const [calendarNetid, setCalendarNetid] = useState('');

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

  // Load netid + poll today's badge whenever user is logged in
  useEffect(() => {
    if (!isLoggedIn) { setCalendarNetid(''); setCalendarBadge(0); return; }
    getCurrentUser().then(u => { if (u?.netid) setCalendarNetid(u.netid); }).catch(() => {});
    const fetchBadge = () => getTodayEventCount().then(setCalendarBadge).catch(() => {});
    fetchBadge();
    const id = setInterval(fetchBadge, 60_000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

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
            <Stack.Screen name="NavBar" component={NavBar} options={{ headerShown: false, title: 'Dashboard' }} initialParams={{ userRole, onLogout: handleLogout }} />
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

    {/* Floating calendar button — shown on every screen once logged in */}
    {isLoggedIn && (
      <TouchableOpacity
        onPress={() => setCalendarOpen(true)}
        style={{
          position: 'absolute',
          top: insets.top + 8,
          right: 12,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textInverse} />
        {calendarBadge > 0 && (
          <View style={{
            position: 'absolute',
            top: -1,
            right: -1,
            minWidth: 15,
            height: 15,
            borderRadius: 8,
            backgroundColor: colors.gold,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 3,
            borderWidth: 1.5,
            borderColor: colors.primary,
          }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: '#000' }}>
              {calendarBadge > 9 ? '9+' : calendarBadge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )}

    {isLoggedIn && calendarNetid ? (
      <CalendarModal
        visible={calendarOpen}
        onClose={() => {
          setCalendarOpen(false);
          getTodayEventCount().then(setCalendarBadge).catch(() => {});
        }}
        netid={calendarNetid}
      />
    ) : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
