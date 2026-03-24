import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";

const ACCEPTED_EXTENSIONS: string[] = [".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx"];

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}
interface DropZoneProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
}

// Web-only drag-and-drop zone
export default function DropZone({
  onFilesSelected,
  isDragging,
  setIsDragging,
}: DropZoneProps): React.JSX.Element {
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    },
    [setIsDragging]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files) as UploadedFile[];
      onFilesSelected(droppedFiles);
    },
    [onFilesSelected, setIsDragging]
  );

  const handleBrowse = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ACCEPTED_EXTENSIONS.join(",");
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const selectedFiles = Array.from(target.files) as UploadedFile[];
        onFilesSelected(selectedFiles);
      }
    };
    input.click();
  }, [onFilesSelected]);

  return (
    <View
      className={`rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
        isDragging
          ? "border-amber-400 bg-amber-400/5"
          : "border-zinc-600 bg-zinc-800/30"
      }`}
    >
      {Platform.OS === "web" ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ padding: 0 }}
        >
          <View className="items-center justify-center py-12 px-6 gap-4">
            {/* Upload icon */}
            <View
              className={`w-16 h-16 rounded-2xl items-center justify-center ${
                isDragging ? "bg-amber-400/20" : "bg-zinc-700/50"
              }`}
            >
              <Text className="text-4xl">{isDragging ? "📂" : "☁️"}</Text>
            </View>

            {/* Heading */}
            <View className="items-center gap-1">
              <Text className="text-zinc-100 text-lg font-semibold text-center">
                {isDragging ? "Release to upload" : "Drop files here"}
              </Text>
              <Text className="text-zinc-500 text-sm text-center">
                or{" "}
                <Text
                  className="text-amber-400 font-semibold"
                  onPress={handleBrowse}
                  style={{ cursor: "pointer" }}
                >
                  browse your computer
                </Text>
              </Text>
            </View>

            {/* Accepted types */}
            <View className="flex-row flex-wrap gap-1.5 justify-center mt-1">
              {ACCEPTED_EXTENSIONS.map((ext) => (
                <View key={ext} className="px-2 py-0.5 bg-zinc-700/60 rounded-md">
                  <Text className="text-zinc-400 text-xs font-mono">{ext}</Text>
                </View>
              ))}
            </View>

            <Text className="text-zinc-600 text-xs mt-1">Max file size: 50 MB</Text>
          </View>
        </div>
      ) : (
        // Native (iOS/Android) — browse only
        <TouchableOpacity onPress={() => {}}>
          <View className="items-center justify-center py-12 px-6 gap-4">
            <View className="w-16 h-16 rounded-2xl bg-zinc-700/50 items-center justify-center">
              <Text className="text-4xl">☁️</Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-zinc-100 text-lg font-semibold text-center">
                Tap to upload a file
              </Text>
              <Text className="text-zinc-500 text-sm text-center">
                PDF, PNG, JPEG, CSV, XLSX
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}