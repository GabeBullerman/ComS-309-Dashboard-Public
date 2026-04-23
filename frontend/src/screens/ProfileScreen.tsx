import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { getCurrentUser, changePassword } from '../api/users';
import { getGitLabToken, saveGitLabToken, clearGitLabToken } from '../utils/gitlab';
import ProfileAvatar from '../components/ProfileAvatar';

interface Props {
  userRole: string;
  onLogout?: () => void;
}

export default function ProfileScreen({ userRole, onLogout }: Props) {
  const { colors } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [netid, setNetid] = useState('');
  const [glToken, setGlToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Change password state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

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
            await clearGitLabToken();
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
      {/* Profile card */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ProfileAvatar
            userId={netid || displayName}
            initials={initials}
            size={72}
            canEdit
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{displayName || '—'}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{netid || '—'}</Text>
            <View style={{ marginTop: 4, backgroundColor: colors.warningBg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warningText }}>{userRole}</Text>
            </View>
          </View>
          {/* Dark/light mode toggle */}
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 10, color: colors.textFaint, fontWeight: '500' }}>Theme</Text>
            <ThemeToggle size={28} />
          </View>
        </View>
      </View>

      {/* GitLab token card */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="logo-gitlab" size={18} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 8 }}>GitLab Token</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
          Used to load contribution stats across all team repos. Generate one at{' '}
          <Text style={{ color: colors.primary }}>git.las.iastate.edu → Settings → Access Tokens</Text>
          {' '}(scope: read_api).
        </Text>

        {!editing && glToken ? (
          // Token is set — show masked value + actions
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.statusGoodText} style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: colors.textSecondary }}>{masked}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { setTokenInput(''); setEditing(true); }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10 }}
              >
                <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Update Token</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClear}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 }}
              >
                <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14 }}>Clear</Text>
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
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: colors.inputBg, marginBottom: 10, color: colors.text }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { setEditing(false); setTokenInput(''); }}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !tokenInput.trim()}
                style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: saving || !tokenInput.trim() ? 0.6 : 1 }}
              >
                {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={{ color: colors.textInverse, fontWeight: '600' }}>Save</Text>}
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
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: colors.inputBg, marginBottom: 10, color: colors.text }}
            />
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !tokenInput.trim()}
              style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: saving || !tokenInput.trim() ? 0.6 : 1 }}
            >
              {saving ? <ActivityIndicator size="small" color={colors.textInverse} /> : <Text style={{ color: colors.textInverse, fontWeight: '600' }}>Save Token</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Change Password card */}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, marginTop: 16, shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 8 }}>Change Password</Text>
        </View>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
          Use this to set a new password. Enter your current (or temporary) password to confirm.
        </Text>

        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Current Password</Text>
        <TextInput
          value={pwCurrent}
          onChangeText={t => { setPwCurrent(t); setPwError(''); setPwSuccess(false); }}
          placeholder="Your current or temporary password"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: colors.inputBg, marginBottom: 10, color: colors.text }}
        />

        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>New Password</Text>
        <TextInput
          value={pwNew}
          onChangeText={t => { setPwNew(t); setPwError(''); setPwSuccess(false); }}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: colors.inputBg, marginBottom: 10, color: colors.text }}
        />

        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Confirm New Password</Text>
        <TextInput
          value={pwConfirm}
          onChangeText={t => { setPwConfirm(t); setPwError(''); setPwSuccess(false); }}
          placeholder="Repeat new password"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, backgroundColor: colors.inputBg, marginBottom: 12, color: colors.text }}
        />

        {!!pwError && (
          <Text style={{ fontSize: 12, color: colors.criticalBorder, marginBottom: 8 }}>{pwError}</Text>
        )}
        {pwSuccess && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={14} color={colors.statusGoodText} />
            <Text style={{ fontSize: 12, color: colors.statusGoodText, fontWeight: '600' }}>Password changed successfully.</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={async () => {
            setPwError('');
            setPwSuccess(false);
            if (!pwCurrent.trim()) { setPwError('Enter your current password.'); return; }
            if (pwNew.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
            if (pwNew !== pwConfirm) { setPwError('New passwords do not match.'); return; }
            setPwSaving(true);
            try {
              await changePassword(pwCurrent, pwNew);
              setPwCurrent(''); setPwNew(''); setPwConfirm('');
              setPwSuccess(true);
            } catch (e: any) {
              const status = e?.response?.status;
              setPwError(status === 401 ? 'Current password is incorrect.' : 'Failed to change password.');
            } finally {
              setPwSaving(false);
            }
          }}
          disabled={pwSaving || !pwCurrent.trim() || !pwNew.trim() || !pwConfirm.trim()}
          style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', opacity: (pwSaving || !pwCurrent.trim() || !pwNew.trim() || !pwConfirm.trim()) ? 0.6 : 1 }}
        >
          {pwSaving
            ? <ActivityIndicator size="small" color={colors.textInverse} />
            : <Text style={{ color: colors.textInverse, fontWeight: '600' }}>Update Password</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Logout — mobile only, below GitLab token */}
      {Platform.OS !== 'web' && onLogout && (
        <TouchableOpacity
          onPress={onLogout}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, marginTop: 16 }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.textInverse} />
          <Text style={{ color: colors.textInverse, fontWeight: '700', fontSize: 15 }}>Logout</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
