import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, useWindowDimensions } from "react-native";
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

interface CommentsProps {
    recipientNetid?: string;
    teamId?: number;
    authorNetid?: string;
    isStudent?: boolean;
}

export default function MemberComments({ recipientNetid, teamId, authorNetid, isStudent = false }: CommentsProps) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [commentText, setCommentText] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<CommentStatus | null>(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
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
                    isPrivate,
                });
            } else {
                created = await createTeamComment(teamId, {
                    commentBody: commentText.trim(),
                    status: selectedStatus,
                    isPrivate,
                });
            }
            setComments((prev) => [created, ...prev]);
            setCommentText("");
            setSelectedStatus(null);
            setIsPrivate(false);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const title = recipientNetid ? "Member Comments" : "Team Comments";

    const visibleComments = isStudent ? comments.filter((c) => !c.isPrivate) : comments;

    const historyPanel = (
        <View style={{ flex: isMobile ? undefined : 1, borderRightWidth: (!isStudent && !isMobile) ? 1 : 0, borderRightColor: '#E5E7EB', padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>Comment History</Text>
            {visibleComments.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No comments yet</Text>
                </View>
            ) : (
                <ScrollView style={{ maxHeight: isMobile ? 220 : 260 }} showsVerticalScrollIndicator={false}>
                    {visibleComments.map((c) => (
                        <View key={c.id} style={{ marginBottom: 10, padding: 10, backgroundColor: c.isPrivate ? '#faf5ff' : '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: c.isPrivate ? '#e9d5ff' : '#F3F4F6' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                    {c.isPrivate && <Ionicons name="lock-closed" size={11} color="#7c3aed" style={{ marginRight: 4 }} />}
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#4B5563', flex: 1 }} numberOfLines={1}>
                                        {senderInfo[c.senderNetid]
                                            ? `${senderInfo[c.senderNetid].name} (${senderInfo[c.senderNetid].role})`
                                            : c.senderNetid}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLOR[c.status] }}>
                                    {c.status}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 13, color: '#111827' }}>{c.commentBody}</Text>
                            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
                                {new Date(c.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    const addPanel = !isStudent ? (
        <View style={{ flex: isMobile ? undefined : 1, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>Add Comment</Text>

            <Text style={{ fontSize: 11, color: '#4B5563', marginBottom: 4 }}>Comment</Text>
            <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 4 }}>
                <TextInput
                    style={{ padding: 10, fontSize: 13, color: '#111827', height: 100, textAlignVertical: 'top' }}
                    placeholder="Write your comment..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={1400}
                    value={commentText}
                    onChangeText={setCommentText}
                />
            </View>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
                {commentText.trim() === "" ? 0 : commentText.trim().split(/\s+/).length}/200 words
            </Text>

            <Text style={{ fontSize: 11, color: '#4B5563', marginBottom: 4 }}>Status</Text>
            <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}
                    onPress={() => setStatusOpen(!statusOpen)}
                >
                    <Text style={{ fontSize: 13, color: selectedStatus ? '#111827' : '#9CA3AF' }}>
                        {selectedStatus ?? "Select Status"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#6b7280" />
                </TouchableOpacity>
                {statusOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                        {(["Good", "Moderate", "Poor"] as CommentStatus[]).map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                                onPress={() => { setSelectedStatus(s); setStatusOpen(false); }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: STATUS_COLOR[s] }}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
                onPress={() => setIsPrivate((v) => !v)}
                activeOpacity={0.7}
            >
                <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: isPrivate ? '#7c3aed' : '#D1D5DB', backgroundColor: isPrivate ? '#7c3aed' : 'white', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    {isPrivate && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
                <Ionicons name="lock-closed" size={13} color={isPrivate ? '#7c3aed' : '#9CA3AF'} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: isPrivate ? '#7c3aed' : '#6B7280', fontWeight: isPrivate ? '600' : '400' }}>
                    Private (hidden from students)
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={{ backgroundColor: '#b91c1c', borderRadius: 8, paddingVertical: 12, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
                onPress={handleSubmit}
                disabled={loading}
            >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                    {loading ? "Submitting…" : "Submit Comment"}
                </Text>
            </TouchableOpacity>
        </View>
    ) : null;

    return (
        <View style={{ backgroundColor: 'white', borderRadius: 12, marginHorizontal: 12, marginTop: 0, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <Ionicons name="chatbubble-outline" size={18} color="#be123c" />
                <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: '#111827' }}>{title}</Text>
            </View>

            {/* Body — stacked on mobile, side-by-side on desktop */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row' }}>
                {isMobile ? (
                    <>
                        {addPanel}
                        {addPanel && <View style={{ height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 14 }} />}
                        {historyPanel}
                    </>
                ) : (
                    <>
                        {historyPanel}
                        {addPanel}
                    </>
                )}
            </View>
        </View>
    );
}
