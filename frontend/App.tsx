import "nativewind/global.css";
import { Platform } from "react-native";
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginRegisterPage from './src/components/LoginRegisterPage';
import LandingPage from './src/components/LandingPage';
import AssignmentsSkeleton from './src/screens/AssignmentsSkeleton';

import TAManager from "./src/screens/TAManager";
import TeamsScreen from './src/screens/TeamsScreen';
import CoursesScreen from "./src/screens/Courses";
import SidebarLayout from "./src/components/SidebarLayout";

if (Platform.OS === "web") {
  import("./nativewind/output.css"); // Use the built file
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Only auto-login during development to avoid accidental persistence in production
    if (!__DEV__) return;

    const loadUser = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) {
          setUserEmail(email);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.warn('Failed to load stored user email', e);
      }
    };

    loadUser();
  }, []);

  const handleLogin = async (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);

    if (!__DEV__) return;
    try {
      await AsyncStorage.setItem('userEmail', email);
    } catch (e) {
      console.warn('Failed to persist user email', e);
    }
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setUserEmail('');

    if (!__DEV__) return;
    try {
      await AsyncStorage.removeItem('userEmail');
    } catch (e) {
      console.warn('Failed to remove stored user email', e);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isLoggedIn ? (
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
          >
            {(props) => <LoginRegisterPage {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={SidebarLayout} options={{ headerShown: false }} />
            <Stack.Screen name="Teams" component={TeamsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Assignments" component={AssignmentsSkeleton} options={{ headerShown: false }} />
            <Stack.Screen name="TAManager" component={TAManager} options={{ headerShown: false }} />
            <Stack.Screen name="Courses" component={CoursesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Landing" options={{ headerShown: false }}>
              {(props) => <LandingPage {...props} userEmail={userEmail} onLogout={handleLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
