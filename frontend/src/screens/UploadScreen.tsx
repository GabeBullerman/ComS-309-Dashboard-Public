import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import FileUpload from "@/components/FileUpload";
import DropZone from "@/components/DropZone";
import axiosInstance from "@/api/client";

// Accepted file types
const ACCEPTED_TYPES: string[] = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

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
    const validFiles = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
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

  const validCount = files.filter((f) => ACCEPTED_TYPES.includes(f.type)).length;
  const invalidCount = files.length - validCount;

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
        <View className="mb-6 p-4 bg-gray-400/20 rounded-xl">
            {/* <Image
                source={require('../Images/Iowa_State_Cyclones_logo.png')}
                className="w-full h-40 object-contain"
            /> */}
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
      </ScrollView>
    </View>
  );
}