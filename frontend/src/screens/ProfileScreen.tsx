import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../api/users';
import { getGitLabToken, saveGitLabToken } from '../utils/gitlab';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  userRole: string;
}

export default function ProfileScreen({ userRole }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [netid, setNetid] = useState('');
  const [glToken, setGlToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.name) setDisplayName(user.name);
      if (user?.netid) setNetid(user.netid);
    }).catch(() => {});

    getGitLabToken().then((t) => setGlToken(t)).catch(() => {});
  }, []);

  const masked = glToken
    ? glToken.slice(0, 8) + '••••••••••••••••' + glToken.slice(-4)
    : null;

  const handleSave = async () => {
    if (!tokenInput.trim()) return;
    setSaving(true);
    try {
      await saveGitLabToken(tokenInput.trim());
      setGlToken(tokenInput.trim());
      setTokenInput('');
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save token.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear GitLab Token',
      'Remove your saved GitLab token?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('gitlab_token');
            setGlToken(null);
            setEditing(false);
          },
        },
      ]
    );
  };

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 24 }}>
      {/* Profile card */}
      <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1BE48', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#374151' }}>{initials}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{displayName || '—'}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>{netid || '—'}</Text>
            <View style={{ marginTop: 4, backgroundColor: '#FEF9C3', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>{userRole}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* GitLab token card */}
      <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="logo-gitlab" size={18} color="#C8102E" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 8 }}>GitLab Token</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
          Used to load contribution stats across all team repos. Generate one at{' '}
          <Text style={{ color: '#C8102E' }}>git.las.iastate.edu → Settings → Access Tokens</Text>
          {' '}(scope: read_api).
        </Text>

        {!editing && glToken ? (
          // Token is set — show masked value + actions
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#374151' }}>{masked}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { setTokenInput(''); setEditing(true); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#C8102E', borderRadius: 8, paddingVertical: 10 }}
              >
                <Ionicons name="pencil-outline" size={14} color="#C8102E" />
                <Text style={{ color: '#C8102E', fontWeight: '600', fontSize: 14 }}>Update Token</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClear}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
              >
                <Ionicons name="trash-outline" size={14} color="#6B7280" />
                <Text style={{ color: '#6B7280', fontWeight: '600', fontSize: 14 }}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : editing && glToken ? (
          // Editing an existing token
          <View>
            <TextInput
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="glpat-xxxxxxxxxxxx"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#F9FAFB', marginBottom: 10 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { setEditing(false); setTokenInput(''); }}
                style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !tokenInput.trim()}
                style={{ flex: 1, backgroundColor: '#C8102E', borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: saving || !tokenInput.trim() ? 0.6 : 1 }}
              >
                {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // No token set
          <View>
            <TextInput
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="glpat-xxxxxxxxxxxx"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: '#F9FAFB', marginBottom: 10 }}
            />
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !tokenInput.trim()}
              style={{ backgroundColor: '#C8102E', borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: saving || !tokenInput.trim() ? 0.6 : 1 }}
            >
              {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '600' }}>Save Token</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
