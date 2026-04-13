import React, { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, Alert, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function avatarKey(memberId: string) {
  return `member_avatar_${memberId}`;
}

// ─── Module-level cache & pub/sub ─────────────────────────────────────────────
// memCache survives navigation (component unmount/remount); cleared on full app restart.
const memCache: Record<string, string> = {};

type Listener = (uri: string) => void;
const listeners: Record<string, Set<Listener>> = {};

function subscribe(memberId: string, cb: Listener): () => void {
  if (!listeners[memberId]) listeners[memberId] = new Set();
  listeners[memberId].add(cb);
  return () => listeners[memberId].delete(cb);
}

function broadcast(memberId: string, uri: string) {
  listeners[memberId]?.forEach((cb) => cb(uri));
}

// On web, blob: URIs die on page refresh — convert to base64 data URI so the
// stored value survives across reloads.
async function toStorableUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('blob:')) return uri;
  const blob = await fetch(uri).then((r) => r.blob());
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  memberId: string;
  initials: string;
  size: number;
  borderRadius?: number;
  canEdit?: boolean;
  bordered?: boolean;
  style?: ViewStyle;
}

export default function MemberAvatar({ memberId, initials, size, borderRadius, canEdit = false, bordered = false, style }: Props) {
  const [uri, setUri] = useState<string | null>(memCache[memberId] ?? null);
  const radius = borderRadius ?? size / 2;

  useEffect(() => {
    // Subscribe so that any other instance uploading for this memberId updates us too
    const unsub = subscribe(memberId, (newUri) => setUri(newUri));

    if (memCache[memberId]) {
      setUri(memCache[memberId]);
    } else {
      AsyncStorage.getItem(avatarKey(memberId)).then((stored) => {
        if (stored) {
          memCache[memberId] = stored;
          setUri(stored);
        }
      });
    }

    return unsub;
  }, [memberId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images' as const],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const storableUri = await toStorableUri(result.assets[0].uri);
      memCache[memberId] = storableUri;
      await AsyncStorage.setItem(avatarKey(memberId), storableUri);
      // Update this instance and notify all other mounted instances for the same member
      setUri(storableUri);
      broadcast(memberId, storableUri);
    }
  };

  const badgeSize = Math.round(size * 0.28);

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, ...(bordered ? { borderWidth: 2, borderColor: '#111827' } : {}) }, style]}>
      <View style={{ width: '100%', height: '100%', borderRadius: bordered ? radius - 2 : radius, overflow: 'hidden', backgroundColor: '#F1BE48', alignItems: 'center', justifyContent: 'center' }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.35, fontWeight: '600', color: '#1f2937' }}>
            {initials}
          </Text>
        )}
      </View>
      {canEdit && (
        <TouchableOpacity
          onPress={pickImage}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            bottom: 3,
            right: 3,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: '#111827',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: 'white',
          }}
        >
          <Ionicons name="camera" size={Math.round(size * 0.13)} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
