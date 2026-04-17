import React, { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, Alert, ViewStyle, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function storageKey(userId: string) {
  return `profile_avatar_${userId}`;
}

// ─── Module-level cache & pub/sub ─────────────────────────────────────────────
const memCache: Record<string, string> = {};

type Listener = (uri: string) => void;
const listeners: Record<string, Set<Listener>> = {};

function subscribe(userId: string, cb: Listener): () => void {
  if (!listeners[userId]) listeners[userId] = new Set();
  listeners[userId].add(cb);
  return () => listeners[userId].delete(cb);
}

function broadcast(userId: string, uri: string) {
  listeners[userId]?.forEach((cb) => cb(uri));
}

// Resize to 300×300 JPEG before storing so the avatar stays under ~80 KB.
async function toStorableUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  try {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const bitmap = await (window as any).createImageBitmap(blob) as ImageBitmap;
    const MAX = 400;
    const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = canvas.toDataURL('image/jpeg', 0.8);
    console.log(`[profile-avatar] compressed to ${w}x${h}, ${(out.length / 1024).toFixed(1)} KB`);
    return out;
  } catch (e) {
    console.warn('[profile-avatar] compression failed, storing original:', e);
    return uri;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  userId: string;       // netid — used as storage key
  initials: string;
  size: number;
  canEdit?: boolean;    // show camera trigger (profile page only)
  style?: ViewStyle;
}

export default function ProfileAvatar({ userId, initials, size, canEdit = false, style }: Props) {
  const [uri, setUri] = useState<string | null>(memCache[userId] ?? null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const unsub = subscribe(userId, (newUri) => setUri(newUri));

    if (memCache[userId]) {
      setUri(memCache[userId]);
    } else {
      AsyncStorage.getItem(storageKey(userId)).then((stored) => {
        if (stored) {
          memCache[userId] = stored;
          setUri(stored);
        }
      });
    }

    return unsub;
  }, [userId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images' as const],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const storableUri = await toStorableUri(result.assets[0].uri);
      memCache[userId] = storableUri;
      await AsyncStorage.setItem(storageKey(userId), storableUri);
      setUri(storableUri);
      broadcast(userId, storableUri);
    }
  };

  const radius = size / 2;
  const showOverlay = canEdit && (Platform.OS !== 'web' || hovered);

  // Web hover handlers — no-op on native since pointer events don't fire
  const hoverProps = Platform.OS === 'web' && canEdit
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};

  return (
    <View
      style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: '#F1BE48', alignItems: 'center', justifyContent: 'center' }, style]}
      {...(hoverProps as any)}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: size * 0.33, fontWeight: '700', color: '#374151' }}>
          {initials}
        </Text>
      )}

      {/* Camera overlay — hover on web, always on native */}
      {showOverlay && (
        <TouchableOpacity
          onPress={pickImage}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            inset: 0,
            width: size,
            height: size,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="camera" size={size * 0.32} color="white" />
          <Text style={{ color: 'white', fontSize: size * 0.13, fontWeight: '600', marginTop: 4 }}>
            Change photo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
