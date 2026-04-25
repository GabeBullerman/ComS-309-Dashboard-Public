import { View, Text, TouchableOpacity, Image, Dimensions, StatusBar, Platform } from "react-native";
import { useTheme } from '../contexts/ThemeContext';
import TeamsScreen from "../screens/TeamsScreen";
import StaffManagerScreen from "../screens/TAManager";
import TaskAssignmentScreen from "../screens/TaskAssignmentScreen";
import AssignmentsScreen from "../screens/AssignmentsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "../api/users";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Ionicons } from "@expo/vector-icons";
import ProfileAvatar from "../components/ProfileAvatar";
import UploadScreen from "./UploadScreen";
import AtRiskStudentsScreen from "./AtRiskStudentsScreen";
import StudentListScreen from "./StudentListScreen";
import StaffChatScreen from "./StaffChatScreen";
import { getUnreadCount } from "../api/chat";
import { sendHeartbeat } from "../api/activity";
import CalendarModal from "../components/CalendarModal";

type Props = NativeStackScreenProps<RootStackParamList, 'DashboardScreen'>;

const ACTIVE_SCREEN_KEY = 'dashboard_active_screen';

export default function DashboardScreen({route}: Props) {
  const { colors } = useTheme();
  const [activeScreen, setActiveScreen] = useState("Teams");
  const [displayName, setDisplayName] = useState("User");
  const [netid, setNetid] = useState("");
  const [chatUnread, setChatUnread] = useState(0);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calBtnPos, setCalBtnPos] = useState<{ top: number; left: number } | null>(null);
  const calDrag = useRef<{ sx: number; sy: number; st: number; sl: number; moved: boolean } | null>(null);
  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;
  const role = route.params.userRole;

  // Heartbeat — keeps this user's activity status current
  useEffect(() => {
    sendHeartbeat().catch(() => {});
    const id = setInterval(() => sendHeartbeat().catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, []);

  // Poll unread chat count for staff (web only)
  useEffect(() => {
    if (role === 'Student' || Platform.OS !== 'web') return;
    const fetch = () => getUnreadCount().then(setChatUnread).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, [role]);


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

  // Draggable calendar button (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    setCalBtnPos({ top: 14, left: window.innerWidth - 58 });
  }, []);

  const handleCalBtnMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    const pos = calBtnPos ?? { top: 14, left: window.innerWidth - 58 };
    calDrag.current = { sx: e.clientX, sy: e.clientY, st: pos.top, sl: pos.left, moved: false };
    const onMove = (me: MouseEvent) => {
      if (!calDrag.current) return;
      const dx = me.clientX - calDrag.current.sx;
      const dy = me.clientY - calDrag.current.sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) calDrag.current.moved = true;
      setCalBtnPos({
        top: Math.max(8, calDrag.current.st + dy),
        left: Math.max(8, Math.min(window.innerWidth - 52, calDrag.current.sl + dx)),
      });
    };
    const onUp = () => {
      if (calDrag.current && !calDrag.current.moved) setCalendarVisible(true);
      calDrag.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  const navItems = [
    { label: "Teams",        mobileLabel: "Teams",    icon: "people-outline" },
    ...(role !== 'Instructor'
      ? [{ label: "Tasks",        mobileLabel: "Tasks",  icon: "checkmark-circle-outline" }] : []),
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "Staff Chat", mobileLabel: "Chat", icon: "chatbubbles-outline", badge: chatUnread, mobileHidden: true }] : []),
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "Assign Tasks", mobileLabel: "Assign", icon: "clipboard-outline" }] : []),
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "At-Risk Students", mobileLabel: "At-Risk", icon: "alert-circle-outline" }] : []),
    ...(role === 'TA' || role === 'HTA' || role === 'Instructor'
      ? [{ label: "Student List", mobileLabel: "Students", icon: "list-outline" }] : []),
    ...(role === 'HTA' || role === 'Instructor'
      ? [{ label: "Staff Manager", mobileLabel: "Staff", icon: "shield-outline" }] : []),
    ...(role === 'Instructor' || role === 'HTA'
      ? [{ label: "Upload", mobileLabel: "Upload", icon: "cloud-upload-outline" }] : []),
    { label: "Profile",      mobileLabel: "Profile",  icon: "person-circle-outline" },
  ] as { label: string; mobileLabel: string; icon: string; badge?: number; mobileHidden?: boolean }[];

  // Restore last active screen on mount; persist on every change
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const saved = localStorage.getItem(ACTIVE_SCREEN_KEY);
      if (saved && navItems.some((i) => i.label === saved)) setActiveScreen(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try { localStorage.setItem(ACTIVE_SCREEN_KEY, activeScreen); } catch { /* ignore */ }
  }, [activeScreen]);

  const renderScreen = () => {
    switch (activeScreen) {
      case "Teams":        return <TeamsScreen userRole={route.params.userRole} />;
      case "Student List": return <StudentListScreen userRole={route.params.userRole} />;
      case "Assign Tasks": return <TaskAssignmentScreen />;
      case "Staff Manager": return <StaffManagerScreen userRole={role} />;
      case "Staff Chat":  return <StaffChatScreen myNetid={netid} myName={displayName} userRole={role} onUnreadChange={setChatUnread} />;
      case "Upload":       return <UploadScreen userRole={role} />;
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
            {!!item.badge && item.badge > 0 && (
              <View style={{ marginLeft: 'auto', backgroundColor: colors.criticalBorder, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: '700' }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </Text>
              </View>
            )}
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isMobile ? (
        <>
          {Platform.OS === 'android' && (
            <View style={{ height: StatusBar.currentHeight ?? 0, backgroundColor: colors.navBg }} />
          )}

          {/* Screen content — padded so it doesn't hide behind the fixed tab bar */}
          <View style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT }}>
            {renderScreen()}
          </View>

          {/* Bottom tab bar */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            backgroundColor: colors.navBg,
            paddingTop: 6,
            paddingBottom: Platform.OS === 'android' ? 8 : 20,
            borderTopWidth: 1.5,
            borderTopColor: 'rgba(241,190,72,0.45)',
          }}>
            {navItems.filter(i => !i.mobileHidden).map((item) => {
              const isActive = activeScreen === item.label;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                  onPress={() => setActiveScreen(item.label)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={isActive ? colors.navActive : 'rgba(255,255,255,0.65)'}
                    />
                  </View>
                  <Text style={{
                    color: isActive ? colors.navActive : 'rgba(255,255,255,0.65)',
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
        </>
      ) : (
        // ── Desktop layout: sidebar + content ──────────────────────────────
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 240, backgroundColor: colors.navBg, padding: 20, borderRightWidth: 3, borderRightColor: colors.gold }}>
            {renderSidebarContent()}
          </View>
          <View style={{ flex: 1 }}>
            {renderScreen()}
          </View>
        </View>
      )}

      {/* Draggable calendar button — click to open, drag to move */}
      <TouchableOpacity
        onPress={Platform.OS !== 'web' ? () => setCalendarVisible(true) : undefined}
        // @ts-expect-error web-only mouse events
        onMouseDown={Platform.OS === 'web' ? handleCalBtnMouseDown : undefined}
        style={[{
          position: 'absolute',
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
          zIndex: 100,
        },
        calBtnPos ? { top: calBtnPos.top, left: calBtnPos.left } : { top: 14, right: 14 },
        Platform.OS === 'web' ? { cursor: 'grab' } as any : {},
        ]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.textInverse} />
        {Platform.OS === 'web' && (
          <View style={{ position: 'absolute', top: 3, left: 3 }}>
            <Ionicons name="move-outline" size={11} color="rgba(255,255,255,0.6)" />
          </View>
        )}
      </TouchableOpacity>

      <CalendarModal visible={calendarVisible} onClose={() => setCalendarVisible(false)} netid={netid} />
    </View>
  );
}
