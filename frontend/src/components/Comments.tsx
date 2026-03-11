import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
export default function MemberComments() {
    const [commentText, setCommentText] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [statusOpen, setStatusOpen] = useState(false);

    return (
        <View className="bg-white rounded-xl shadow mt-6 mb-3 overflow-hidden">
        
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
        <Text className="text-lg font-semibold ml-2">Member Comments</Text>
    </View>

    {/* Two-column body */}
    <View className="flex-row">

        {/* LEFT: Comment History */}
        <View className="flex-1 p-4 border-r border-gray-200">
        <Text className="text-sm font-semibold text-gray-700 mb-3">Comment History</Text>
        <View className="flex-1 items-center justify-center py-8">
            <Text className="text-gray-400 text-sm">No comments available for this team member</Text>
        </View>
        </View>

        {/* RIGHT: Add Comment */}
        <View className="flex-1 p-4">
        <Text className="text-sm font-semibold text-gray-700 mb-3">Add Comment</Text>

        {/* Comment input */}
        <Text className="text-xs text-gray-600 mb-1">Comment</Text>
        <View className="border border-gray-300 rounded-md mb-1">
            <TextInput
            className="p-2 text-sm text-gray-800 h-28"
            placeholder="Write your comment..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={1400} // ~200 words
            value={commentText}
            onChangeText={setCommentText}
            textAlignVertical="top"
            />
        </View>
        <Text className="text-xs text-gray-400 mb-3">
            {commentText.trim() === "" ? 0 : commentText.trim().split(/\s+/).length}/200 words
        </Text>

        {/* Status dropdown (simplified) */}
        <Text className="text-xs text-gray-600 mb-1">Status</Text>
        <View className="border border-gray-300 rounded-md mb-4 overflow-hidden">
            <TouchableOpacity
            className="flex-row items-center justify-between px-3 py-2"
            onPress={() => setStatusOpen(!statusOpen)}
            >
            <Text className={selectedStatus ? "text-sm text-gray-800" : "text-sm text-gray-400"}>
                {selectedStatus ?? "Select Status"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </TouchableOpacity>
            {statusOpen && (
            <View className="border-t border-gray-200">
                {["Good", "Moderate", "Poor"].map((s) => (
                <TouchableOpacity
                    key={s}
                    className="px-3 py-2"
                    onPress={() => { setSelectedStatus(s); setStatusOpen(false); }}
                >
                    <Text className="text-sm text-gray-700">{s}</Text>
                </TouchableOpacity>
                ))}
            </View>
            )}
        </View>

        {/* Submit */}
        <TouchableOpacity className="bg-red-700 rounded-lg py-3 items-center">
            <Text className="text-white font-semibold text-sm">Submit Comment</Text>
        </TouchableOpacity>
        </View>
        </View>
        </View>
    );
}