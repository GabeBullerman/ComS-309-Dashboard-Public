import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';

interface LoginRegisterPageProps {
  onLogin: (email: string, role?: string) => void;
}

const LoginRegisterPage: React.FC<LoginRegisterPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loginError, setLoginError] = useState('');

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
          .then(({ token, user }) => {
            // Handle role which might be a string or array
            let userRole = user?.role;
            if (Array.isArray(userRole)) {
              userRole = userRole[0];
            }
            setLoginError('');
            onLogin(email, userRole);
          })
          .catch((err) => {
            setLoginError('Incorrect Username or Password, Try Again');
          });
      });
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
      </View>

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
    paddingTop: 56,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    width: '100%',
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
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
});

export default LoginRegisterPage;
