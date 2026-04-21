import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import FileUpload from "@/components/FileUpload";
import DropZone from "@/components/DropZone";
import axiosInstance from "@/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUsersByRole } from "@/api/users";
import { createUser, getUserByNetid } from "@/api/users";
import { createTeam, addStudentToTeam, clearSemester } from "@/api/teams";
import { UserRole, UserSummary } from "@/utils/auth";
import * as ImagePicker from "expo-image-picker";

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

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

type UploadResult = { name: string; ok: boolean; message: string };

interface Props {
  userRole?: UserRole;
}

export default function UploadScreen({ userRole }: Props): React.JSX.Element {
  const isInstructor = userRole === 'Instructor';

  // ── CSV upload state ──────────────────────────────────────────────────────
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
    const failedNames = new Set(uploadResults.filter((r) => !r.ok).map((r) => r.name));
    setFiles((prev) => prev.filter((f) => failedNames.has(f.name)));
  }, [files]);

  const validCount = files.filter(isAccepted).length;
  const invalidCount = files.length - validCount;

  // ── Avatar upload state ───────────────────────────────────────────────────
  const [avatarResults, setAvatarResults] = useState<{ key: string; ok: boolean; unchanged?: boolean; noMatch?: boolean; name: string }[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarFiles = useCallback(async (fileList: File[]) => {
    if (!fileList.length) return;
    setAvatarUploading(true);
    setAvatarResults([]);
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
    } catch { /* timed out — use raw filename as netid */ }

    const isImage = (f: File) =>
      f.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.name);

    const res: { key: string; ok: boolean; unchanged?: boolean; noMatch?: boolean; name: string }[] = [];
    for (const file of fileList) {
      if (!isImage(file)) continue;
      const baseName = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '');
      const matched = nameToNetid.get(baseName);
      if (!matched && nameToNetid.size > 0) {
        res.push({ key: baseName, ok: false, noMatch: true, name: file.name });
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
          res.push({ key: resolvedNetid, ok: true, unchanged: true, name: file.name });
        } else {
          await AsyncStorage.setItem(storageKey, dataUrl);
          res.push({ key: resolvedNetid, ok: true, name: file.name });
        }
      } catch {
        res.push({ key: resolvedNetid, ok: false, name: file.name });
      }
    }
    if (res.length === 0) res.push({ key: '', ok: false, name: 'No image files found in selection' });
    setAvatarResults(res);
    setAvatarUploading(false);
  }, []);

  const handleAvatarPickerMobile = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.75,
      base64: true,
    });
    if (result.canceled || !result.assets.length) return;
    setAvatarUploading(true);
    setAvatarResults([]);
    const res: { key: string; ok: boolean; unchanged?: boolean; name: string }[] = [];
    for (const asset of result.assets) {
      const fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'unknown';
      const resolvedNetid = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '');
      try {
        const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
        const storageKey = `member_avatar_${resolvedNetid}`;
        const existing = await AsyncStorage.getItem(storageKey);
        if (existing === dataUrl) {
          res.push({ key: resolvedNetid, ok: true, unchanged: true, name: fileName });
        } else {
          await AsyncStorage.setItem(storageKey, dataUrl);
          res.push({ key: resolvedNetid, ok: true, name: fileName });
        }
      } catch {
        res.push({ key: resolvedNetid, ok: false, name: fileName });
      }
    }
    if (res.length === 0) res.push({ key: '', ok: false, name: 'No images selected' });
    setAvatarResults(res);
    setAvatarUploading(false);
  }, []);

  // ── Manual team creation state ────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taList, setTaList] = useState<UserSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamSection, setTeamSection] = useState('');
  const [selectedTaNetid, setSelectedTaNetid] = useState('');
  const [studentRows, setStudentRows] = useState([
    { key: '1', firstName: '', lastName: '', netid: '' },
  ]);

  const openCreateModal = useCallback(async () => {
    setShowCreateModal(true);
    setCreateResult(null);
    if (taList.length === 0) {
      try {
        const [tas, htas] = await Promise.all([
          getUsersByRole('TA').catch(() => [] as UserSummary[]),
          getUsersByRole('HTA').catch(() => [] as UserSummary[]),
        ]);
        setTaList([...tas, ...htas]);
      } catch {}
    }
  }, [taList.length]);

  const addRow = () =>
    setStudentRows(prev => [...prev, { key: Date.now().toString(), firstName: '', lastName: '', netid: '' }]);

  const removeRow = (key: string) =>
    setStudentRows(prev => prev.length > 1 ? prev.filter(r => r.key !== key) : prev);

  const updateRow = (key: string, field: 'firstName' | 'lastName' | 'netid', value: string) =>
    setStudentRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));

  const resetForm = () => {
    setTeamName('');
    setTeamSection('');
    setSelectedTaNetid('');
    setStudentRows([{ key: '1', firstName: '', lastName: '', netid: '' }]);
    setCreateResult(null);
  };

  const handleCreateTeam = useCallback(async () => {
    const name = teamName.trim();
    const sectionNum = parseInt(teamSection, 10);
    if (!name || isNaN(sectionNum)) return;

    const validRows = studentRows.filter(r => r.firstName.trim() && r.lastName.trim() && r.netid.trim());

    setCreating(true);
    setCreateResult(null);
    try {
      const studentIds: number[] = [];
      for (const row of validRows) {
        try {
          const existing = await getUserByNetid(row.netid.trim());
          if (existing?.id) {
            studentIds.push(existing.id);
          } else {
            const created = await createUser({
              netid: row.netid.trim(),
              name: `${row.firstName.trim()} ${row.lastName.trim()}`,
              password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
              role: ['STUDENT'],
            });
            if (created?.id) studentIds.push(created.id);
          }
        } catch { /* skip individual student errors */ }
      }

      const team = await createTeam({
        name,
        section: sectionNum,
        taNetid: selectedTaNetid || undefined,
      });

      if (team.id) {
        await Promise.all(studentIds.map(sid => addStudentToTeam(team.id!, sid).catch(() => {})));
      }

      setCreateResult({
        ok: true,
        message: `Team "${name}" created with ${studentIds.length} student${studentIds.length !== 1 ? 's' : ''}.`,
      });
      resetForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data || err?.message || 'Failed to create team.';
      setCreateResult({ ok: false, message: String(msg) });
    } finally {
      setCreating(false);
    }
  }, [teamName, teamSection, selectedTaNetid, studentRows]);

  // ── Format tooltip state ──────────────────────────────────────────────────
  const [showFormatTip, setShowFormatTip] = useState(false);

  // ── Clear semester state ──────────────────────────────────────────────────
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearText, setClearText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const handleClearSemester = useCallback(async () => {
    setClearing(true);
    try {
      await clearSemester();
      setClearText('');
      setShowClearConfirm(false);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 6000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data || err?.message
        || 'Failed. Make sure your account has the CAN_DELETE_SEMESTER permission.';
      Alert.alert('Clear Failed', String(msg));
    } finally {
      setClearing(false);
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-100">

      {/* ── Manual Team Creation Modal ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!creating) setShowCreateModal(false); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, maxHeight: '90%', overflow: 'hidden' }}>
            {/* Modal header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Create Team Manually</Text>
              {!creating && (
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={22} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* Team name */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Team Name *</Text>
                <TextInput
                  value={teamName}
                  onChangeText={setTeamName}
                  placeholder="e.g. Team A1"
                  placeholderTextColor="#9ca3af"
                  style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' }}
                />
              </View>

              {/* Section */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Section Number *</Text>
                <TextInput
                  value={teamSection}
                  onChangeText={setTeamSection}
                  placeholder="e.g. 1"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' }}
                />
              </View>

              {/* TA selector */}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Assign TA (optional)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedTaNetid('')}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: !selectedTaNetid ? '#b91c1c' : '#f3f4f6' }}
                  >
                    <Text style={{ fontSize: 12, color: !selectedTaNetid ? 'white' : '#374151', fontWeight: '500' }}>None</Text>
                  </TouchableOpacity>
                  {taList.map(ta => (
                    <TouchableOpacity
                      key={ta.netid}
                      onPress={() => setSelectedTaNetid(ta.netid ?? '')}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: selectedTaNetid === ta.netid ? '#b91c1c' : '#f3f4f6' }}
                    >
                      <Text style={{ fontSize: 12, color: selectedTaNetid === ta.netid ? 'white' : '#374151', fontWeight: '500' }}>
                        {ta.name ?? ta.netid}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Students */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Students</Text>
                  <TouchableOpacity
                    onPress={addRow}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f3f4f6', borderRadius: 8 }}
                  >
                    <Ionicons name="add" size={14} color="#374151" />
                    <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>Add Student</Text>
                  </TouchableOpacity>
                </View>

                {studentRows.map((row, idx) => (
                  <View key={row.key} style={{ marginBottom: 10, padding: 12, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '600' }}>Student {idx + 1}</Text>
                      {studentRows.length > 1 && (
                        <TouchableOpacity onPress={() => removeRow(row.key)}>
                          <Ionicons name="close-circle" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <TextInput
                        value={row.firstName}
                        onChangeText={v => updateRow(row.key, 'firstName', v)}
                        placeholder="First name"
                        placeholderTextColor="#9ca3af"
                        style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: 'white' }}
                      />
                      <TextInput
                        value={row.lastName}
                        onChangeText={v => updateRow(row.key, 'lastName', v)}
                        placeholder="Last name"
                        placeholderTextColor="#9ca3af"
                        style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: 'white' }}
                      />
                    </View>
                    <TextInput
                      value={row.netid}
                      onChangeText={v => updateRow(row.key, 'netid', v)}
                      placeholder="NetID (e.g. jdoe)"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827', backgroundColor: 'white' }}
                    />
                  </View>
                ))}
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                  Rows with any empty field are skipped. If a NetID already exists the student is added without re-creating.
                </Text>
              </View>

              {/* Result banner */}
              {createResult && (
                <View style={{ padding: 12, borderRadius: 10, backgroundColor: createResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: createResult.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
                  <Text style={{ fontSize: 13, color: createResult.ok ? '#059669' : '#dc2626', fontWeight: '600' }}>
                    {createResult.ok ? '✓ ' : '✗ '}{createResult.message}
                  </Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                onPress={handleCreateTeam}
                disabled={creating || !teamName.trim() || !teamSection.trim()}
                style={{
                  backgroundColor: (creating || !teamName.trim() || !teamSection.trim()) ? '#e5e7eb' : '#b91c1c',
                  borderRadius: 10, paddingVertical: 14, alignItems: 'center',
                }}
              >
                {creating
                  ? <ActivityIndicator color="white" />
                  : <Text style={{ color: (!teamName.trim() || !teamSection.trim()) ? '#9ca3af' : 'white', fontWeight: '700', fontSize: 14 }}>
                      Create Team
                    </Text>
                }
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-base text-xl font-bold mb-2">Upload Teams</Text>
          <Text className="text-zinc-500 text-sm mt-1.5">
            Drag and drop or browse to attach your documents.
          </Text>
        </View>

        {/* Manual team creation button */}
        <TouchableOpacity
          onPress={openCreateModal}
          style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5, borderColor: '#b91c1c', paddingVertical: 14 }}
        >
          <Ionicons name="people-circle-outline" size={18} color="#b91c1c" />
          <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 14 }}>Create Team Manually</Text>
        </TouchableOpacity>

        {/* File upload section header with format tooltip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 }}>Upload Team File</Text>
          <TouchableOpacity
            onPress={() => setShowFormatTip(true)}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Show expected file format"
          >
            <Ionicons name="information-circle-outline" size={20} color="#4f46e5" />
          </TouchableOpacity>
        </View>

        {/* Format tooltip modal */}
        <Modal visible={showFormatTip} transparent animationType="fade" onRequestClose={() => setShowFormatTip(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} activeOpacity={1} onPress={() => setShowFormatTip(false)}>
            <TouchableOpacity activeOpacity={1} style={{ backgroundColor: 'white', borderRadius: 14, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
                <Ionicons name="document-text-outline" size={18} color="#4f46e5" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 }}>Expected File Format</Text>
                <TouchableOpacity onPress={() => setShowFormatTip(false)}>
                  <Ionicons name="close" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                Accepted formats:{' '}
                <Text style={{ fontFamily: 'monospace', color: '#374151' }}>.csv</Text> or{' '}
                <Text style={{ fontFamily: 'monospace', color: '#374151' }}>.xlsx</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
                Header row followed by one student per row with exactly 4 columns:
              </Text>
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, gap: 6 }}>
                {[
                  ['Column 1', 'First name'],
                  ['Column 2', 'Last name'],
                  ['Column 3', 'NetID'],
                  ['Column 4', 'Team name'],
                ].map(([col, label]) => (
                  <View key={col} style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280', width: 72 }}>{col}</Text>
                    <Text style={{ fontSize: 12, color: '#374151' }}>{label}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
                Example: <Text style={{ fontFamily: 'monospace' }}>John,Doe,jdoe,Team A1</Text>
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Drop Zone */}
        <DropZone
          onFilesSelected={handleFilesSelected}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />

        {/* File List */}
        {files.length > 0 && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-zinc-400 text-xs font-bold tracking-widest uppercase">Uploaded Files</Text>
              <View className="flex-row gap-2">
                {validCount > 0 && (
                  <View className="bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    <Text className="text-emerald-400 text-xs font-semibold">{validCount} valid</Text>
                  </View>
                )}
                {invalidCount > 0 && (
                  <View className="bg-rose-500/15 px-2 py-0.5 rounded-full">
                    <Text className="text-rose-400 text-xs font-semibold">{invalidCount} invalid</Text>
                  </View>
                )}
              </View>
            </View>

            {files.map((file) => (
              <FileUpload key={file.name} file={file} onRemove={handleRemove} />
            ))}

            {invalidCount > 0 && (
              <View className="flex-row items-start gap-2.5 mt-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                <Text className="text-rose-400 text-base mt-0.5">⚠️</Text>
                <Text className="text-rose-300 text-xs leading-5 flex-1">
                  {invalidCount} file{invalidCount > 1 ? "s have" : " has"} an unsupported format. Only CSV and XLSX files are accepted.
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
                  <Text style={{ fontSize: 13, fontWeight: '600', color: r.ok ? '#059669' : '#DC2626' }}>{r.name}</Text>
                  <Text style={{ fontSize: 12, color: r.ok ? '#065f46' : '#991b1b', marginTop: 2 }}>{r.message}</Text>
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
              <Text className={`text-sm font-bold tracking-wide ${invalidCount === 0 && validCount > 0 ? "text-zinc-900" : "text-zinc-500"}`}>
                {invalidCount > 0 ? "RESOLVE ERRORS TO CONTINUE" : `UPLOAD ${validCount} FILE${validCount !== 1 ? "S" : ""}`}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Avatar Bulk Upload */}
        <View style={{ marginTop: 32, backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Upload Avatars</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            {"Name images after the student's netid (e.g. "}<Text style={{ fontFamily: 'monospace' }}>jdoe.jpg</Text>{"). Images are stored locally on this device."}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 14 }}>
            Full name files also work — spaces are stripped and lowercased (e.g.{' '}
            <Text style={{ fontFamily: 'monospace' }}>john doe.png</Text> → key <Text style={{ fontFamily: 'monospace' }}>johndoe</Text>).
          </Text>

          {Platform.OS === 'web' ? (
            <View style={{ flexDirection: 'column', gap: 8 }}>
              <View style={{ position: 'relative' }}>
                <View style={{ alignItems: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: '#F1BE48', opacity: avatarUploading ? 0.6 : 1 }}>
                  {avatarUploading ? <ActivityIndicator color="#111827" /> : <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Choose Files</Text>}
                </View>
                {!avatarUploading && (
                  <input type="file" accept="image/*" multiple
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' } as any}
                    onChange={(e: any) => { const fs = Array.from(e.target.files || []) as File[]; e.target.value = ''; if (fs.length) handleAvatarFiles(fs); }} />
                )}
              </View>
              <View style={{ position: 'relative' }}>
                <View style={{ alignItems: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', opacity: avatarUploading ? 0.6 : 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Choose Folder</Text>
                </View>
                {!avatarUploading && (
                  <input type="file" accept="image/*" multiple
                    {...{ webkitdirectory: '', directory: '' } as any}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' } as any}
                    onChange={(e: any) => { const fs = Array.from(e.target.files || []) as File[]; e.target.value = ''; if (fs.length) handleAvatarFiles(fs); }} />
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleAvatarPickerMobile}
              disabled={avatarUploading}
              style={{ alignItems: 'center', paddingVertical: 11, borderRadius: 10, backgroundColor: '#F1BE48', opacity: avatarUploading ? 0.6 : 1 }}
            >
              {avatarUploading ? <ActivityIndicator color="#111827" /> : <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Choose Photos</Text>}
            </TouchableOpacity>
          )}

          {avatarResults.length > 0 && (
            <View style={{ marginTop: 14, gap: 6 }}>
              {avatarResults.map((r) => {
                const warn = r.unchanged;
                const bg = warn ? 'rgba(234,179,8,0.08)' : r.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
                const nameColor = warn ? '#92400e' : r.ok ? '#059669' : '#DC2626';
                const icon = warn ? '⚠️' : r.ok ? '✅' : '❌';
                return (
                  <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: bg, borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontSize: 13 }}>{icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: nameColor }}>{r.name}</Text>
                      {r.unchanged && <Text style={{ fontSize: 11, color: '#92400e' }}>No changes — avatar for <Text style={{ fontFamily: 'monospace' }}>{r.key}</Text> is already identical</Text>}
                      {r.ok && !r.unchanged && <Text style={{ fontSize: 11, color: '#6b7280' }}>Saved as avatar for <Text style={{ fontFamily: 'monospace' }}>{r.key}</Text></Text>}
                      {!r.ok && <Text style={{ fontSize: 11, color: '#991b1b' }}>Failed to process image</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Danger Zone (Instructor only) ── */}
        {isInstructor && (
          <View style={{ marginTop: 40, marginBottom: 20, borderWidth: 2, borderColor: '#dc2626', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header bar */}
            <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="warning" size={22} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 17, letterSpacing: 1 }}>DANGER ZONE</Text>
            </View>

            <View style={{ padding: 20, backgroundColor: 'white' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>Clear Semester</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 4 }}>
                Permanently deletes{' '}
                <Text style={{ fontWeight: '700', color: '#dc2626' }}>all teams</Text>
                {' '}and{' '}
                <Text style={{ fontWeight: '700', color: '#dc2626' }}>all students assigned to those teams</Text>.
                Staff accounts (TAs, HTAs, Instructors) are not affected.
              </Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
                Students who are not currently assigned to any team will also not be deleted. This action cannot be undone.
              </Text>

              {clearSuccess && (
                <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>✓ Semester cleared successfully. All team and student data has been removed.</Text>
                </View>
              )}

              {!showClearConfirm ? (
                <TouchableOpacity
                  onPress={() => setShowClearConfirm(true)}
                  style={{ backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Clear Semester Data</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#fca5a5' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#dc2626', marginBottom: 6 }}>⚠️ Are you absolutely sure?</Text>
                    <Text style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 18 }}>
                      This will permanently delete all teams and their students. Type{' '}
                      <Text style={{ fontFamily: 'monospace', fontWeight: '800' }}>CLEAR SEMESTER</Text>
                      {' '}exactly to proceed.
                    </Text>
                  </View>

                  <TextInput
                    value={clearText}
                    onChangeText={setClearText}
                    placeholder="Type CLEAR SEMESTER"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="characters"
                    style={{
                      borderWidth: 2,
                      borderColor: clearText === 'CLEAR SEMESTER' ? '#dc2626' : '#d1d5db',
                      borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
                      fontSize: 15, color: '#111827', backgroundColor: '#f9fafb',
                      fontFamily: 'monospace',
                    }}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => { setShowClearConfirm(false); setClearText(''); }}
                      style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 13, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#374151', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleClearSemester}
                      disabled={clearText !== 'CLEAR SEMESTER' || clearing}
                      style={{
                        flex: 1,
                        backgroundColor: clearText === 'CLEAR SEMESTER' ? '#dc2626' : '#e5e7eb',
                        borderRadius: 10, paddingVertical: 13, alignItems: 'center',
                      }}
                    >
                      {clearing
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text style={{ color: clearText === 'CLEAR SEMESTER' ? 'white' : '#9ca3af', fontWeight: '700', fontSize: 14 }}>
                            Delete Everything
                          </Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
