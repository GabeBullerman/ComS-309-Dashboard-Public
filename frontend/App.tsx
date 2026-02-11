import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import LoginRegisterPage from './src/components/LoginRegisterPage';
import LandingPage from './src/components/LandingPage';
import TAHome from './src/screens/TAHome';
import GroupsSkeleton from './src/screens/GroupsSkeleton';
import TeamsScreen from './src/screens/TeamsScreen';
import AssignmentsSkeleton from './src/screens/AssignmentsSkeleton';

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

  const Stack = createNativeStackNavigator();

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
          // Main TA flow
          <>
            {/* <Stack.Screen
              name="TAHome"
              options={({ navigation }) => ({
                title: 'TA Dashboard',
                headerTitleAlign: 'center',
                headerStyle: { backgroundColor: '#C8102E' },
                headerTintColor: '#fff',
                headerLeft: () => (
                  <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 4 }}>User: {userEmail}</Text>
                ),
                headerRight: () => (
                  <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
                  </TouchableOpacity>
                ),
              })}
            >
              {(props) => <TeamsScreen {...props} />}
            </Stack.Screen> */}
            <Stack.Screen name="Teams" component={TeamsScreen} options={{ title: 'Teams' }} />
            <Stack.Screen name="Assignments" component={AssignmentsSkeleton} options={{ title: 'Assignments' }} />
            <Stack.Screen name="Landing" options={{ title: 'Landing' }}>
              {(props) => <LandingPage {...props} userEmail={userEmail} onLogout={handleLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
