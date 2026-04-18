import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";

import FileUpload from "@/components/FileUpload";
import DropZone from "@/components/DropZone";
import axiosInstance from "@/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUsersByRole } from "@/api/users";

const ACCEPTED_TYPES = new Set([
  "text/csv",
  "text/comma-separated-values",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isAccepted(f: UploadedFile): boolean {
  if (ACCEPTED_TYPES.has(f.type)) return true;
  const lower = f.name.toLowerCase();
  return lower.endsWith('.csv') || lower.endsWith('.xlsx');
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

type UploadResult = { name: string; ok: boolean; message: string };

export default function UploadScreen(): React.JSX.Element {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleFilesSelected = useCallback((newFiles: UploadedFile[]) => {
    setResults([]);
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const unique = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...unique];
    });
  }, []);

  const handleRemove = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setResults((prev) => prev.filter((r) => r.name !== name));
  }, []);

  const handleUpload = useCallback(async () => {
    const validFiles = files.filter(isAccepted);
    setUploading(true);
    setResults([]);

    const uploadResults: UploadResult[] = await Promise.all(
      validFiles.map(async (f) => {
        const formData = new FormData();
        formData.append('file', f as unknown as File);
        try {
          await axiosInstance.post('/api/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return { name: f.name, ok: true, message: 'Uploaded successfully' };
        } catch (err: any) {
          const msg = err?.response?.data || err?.message || 'Upload failed';
          return { name: f.name, ok: false, message: String(msg) };
        }
      })
    );

    setResults(uploadResults);
    setUploading(false);
    // Remove successfully uploaded files from the list
    const failedNames = new Set(uploadResults.filter((r) => !r.ok).map((r) => r.name));
    setFiles((prev) => prev.filter((f) => failedNames.has(f.name)));
  }, [files]);

  const validCount = files.filter(isAccepted).length;
  const invalidCount = files.length - validCount;

  // Avatar bulk upload
  const [avatarResults, setAvatarResults] = useState<{ key: string; ok: boolean; unchanged?: boolean; noMatch?: boolean; name: string }[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarFiles = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;
    setAvatarUploading(true);
    setAvatarResults([]);

    // Best-effort name→netid lookup with 3s timeout so it never blocks file processing
    const nameToNetid = new Map<string, string>();
    try {
      const lookupTimeout = new Promise<never>((_, rej) => setTimeout(() => rej(), 3000));
      const lookupResult = Promise.all([
        getUsersByRole('STUDENT').catch(() => []),
        getUsersByRole('TA').catch(() => []),
        getUsersByRole('HTA').catch(() => []),
      ]).then(arrs => arrs.flat());
      const users = await Promise.race([lookupResult, lookupTimeout]);
      for (const u of users) {
        if (u.netid) {
          nameToNetid.set(u.netid.toLowerCase(), u.netid);
          if (u.name) nameToNetid.set(u.name.toLowerCase().replace(/\s+/g, ''), u.netid);
        }
      }
    } catch { /* timed out or failed — use raw filename as netid */ }

    const isImage = (f: File) =>
      f.type.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.name);

    const results: { key: string; ok: boolean; unchanged?: boolean; name: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!isImage(file)) continue;
      const baseName = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '');
      const matched = nameToNetid.get(baseName);
      // If lookup succeeded but no student matched, skip — don't save under unknown key
      if (!matched && nameToNetid.size > 0) {
        results.push({ key: baseName, ok: false, noMatch: true, name: file.name });
        continue;
      }
      const resolvedNetid = matched ?? baseName;
      try {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' });
        const bitmap = await (window as any).createImageBitmap(blob) as ImageBitmap;
        const MAX = 300;
        const scale = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1);
        const w = Math.max(1, Math.round(bitmap.width * scale));
        const h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const storageKey = `member_avatar_${resolvedNetid}`;
        const existing = await AsyncStorage.getItem(storageKey);
        if (existing === dataUrl) {
          results.push({ key: resolvedNetid, ok: true, unchanged: true, name: file.name });
        } else {
          await AsyncStorage.setItem(storageKey, dataUrl);
          results.push({ key: resolvedNetid, ok: true, name: file.name });
        }
      } catch {
        results.push({ key: resolvedNetid, ok: false, name: file.name });
      }
    }
    if (results.length === 0) {
      results.push({ key: '', ok: false, name: 'No image files found in selection' });
    }
    setAvatarResults(results);
    setAvatarUploading(false);
  }, []);

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-base text-xl font-bold mb-2">
            Upload Teams
          </Text>
          <Text className="text-zinc-500 text-sm mt-1.5">
            Drag and drop or browse to attach your documents.
          </Text>
        </View>

        {/* Required Upload Format */}
        <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Expected File Format</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            Accepted formats: <Text style={{ fontFamily: 'monospace', color: '#374151' }}>.csv</Text> or <Text style={{ fontFamily: 'monospace', color: '#374151' }}>.xlsx</Text>
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
            The file must have a header row followed by one student per row with exactly 4 columns in this order:
          </Text>
          <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, gap: 4 }}>
            {[
              ['Column 1', 'First name'],
              ['Column 2', 'Last name'],
              ['Column 3', 'NetID'],
              ['Column 4', 'Team name'],
            ].map(([col, label]) => (
              <View key={col} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280', width: 68 }}>{col}</Text>
                <Text style={{ fontSize: 11, color: '#374151' }}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
            Example: <Text style={{ fontFamily: 'monospace' }}>John,Doe,jdoe,Team A1</Text>
          </Text>
        </View>

        {/* Drop Zone */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />

        {/* File List */}
        {files.length > 0 && (
          <View className="mt-6">
            {/* Section header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-zinc-400 text-xs font-bold tracking-widest uppercase">
                Uploaded Files
              </Text>
              <View className="flex-row gap-2">
                {validCount > 0 && (
                  <View className="bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    <Text className="text-emerald-400 text-xs font-semibold">
                      {validCount} valid
                    </Text>
                  </View>
                )}
                {invalidCount > 0 && (
                  <View className="bg-rose-500/15 px-2 py-0.5 rounded-full">
                    <Text className="text-rose-400 text-xs font-semibold">
                      {invalidCount} invalid
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Cards */}
            {files.map((file) => (
              <FileUpload key={file.name} file={file} onRemove={handleRemove} />
            ))}

            {/* Invalid type warning */}
            {invalidCount > 0 && (
              <View className="flex-row items-start gap-2.5 mt-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                <Text className="text-rose-400 text-base mt-0.5">⚠️</Text>
                <Text className="text-rose-300 text-xs leading-5 flex-1">
                  {invalidCount} file{invalidCount > 1 ? "s have" : " has"} an
                  unsupported format. Only CSV and XLSX files are accepted.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Upload results */}
        {results.length > 0 && (
          <View style={{ marginTop: 16, gap: 6 }}>
            {results.map((r) => (
              <View
                key={r.name}
                style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                  backgroundColor: r.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  borderRadius: 10, padding: 12,
                }}
              >
                <Text style={{ fontSize: 14 }}>{r.ok ? '✅' : '❌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: r.ok ? '#059669' : '#DC2626' }}>
                    {r.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: r.ok ? '#065f46' : '#991b1b', marginTop: 2 }}>
                    {r.message}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Upload CTA */}
        {files.length > 0 && (
          <TouchableOpacity
            className={`mt-6 rounded-2xl py-4 items-center ${
              invalidCount === 0 && validCount > 0 && !uploading ? "bg-yellow-400" : "bg-zinc-700"
            }`}
            disabled={invalidCount > 0 || validCount === 0 || uploading}
            onPress={handleUpload}
          >
            {uploading ? (
              <ActivityIndicator color="#18181b" />
            ) : (
              <Text
                className={`text-sm font-bold tracking-wide ${
                  invalidCount === 0 && validCount > 0
                    ? "text-zinc-900"
                    : "text-zinc-500"
                }`}
              >
                {invalidCount > 0
                  ? "RESOLVE ERRORS TO CONTINUE"
                  : `UPLOAD ${validCount} FILE${validCount !== 1 ? "S" : ""}`}
              </Text>
            )}
          </TouchableOpacity>
        )}
        {/* Avatar Bulk Upload */}
        {Platform.OS === 'web' && (
          <View style={{ marginTop: 32, backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Upload Avatars</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              Name images after the student's netid (e.g. <Text style={{ fontFamily: 'monospace' }}>jdoe.jpg</Text>). Images are stored locally in your browser.
            </Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>
              Full name files also work — spaces are stripped and lowercased (e.g. <Text style={{ fontFamily: 'monospace' }}>john doe.png</Text> → key <Text style={{ fontFamily: 'monospace' }}>johndoe</Text>).
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Transparent input overlaid on button — direct click, no programmatic .click() needed */}
              <View style={{ flex: 1, position: 'relative' }}>
                <View style={{ alignItems: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: '#F1BE48', opacity: avatarUploading ? 0.6 : 1 }}>
                  {avatarUploading
                    ? <ActivityIndicator color="#111827" />
                    : <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Choose Files</Text>}
                </View>
                {!avatarUploading && (
                  <input type="file" accept="image/*" multiple
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' } as any}
                    onChange={(e: any) => { const files = Array.from(e.target.files || []) as File[]; e.target.value = ''; if (files.length) handleAvatarFiles(files); }} />
                )}
              </View>
              <View style={{ flex: 1, position: 'relative' }}>
                <View style={{ alignItems: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', opacity: avatarUploading ? 0.6 : 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Choose Folder</Text>
                </View>
                {!avatarUploading && (
                  <input type="file" accept="image/*" multiple
                    {...{ webkitdirectory: '', directory: '' } as any}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' } as any}
                    onChange={(e: any) => { const files = Array.from(e.target.files || []) as File[]; e.target.value = ''; if (files.length) handleAvatarFiles(files); }} />
                )}
              </View>
            </View>

            {avatarResults.length > 0 && (
              <View style={{ marginTop: 14, gap: 6 }}>
                {avatarResults.map((r) => {
                  const warn = r.unchanged || r.noMatch;
                  const bg = warn ? 'rgba(234,179,8,0.08)' : r.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
                  const nameColor = warn ? '#92400e' : r.ok ? '#059669' : '#DC2626';
                  const icon = warn ? '⚠️' : r.ok ? '✅' : '❌';
                  return (
                    <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, borderRadius: 8, padding: 10 }}>
                      <Text style={{ fontSize: 13 }}>{icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: nameColor }}>{r.name}</Text>
                        {r.unchanged && <Text style={{ fontSize: 11, color: '#92400e' }}>No changes — avatar for <Text style={{ fontFamily: 'monospace' }}>{r.key}</Text> is already identical</Text>}
                        {r.noMatch && <Text style={{ fontSize: 11, color: '#92400e' }}>No matching student — not saved. Rename to the student's netid (e.g. <Text style={{ fontFamily: 'monospace' }}>jdoe.jpg</Text>)</Text>}
                        {r.ok && !r.unchanged && !r.noMatch && <Text style={{ fontSize: 11, color: '#6b7280' }}>Saved as avatar for <Text style={{ fontFamily: 'monospace' }}>{r.key}</Text></Text>}
                        {!r.ok && <Text style={{ fontSize: 11, color: '#991b1b' }}>Failed to process image</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}