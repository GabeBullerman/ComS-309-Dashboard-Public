import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";

const ACCEPTED_TYPES: string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const FILE_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "text/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface FileStatusBadgeProps {
  isValid: boolean;
}

interface FileCardProps {
  file: UploadedFile;
  onRemove: (name: string) => void;
}

function FileStatusBadge({ isValid }: FileStatusBadgeProps): React.JSX.Element {
  return (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${
        isValid ? "bg-emerald-500/15" : "bg-rose-500/15"
      }`}
    >
      <Text
        className={`text-xs font-semibold tracking-wide ${
          isValid ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {isValid ? "✓  VALID" : "✕  INVALID TYPE"}
      </Text>
    </View>
  );
}

// ========================== Helper functions ==========================
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: string | undefined): string {
  if (type?.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type === "text/csv") return "📊";
  if (type?.includes("spreadsheet")) return "📊";
  return "📁";
}

// =======================================================================

export default function FileCard({ file, onRemove }: FileCardProps): React.JSX.Element {
  const isValid = ACCEPTED_TYPES.includes(file.type);
  const typeLabel =
    FILE_TYPE_LABELS[file.type] ??
    file.name.split(".").pop()?.toUpperCase() ??
    "UNKNOWN";

  return (
    <View className="flex-row items-center gap-3 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl px-4 py-3 mb-2">
      {/* Icon */}
      <View className="w-10 h-10 rounded-xl bg-zinc-700/70 items-center justify-center">
        <Text className="text-xl">{getFileIcon(file.type)}</Text>
      </View>

      {/* File info */}
      <View className="flex-1 min-w-0">
        <Text
          className="text-zinc-100 text-sm font-semibold mb-0.5"
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {file.name}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-zinc-500 text-xs">{formatBytes(file.size)}</Text>
          <Text className="text-zinc-600 text-xs">·</Text>
          <Text className="text-zinc-500 text-xs">{typeLabel}</Text>
        </View>
      </View>

      {/* Status badge */}
      <FileStatusBadge isValid={isValid} />

      {/* Remove button */}
      <TouchableOpacity
        onPress={() => onRemove(file.name)}
        className="w-7 h-7 rounded-full bg-zinc-700/80 items-center justify-center ml-1"
        accessibilityLabel="Remove file"
      >
        <Text className="text-zinc-400 text-xs font-bold">✕</Text>
      </TouchableOpacity>
    </View>
  );
}