import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    getMemberComments,
    getTeamComments,
    createMemberComment,
    createTeamComment,
    Comment,
    CommentStatus,
} from "@/api/comments";
import { getUserByNetid } from "@/api/users";

const STATUS_COLOR: Record<CommentStatus, string> = {
    Good: "#15803d",
    Moderate: "#b45309",
    Poor: "#b91c1c",
};

// For member comments: pass both recipientNetid AND teamId.
// For general team comments: pass only teamId.
interface CommentsProps {
    recipientNetid?: string;  // member context
    teamId?: number;          // required for both contexts
    authorNetid?: string;     // logged-in user (TA/Instructor)
    isStudent?: boolean;
}

export default function MemberComments({ recipientNetid, teamId, authorNetid, isStudent = false }: CommentsProps) {
    const [commentText, setCommentText] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<CommentStatus | null>(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; role: string }>>({});
    const [loading, setLoading] = useState(false);

    const loadSenderInfo = async (loaded: Comment[]) => {
        const netids = [...new Set(loaded.map((c) => c.senderNetid))];
        const entries = await Promise.all(
            netids.map(async (netid) => {
                const user = await getUserByNetid(netid).catch(() => null);
                return [netid, { name: user?.name ?? netid, role: user?.role ?? '' }] as const;
            })
        );
        setSenderInfo(Object.fromEntries(entries));
    };

    useEffect(() => {
        if (teamId === undefined) return;
        const fetch = recipientNetid
            ? getMemberComments(teamId, recipientNetid)
            : getTeamComments(teamId);
        fetch.then((data) => { setComments(data); loadSenderInfo(data); }).catch(() => {});
    }, [recipientNetid, teamId]);

    const handleSubmit = async () => {
        if (!commentText.trim() || !selectedStatus || !authorNetid || teamId === undefined) return;
        setLoading(true);
        try {
            let created: Comment;
            if (recipientNetid) {
                created = await createMemberComment({
                    commentBody: commentText.trim(),
                    status: selectedStatus,
                    receiverNetid: recipientNetid,
                    teamId,
                });
            } else {
                created = await createTeamComment(teamId, {
                    commentBody: commentText.trim(),
                    status: selectedStatus,
                });
            }
            setComments((prev) => [created, ...prev]);
            setCommentText("");
            setSelectedStatus(null);
        } catch {
            // TODO: surface error to user
        } finally {
            setLoading(false);
        }
    };

    const title = recipientNetid ? "Member Comments" : "Team Comments";

    return (
        <View className="bg-white rounded-xl shadow mt-6 mb-3 overflow-hidden">

        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
            <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
            <Text className="text-lg font-semibold ml-2">{title}</Text>
        </View>

        {/* Two-column body */}
        <View className="flex-row">

            {/* LEFT: Comment History */}
            <View className={`flex-1 p-4 ${!isStudent ? "border-r border-gray-200" : ""}`}>
                <Text className="text-sm font-semibold text-gray-700 mb-3">Comment History</Text>
                {comments.length === 0 ? (
                    <View className="items-center justify-center py-8">
                        <Text className="text-gray-400 text-sm">No comments yet</Text>
                    </View>
                ) : (
                    <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                        {comments.map((c) => (
                            <View key={c.id} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <View className="flex-row items-center justify-between mb-1">
                                    <Text className="text-xs font-semibold text-gray-600">
                                        {senderInfo[c.senderNetid]
                                            ? `${senderInfo[c.senderNetid].name} (${senderInfo[c.senderNetid].role})`
                                            : c.senderNetid}
                                    </Text>
                                    <Text
                                        className="text-xs font-bold"
                                        style={{ color: STATUS_COLOR[c.status] }}
                                    >
                                        {c.status}
                                    </Text>
                                </View>
                                <Text className="text-sm text-gray-800">{c.commentBody}</Text>
                                <Text className="text-[10px] text-gray-400 mt-1">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* RIGHT: Add Comment */}
            {!isStudent && <View className="flex-1 p-4">
                <Text className="text-sm font-semibold text-gray-700 mb-3">Add Comment</Text>

                <Text className="text-xs text-gray-600 mb-1">Comment</Text>
                <View className="border border-gray-300 rounded-md mb-1">
                    <TextInput
                        className="p-2 text-sm text-gray-800 h-28"
                        placeholder="Write your comment..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={1400}
                        value={commentText}
                        onChangeText={setCommentText}
                        textAlignVertical="top"
                    />
                </View>
                <Text className="text-xs text-gray-400 mb-3">
                    {commentText.trim() === "" ? 0 : commentText.trim().split(/\s+/).length}/200 words
                </Text>

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
                            {(["Good", "Moderate", "Poor"] as CommentStatus[]).map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    className="px-3 py-2"
                                    onPress={() => { setSelectedStatus(s); setStatusOpen(false); }}
                                >
                                    <Text className="text-sm" style={{ color: STATUS_COLOR[s] }}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    className="bg-red-700 rounded-lg py-3 items-center"
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text className="text-white font-semibold text-sm">
                        {loading ? "Submitting…" : "Submit Comment"}
                    </Text>
                </TouchableOpacity>
            </View>}
        </View>
        </View>
    );
}
