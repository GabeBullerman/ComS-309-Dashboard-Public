import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginRegisterPage from './src/components/LoginRegisterPage';
import LandingPage from './src/components/LandingPage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
  };

  return (
    <>
      {isLoggedIn ? (
        <LandingPage userEmail={userEmail} onLogout={handleLogout} />
      ) : (
        <LoginRegisterPage onLogin={handleLogin} />
      )}
      <StatusBar barStyle="light-content" />
    </>
  );
}
