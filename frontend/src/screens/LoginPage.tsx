import React, { useState, useEffect } from 'react';
import { Platform, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Modal, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import axiosInstance, { apiBaseUrl } from '@/api/client';
import { storeToken, storeRefreshToken } from '@/utils/auth';

if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();

interface LoginPageProps {
  onLogin: (email: string, role?: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loginError, setLoginError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotNetid, setForgotNetid] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '124195890479-kh157q1foah7sc96ckjbvdvrdt9esu0q.apps.googleusercontent.com',
    androidClientId: '124195890479-a2kov09e17k3bs73unu1g2u81bgd5ei8.apps.googleusercontent.com',
    iosClientId: '124195890479-ajdf86d36ik5mfv6262ujrlga2ghrail.apps.googleusercontent.com',
  });

  // Handle web OAuth redirect: backend redirects back with #googleToken=...&refreshToken=... or ?error=...
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check for error in query string (e.g., ?error=user_not_found)
    const queryError = new URLSearchParams(window.location.search).get('error');
    if (queryError) {
      window.history.replaceState(null, '', window.location.pathname);
      setLoginError(queryError === 'user_not_found'
        ? 'No account found for your ISU email. Contact your instructor.'
        : 'Google sign-in failed. Try again.');
      return;
    }

    const hash = window.location.hash;
    if (!hash.includes('googleToken=')) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('googleToken');
    const refreshToken = params.get('refreshToken');

    // Clear the fragment from URL immediately
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (!accessToken || !refreshToken) {
      setLoginError('Google sign-in failed: missing tokens.');
      return;
    }

    storeToken(accessToken);
    storeRefreshToken(refreshToken);
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const role = Array.isArray(payload.roles) ? payload.roles[0] : payload.roles ?? '';
    onLogin('', role);
  }, []);

  // Handle native Google OAuth response
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (!idToken) { setLoginError('Google sign-in failed: no ID token'); setGoogleLoading(false); return; }
      axiosInstance.post('/api/auth/login/google', { tokenId: idToken })
        .then(({ data }) => {
          storeToken(data.accessToken);
          storeRefreshToken(data.refreshToken);
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          const role = Array.isArray(payload.roles) ? payload.roles[0] : payload.roles ?? '';
          onLogin('', role);
        })
        .catch(() => { setLoginError('Google sign-in failed. Make sure your @iastate.edu account is linked.'); setGoogleLoading(false); });
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  // Iowa State email regex
  const iaStateEmailRegex = /^[a-zA-Z0-9._-]+@iastate\.edu$/;

  const validateEmail = (emailToValidate: string): boolean => {
    return iaStateEmailRegex.test(emailToValidate);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email must be @iastate.edu';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    setLoginError('');
    if (validateForm()) {
      // Call backend login using netid (part before @) and password
      const netid = email.includes('@') ? email.split('@')[0] : email;
      import('../utils/auth').then(({ login }) => {
        login(netid, password)
          .then(({ user }) => {
            // Handle role which might be a string or array
            let userRole = user?.role;
            if (Array.isArray(userRole)) {
              userRole = userRole[0];
            }
            setLoginError('');
            onLogin(email, userRole);
          })
          .catch(() => {
            setLoginError('Incorrect Username or Password, Try Again');
          });
      });
    }
  };

  const handleForgotPassword = async () => {
    const netid = forgotNetid.trim().toLowerCase();
    if (!netid) { setForgotError('Enter your NetID.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      await axiosInstance.post('/api/auth/forgot-password', { netid });
      setForgotSent(true);
    } catch (e: any) {
      const status = e?.response?.status;
      setForgotError(
        status === 404 ? 'No account found for that NetID.' :
        'Failed to send — try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        {/* Using local PNG asset so logo appears on web and native. */}
        <Image
          source={require('../Images/Iowa_State_Cyclones_logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityLabel="Iowa State logo"
        />
        <Text style={styles.title}>Iowa State</Text>
        <Text style={styles.subtitle}>Course Dashboard</Text>
      </View>

      <View style={styles.formContainer}>
        <View>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="name@iastate.edu"
            placeholderTextColor="#a0aec0"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: '' });
                if (loginError) setLoginError('');
            }}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          <Text style={styles.hint}>Must be a valid @iastate.edu email</Text>
        </View>

        <View>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Enter password"
            placeholderTextColor="#a0aec0"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: '' });
                if (loginError) setLoginError('');
            }}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          {!!loginError && <Text style={styles.loginErrorText}>{loginError}</Text>}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setShowForgot(true); setForgotNetid(''); setForgotSent(false); setForgotError(''); }} style={{ alignSelf: 'center', marginTop: 10 }}>
          <Text style={{ fontSize: 13, color: '#64748b', textDecorationLine: 'underline' }}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => {
            setLoginError('');
            if (Platform.OS === 'web') {
              window.location.href = `${apiBaseUrl}/oauth2/authorization/google`;
            } else {
              setGoogleLoading(true);
              promptAsync();
            }
          }}
          disabled={Platform.OS !== 'web' && (!request || googleLoading)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: 'https://www.google.com/favicon.ico' }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>
            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={() => setShowForgot(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 360, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 6 }}>Reset Password</Text>
            {forgotSent ? (
              <View>
                <Text style={{ fontSize: 14, color: '#16a34a', lineHeight: 20, marginBottom: 16 }}>
                  A temporary password has been sent to <Text style={{ fontWeight: '700' }}>{forgotNetid.trim().toLowerCase()}@iastate.edu</Text>. Use it to log in, then change your password in Profile.
                </Text>
                <TouchableOpacity onPress={() => setShowForgot(false)} style={{ backgroundColor: '#C8102E', borderRadius: 8, paddingVertical: 11, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 14, lineHeight: 18 }}>
                  Enter your NetID and we'll email a temporary password to your @iastate.edu address.
                </Text>
                <TextInput
                  value={forgotNetid}
                  onChangeText={t => { setForgotNetid(t); setForgotError(''); }}
                  placeholder="e.g. jdoe"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ borderWidth: 1, borderColor: forgotError ? '#ef4444' : '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc', marginBottom: 6 }}
                />
                {!!forgotError && <Text style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{forgotError}</Text>}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => setShowForgot(false)} style={{ flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingVertical: 11, alignItems: 'center' }}>
                    <Text style={{ color: '#64748b', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={forgotLoading || !forgotNetid.trim()}
                    style={{ flex: 1, backgroundColor: '#C8102E', borderRadius: 8, paddingVertical: 11, alignItems: 'center', opacity: forgotLoading || !forgotNetid.trim() ? 0.6 : 1 }}
                  >
                    {forgotLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Send</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 26,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  loginErrorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#C8102E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
});

export default LoginPage;
