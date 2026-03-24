import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import FileUpload from "@/components/FileUpload";
import DropZone from "@/components/DropZone";

// Accepted file types
const ACCEPTED_TYPES: string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export default function UploadScreen(): React.JSX.Element {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFilesSelected = useCallback((newFiles: UploadedFile[]) => {
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const unique = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...unique];
    });
  }, []);

  const handleRemove = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

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
            File Manager
          </Text>
          <Text className="text-base text-3xl font-bold tracking-tight">
            Upload Files
          </Text>
          <Text className="text-zinc-500 text-sm mt-1.5">
            Drag and drop or browse to attach your documents.
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
                  unsupported format. Only PDF, PNG, JPEG, CSV, and XLSX files
                  are accepted.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Upload CTA */}
        {files.length > 0 && (
          <TouchableOpacity
            className={`mt-6 rounded-2xl py-4 items-center ${
              invalidCount === 0 && validCount > 0 ? "bg-amber-400" : "bg-zinc-700"
            }`}
            disabled={invalidCount > 0 || validCount === 0}
          >
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
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}