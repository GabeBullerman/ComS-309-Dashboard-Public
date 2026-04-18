import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage, getMessages, sendMessage, editMessage, deleteMessage, markRead } from '../api/chat';
import { getUsersByRole } from '../api/users';
import { UserSummary } from '../utils/auth';

const POLL_MS = 5000;
const ROLES = ['TA', 'HTA', 'Instructor'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function ColorAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},55%,48%)`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

function MessageContent({ content, mentionedNetids, mentionedRoles, myNetid }: {
  content: string;
  mentionedNetids: string[];
  mentionedRoles: string[];
  myNetid: string;
}) {
  const parts = content.split(/(@\w+)/g);
  return (
    <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20, flexWrap: 'wrap' }}>
      {parts.map((part, i) => {
        if (!part.startsWith('@')) return <Text key={i}>{part}</Text>;
        const handle = part.slice(1);
        const isRole = mentionedRoles.includes(handle) || ROLES.includes(handle);
        const isUser = mentionedNetids.includes(handle);
        const isMe = handle === myNetid;
        if (isRole || isUser) {
          return (
            <Text key={i} style={{
              backgroundColor: isMe ? '#fef3c7' : '#e0e7ff',
              color: isMe ? '#92400e' : '#4338ca',
              fontWeight: '600', borderRadius: 3,
            }}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

interface Props {
  myNetid: string;
  myName: string;
  onUnreadChange: (count: number) => void;
}

export default function StaffChatScreen({ myNetid, myName, onUnreadChange }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [staff, setStaff] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const isAtBottomRef = useRef(true);
  const mapRef = useRef<Map<number, ChatMessage>>(new Map());
  const inputRef = useRef<TextInput>(null);

  const sortedMessages = useCallback(() =>
    Array.from(mapRef.current.values()).sort((a, b) => a.id - b.id), []);

  const applyMap = useCallback(() => setMessages(sortedMessages()), [sortedMessages]);

  // Load staff for autocomplete
  useEffect(() => {
    Promise.all([
      getUsersByRole('TA').catch(() => [] as UserSummary[]),
      getUsersByRole('HTA').catch(() => [] as UserSummary[]),
      getUsersByRole('Instructor').catch(() => [] as UserSummary[]),
    ]).then(([a, b, c]) => setStaff([...a, ...b, ...c]));
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const msgs = await getMessages(undefined, 50);
        mapRef.current = new Map(msgs.map(m => [m.id, m]));
        setMessages(msgs);
        setHasMore(msgs.length === 50);
        if (msgs.length > 0) {
          await markRead(msgs[msgs.length - 1].id).catch(() => {});
          onUnreadChange(0);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  // Scroll to bottom on load
  useEffect(() => {
    if (!loading) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  }, [loading]);

  // Poll for new / updated messages
  useEffect(() => {
    const poll = async () => {
      try {
        const latest = await getMessages(undefined, 50);
        let changed = false;
        for (const m of latest) {
          const existing = mapRef.current.get(m.id);
          if (!existing || existing.content !== m.content || existing.edited !== m.edited) {
            mapRef.current.set(m.id, m);
            changed = true;
          }
        }
        if (changed) {
          setMessages(sortedMessages());
          const newest = latest[latest.length - 1];
          if (newest && isAtBottomRef.current) {
            await markRead(newest.id).catch(() => {});
            onUnreadChange(0);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
          }
        }
      } catch {}
    };
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [sortedMessages, onUnreadChange]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0].id;
      const older = await getMessages(oldest, 50);
      for (const m of older) mapRef.current.set(m.id, m);
      setMessages(sortedMessages());
      setHasMore(older.length === 50);
    } catch {} finally { setLoadingMore(false); }
  };

  // @mention autocomplete
  const handleTextChange = (text: string) => {
    setInputText(text);
    const lastAt = text.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = text.slice(lastAt + 1);
      if (!afterAt.includes(' ')) { setMentionQuery(afterAt.toLowerCase()); return; }
    }
    setMentionQuery(null);
  };

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery;
    const roleSuggestions = ROLES
      .filter(r => r.toLowerCase().startsWith(q))
      .map(r => ({ type: 'role' as const, value: r }));
    const staffSuggestions = staff
      .filter(s => s.netid !== myNetid && (
        s.netid?.toLowerCase().startsWith(q) || s.name?.toLowerCase().includes(q)
      ))
      .map(s => ({ type: 'netid' as const, value: s.netid!, name: s.name ?? s.netid! }));
    return [...roleSuggestions, ...staffSuggestions].slice(0, 8);
  }, [mentionQuery, staff, myNetid]);

  const insertMention = (value: string) => {
    const lastAt = inputText.lastIndexOf('@');
    setInputText(inputText.slice(0, lastAt) + `@${value} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const parseMentions = (text: string) => {
    const handles = [...text.matchAll(/@(\w+)/g)].map(m => m[1]);
    return {
      netids: [...new Set(handles.filter(h => staff.some(s => s.netid === h)))],
      roles: [...new Set(handles.filter(h => ROLES.includes(h)))],
    };
  };

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || sending) return;
    const { netids, roles } = parseMentions(content);
    setSending(true);
    try {
      if (editingMsg) {
        const updated = await editMessage(editingMsg.id, { content, mentionedNetids: netids, mentionedRoles: roles });
        mapRef.current.set(updated.id, updated);
        applyMap();
        setEditingMsg(null);
      } else {
        const msg = await sendMessage({ content, replyToId: replyingTo?.id, mentionedNetids: netids, mentionedRoles: roles });
        mapRef.current.set(msg.id, msg);
        applyMap();
        await markRead(msg.id).catch(() => {});
        onUnreadChange(0);
        setReplyingTo(null);
        isAtBottomRef.current = true;
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
      setInputText('');
      setMentionQuery(null);
    } catch {
      Alert.alert('Error', 'Failed to send message.');
    } finally { setSending(false); }
  };

  const handleDelete = async (msg: ChatMessage) => {
    const doDelete = async () => {
      await deleteMessage(msg.id);
      mapRef.current.delete(msg.id);
      applyMap();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this message? This cannot be undone.')) await doDelete();
    } else {
      Alert.alert('Delete message?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingMsg(msg);
    setReplyingTo(null);
    setInputText(msg.content);
    inputRef.current?.focus();
  };

  // Group messages by date, collapse consecutive same-sender runs
  const grouped = useMemo(() => {
    type DateRow = { kind: 'date'; date: string };
    type MsgRow = { kind: 'msg'; msg: ChatMessage; showHeader: boolean };
    const rows: Array<DateRow | MsgRow> = [];
    let lastDate = '';
    let lastSender = '';
    for (const msg of messages) {
      const date = formatDate(msg.createdAt);
      if (date !== lastDate) {
        rows.push({ kind: 'date', date });
        lastDate = date;
        lastSender = '';
      }
      const showHeader = msg.senderNetid !== lastSender || msg.replyTo !== null;
      rows.push({ kind: 'msg', msg, showHeader });
      lastSender = msg.senderNetid;
    }
    return rows;
  }, [messages]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f9fafb' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="chatbubbles" size={20} color="#b91c1c" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Staff Chat</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>
          {staff.length} staff online
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onScroll={e => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          isAtBottomRef.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 60;
        }}
        scrollEventThrottle={100}
      >
        {hasMore && (
          <TouchableOpacity
            onPress={loadMore}
            disabled={loadingMore}
            style={{ alignSelf: 'center', marginBottom: 12, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#e5e7eb', borderRadius: 20 }}
          >
            {loadingMore
              ? <ActivityIndicator size="small" color="#6b7280" />
              : <Text style={{ fontSize: 12, color: '#6b7280' }}>Load older messages</Text>
            }
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#b91c1c" style={{ marginTop: 60 }} />
        ) : messages.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>No messages yet. Say hello!</Text>
          </View>
        ) : (
          grouped.map((row, i) => {
            if (row.kind === 'date') {
              return (
                <View key={`date-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
                  <Text style={{ fontSize: 11, color: '#9ca3af', marginHorizontal: 10 }}>{row.date}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
                </View>
              );
            }

            const { msg, showHeader } = row;
            const isOwn = msg.senderNetid === myNetid;
            const displayName = msg.senderName || msg.senderNetid;

            return (
              <View
                key={`msg-${msg.id}`}
                // @ts-ignore web-only hover
                onMouseEnter={() => setHoveredId(msg.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  flexDirection: 'row',
                  marginBottom: showHeader ? 6 : 1,
                  paddingTop: showHeader ? 6 : 0,
                  paddingHorizontal: 4,
                  borderRadius: 6,
                  backgroundColor: hoveredId === msg.id ? '#f3f4f6' : 'transparent',
                }}
              >
                {/* Avatar column */}
                <View style={{ width: 40, marginRight: 10, alignItems: 'center', paddingTop: showHeader ? 2 : 0 }}>
                  {showHeader && <ColorAvatar name={displayName} size={36} />}
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  {showHeader && (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: '#111827' }}>{displayName}</Text>
                      <Text style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(msg.createdAt)}</Text>
                      {msg.edited && <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>(edited)</Text>}
                    </View>
                  )}

                  {/* Reply preview */}
                  {msg.replyTo && (
                    <View style={{ borderLeftWidth: 3, borderLeftColor: '#F1BE48', backgroundColor: '#fffbeb', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e', marginBottom: 1 }}>
                        {msg.replyTo.senderName || msg.replyTo.senderNetid}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={2}>{msg.replyTo.content}</Text>
                    </View>
                  )}

                  <MessageContent
                    content={msg.content}
                    mentionedNetids={msg.mentionedNetids}
                    mentionedRoles={msg.mentionedRoles}
                    myNetid={myNetid}
                  />
                </View>

                {/* Hover actions */}
                {hoveredId === msg.id && (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingLeft: 8 }}>
                    <TouchableOpacity
                      onPress={() => { setReplyingTo(msg); setEditingMsg(null); inputRef.current?.focus(); }}
                      style={{ padding: 6, backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' }}
                    >
                      <Ionicons name="return-down-back-outline" size={15} color="#6b7280" />
                    </TouchableOpacity>
                    {isOwn && (
                      <>
                        <TouchableOpacity
                          onPress={() => startEdit(msg)}
                          style={{ padding: 6, backgroundColor: 'white', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' }}
                        >
                          <Ionicons name="pencil-outline" size={15} color="#6b7280" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(msg)}
                          style={{ padding: 6, backgroundColor: '#fef2f2', borderRadius: 6, borderWidth: 1, borderColor: '#fca5a5' }}
                        >
                          <Ionicons name="trash-outline" size={15} color="#dc2626" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Mention autocomplete */}
      {mentionSuggestions.length > 0 && (
        <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginHorizontal: 12, marginBottom: 4, maxHeight: 220, elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6 }}>
          {mentionSuggestions.map((s) => (
            <TouchableOpacity
              key={`${s.type}-${s.value}`}
              onPress={() => insertMention(s.value)}
              style={{ paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
            >
              {s.type === 'role' ? (
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people" size={15} color="#4338ca" />
                </View>
              ) : (
                <ColorAvatar name={'name' in s ? s.name : s.value} size={30} />
              )}
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>@{s.value}</Text>
                {'name' in s && s.name !== s.value && (
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>{s.name}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Reply / edit context bar */}
      {(replyingTo || editingMsg) && (
        <View style={{ backgroundColor: '#fffbeb', borderTopWidth: 1, borderTopColor: '#F1BE48', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={editingMsg ? 'pencil' : 'return-down-back'} size={14} color="#92400e" />
          <Text style={{ flex: 1, fontSize: 12, color: '#92400e' }} numberOfLines={1}>
            {editingMsg
              ? `Editing: ${editingMsg.content}`
              : `Replying to ${replyingTo!.senderName || replyingTo!.senderNetid}: ${replyingTo!.content}`}
          </Text>
          <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMsg(null); setInputText(''); }}>
            <Ionicons name="close" size={18} color="#92400e" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 }}>
        <TextInput
          ref={inputRef}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder="Message staff... use @ to mention"
          placeholderTextColor="#9ca3af"
          multiline
          style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', maxHeight: 120, minHeight: 40 }}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !inputText.trim()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: inputText.trim() ? '#b91c1c' : '#e5e7eb', alignItems: 'center', justifyContent: 'center' }}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Ionicons name={editingMsg ? 'checkmark' : 'send'} size={16} color={inputText.trim() ? 'white' : '#9ca3af'} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
