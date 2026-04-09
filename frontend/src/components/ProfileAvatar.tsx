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
