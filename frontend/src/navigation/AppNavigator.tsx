import { createDrawerNavigator } from "@react-navigation/drawer";
// import DashboardScreen from "../screens/DashboardScreen";
import TeamsScreen from "../screens/TeamsScreen";
// import CoursesScreen from '../screens/CourseScreen';

const Drawer = createDrawerNavigator();

export default function AppNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: { backgroundColor: "#b00020", width: 260 },
        drawerActiveTintColor: "#000",
        drawerActiveBackgroundColor: "#f5c242",
        drawerInactiveTintColor: "#fff",
      }}
    >
      {/* <Drawer.Screen name="Dashboard" component={DashboardScreen} /> */}
      <Drawer.Screen name="Teams" component={TeamsScreen} />
      {/* <Drawer.Screen name="Courses" component={CoursesScreen} /> */}
    </Drawer.Navigator>
  );
}