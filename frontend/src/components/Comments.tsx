import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, useWindowDimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
    getMemberComments,
    getTeamComments,
    createMemberComment,
    createTeamComment,
    updateComment,
    deleteComment,
    Comment,
    CommentStatus,
} from "@/api/comments";
import { getUserByNetid } from "@/api/users";
import { useTheme } from '../contexts/ThemeContext';

interface CommentsProps {
    recipientNetid?: string;
    teamId?: number;
    authorNetid?: string;
    isStudent?: boolean;
}

export default function MemberComments({ recipientNetid, teamId, authorNetid, isStudent = false }: CommentsProps) {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const STATUS_COLOR: Record<CommentStatus, string> = {
        Good:     colors.statusGoodText,
        Moderate: colors.warningText,
        Poor:     colors.statusPoorText,
    };

    const [commentText, setCommentText] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<CommentStatus | null>(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [senderInfo, setSenderInfo] = useState<Record<string, { name: string; role: string }>>({});
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [editStatus, setEditStatus] = useState<CommentStatus>('Good');
    const [editStatusOpen, setEditStatusOpen] = useState(false);
    const [editIsPrivate, setEditIsPrivate] = useState(false);

    // purple accent for private notes — intentionally fixed
    const privatePurple = '#7c3aed';

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

    const startEdit = (c: Comment) => {
        setEditingId(c.id);
        setEditText(c.commentBody);
        setEditStatus(c.status);
        setEditIsPrivate(c.isPrivate);
        setEditStatusOpen(false);
    };

    const cancelEdit = () => setEditingId(null);

    const handleSaveEdit = async (c: Comment) => {
        try {
            const updated = await updateComment(c.id, { commentBody: editText, status: editStatus, isPrivate: editIsPrivate });
            setComments((prev) => prev.map((x) => x.id === c.id ? updated : x));
            setEditingId(null);
        } catch { /* silent */ }
    };

    const handleDelete = async (id: number) => {
        const ok = typeof window !== 'undefined'
            ? window.confirm('Delete this comment?')
            : true;
        if (!ok) return;
        try {
            await deleteComment(id);
            setComments((prev) => prev.filter((c) => c.id !== id));
        } catch { /* silent */ }
    };

    const title = recipientNetid ? "Member Comments" : "Team Comments";
    const visibleComments = isStudent ? comments.filter((c) => !c.isPrivate) : comments;

    const historyPanel = (
        <View style={{ flex: isMobile ? undefined : 1, borderRightWidth: (!isStudent && !isMobile) ? 1 : 0, borderRightColor: colors.border, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>Comment History</Text>
            {visibleComments.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
                    <Text style={{ color: colors.textFaint, fontSize: 13 }}>No comments yet</Text>
                </View>
            ) : (
                <ScrollView
                    style={{ maxHeight: isMobile ? 300 : 420, ...(Platform.OS === 'web' ? { overflow: 'auto' } as object : {}) }}
                    showsVerticalScrollIndicator
                >
                    {visibleComments.map((c) => {
                        const isOwn = c.senderNetid === authorNetid;
                        const canEdit = !isStudent && isOwn;
                        const canDelete = !isStudent && isOwn;
                        const isEditing = editingId === c.id;
                        return (
                            <View key={c.id} style={{ marginBottom: 10, padding: 10, backgroundColor: c.isPrivate ? colors.borderLight : colors.background, borderRadius: 8, borderWidth: 1, borderColor: c.isPrivate ? colors.borderMedium : colors.borderLight }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                        {c.isPrivate && <Ionicons name="lock-closed" size={11} color={privatePurple} style={{ marginRight: 4 }} />}
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                                            {senderInfo[c.senderNetid]
                                                ? `${senderInfo[c.senderNetid].name} (${senderInfo[c.senderNetid].role})`
                                                : c.senderNetid}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: STATUS_COLOR[c.status] }}>{c.status}</Text>
                                        {canEdit && !isEditing && (
                                            <TouchableOpacity onPress={() => startEdit(c)}>
                                                <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                        {canDelete && !isEditing && (
                                            <TouchableOpacity onPress={() => handleDelete(c.id)}>
                                                <Ionicons name="trash-outline" size={14} color={colors.statusPoorBar} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                {isEditing ? (
                                    <View>
                                        <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 6, marginBottom: 6 }}>
                                            <TextInput
                                                style={{ padding: 8, fontSize: 13, color: colors.text, height: 80, textAlignVertical: 'top' }}
                                                value={editText}
                                                onChangeText={setEditText}
                                                multiline
                                                maxLength={1400}
                                            />
                                        </View>
                                        <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 6, marginBottom: 6, overflow: 'hidden' }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 }}
                                                onPress={() => setEditStatusOpen((v) => !v)}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: STATUS_COLOR[editStatus] }}>{editStatus}</Text>
                                                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                                            </TouchableOpacity>
                                            {editStatusOpen && (
                                                <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
                                                    {(["Good", "Moderate", "Poor"] as CommentStatus[]).map((s) => (
                                                        <TouchableOpacity key={s} style={{ paddingHorizontal: 10, paddingVertical: 8 }} onPress={() => { setEditStatus(s); setEditStatusOpen(false); }}>
                                                            <Text style={{ fontSize: 12, fontWeight: '600', color: STATUS_COLOR[s] }}>{s}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} onPress={() => setEditIsPrivate((v) => !v)}>
                                            <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: editIsPrivate ? privatePurple : colors.borderMedium, backgroundColor: editIsPrivate ? privatePurple : colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                                                {editIsPrivate && <Ionicons name="checkmark" size={10} color={colors.textInverse} />}
                                            </View>
                                            <Text style={{ fontSize: 11, color: editIsPrivate ? privatePurple : colors.textMuted }}>Private</Text>
                                        </TouchableOpacity>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity style={{ flex: 1, backgroundColor: colors.text, borderRadius: 6, paddingVertical: 8, alignItems: 'center' }} onPress={() => handleSaveEdit(c)}>
                                                <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: '600' }}>Save</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ flex: 1, backgroundColor: colors.borderLight, borderRadius: 6, paddingVertical: 8, alignItems: 'center' }} onPress={cancelEdit}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Text style={{ fontSize: 13, color: colors.text }}>{c.commentBody}</Text>
                                        <Text style={{ fontSize: 10, color: colors.textFaint, marginTop: 4 }}>
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </Text>
                                    </>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );

    const addPanel = !isStudent ? (
        <View style={{ flex: isMobile ? undefined : 1, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 }}>Add Comment</Text>

            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Comment</Text>
            <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 8, marginBottom: 4 }}>
                <TextInput
                    style={{ padding: 10, fontSize: 13, color: colors.text, height: 100, textAlignVertical: 'top' }}
                    placeholder="Write your comment..."
                    placeholderTextColor={colors.textFaint}
                    multiline
                    maxLength={1400}
                    value={commentText}
                    onChangeText={setCommentText}
                />
            </View>
            <Text style={{ fontSize: 11, color: colors.textFaint, marginBottom: 10 }}>
                {commentText.trim() === "" ? 0 : commentText.trim().split(/\s+/).length}/200 words
            </Text>

            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Status</Text>
            <View style={{ borderWidth: 1, borderColor: colors.borderMedium, borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}
                    onPress={() => setStatusOpen(!statusOpen)}
                >
                    <Text style={{ fontSize: 13, color: selectedStatus ? colors.text : colors.textFaint }}>
                        {selectedStatus ?? "Select Status"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {statusOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
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
                <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: isPrivate ? privatePurple : colors.borderMedium, backgroundColor: isPrivate ? privatePurple : colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    {isPrivate && <Ionicons name="checkmark" size={12} color={colors.textInverse} />}
                </View>
                <Ionicons name="lock-closed" size={13} color={isPrivate ? privatePurple : colors.textFaint} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, color: isPrivate ? privatePurple : colors.textMuted, fontWeight: isPrivate ? '600' : '400' }}>
                    Private (hidden from students)
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
                onPress={handleSubmit}
                disabled={loading}
            >
                <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 13 }}>
                    {loading ? "Submitting…" : "Submit Comment"}
                </Text>
            </TouchableOpacity>
        </View>
    ) : null;

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 12, marginTop: 0, marginBottom: 16, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                <Text style={{ fontSize: 15, fontWeight: '600', marginLeft: 8, color: colors.text }}>{title}</Text>
            </View>

            {/* Body */}
            <View style={{ flexDirection: isMobile ? 'column' : 'row' }}>
                {isMobile ? (
                    <>
                        {addPanel}
                        {addPanel && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14 }} />}
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
