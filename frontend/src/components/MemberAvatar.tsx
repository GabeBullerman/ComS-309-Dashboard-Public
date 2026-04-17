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

// Resize to 200×200 JPEG before storing so each avatar stays under ~30 KB.
async function toStorableUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  try {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    const bitmap = await (window as any).createImageBitmap(blob) as ImageBitmap;
    const MAX = 300;
    const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const out = canvas.toDataURL('image/jpeg', 0.75);
    console.log(`[avatar] compressed to ${w}x${h}, ${(out.length / 1024).toFixed(1)} KB`);
    return out;
  } catch (e) {
    console.warn('[avatar] compression failed, storing original:', e);
    return uri;
  }
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
    console.log('[avatar] pickImage called for', memberId);
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
