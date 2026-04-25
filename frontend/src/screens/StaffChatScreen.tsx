import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ChatMessage, ChannelMeta, CHANNELS,
  getMessages, sendMessage, editMessage, deleteMessage,
  markRead, getAllUnreadCounts, getChannels, updateChannel,
  sendTyping, getTyping,
} from '../api/chat';
import { getUsersByRole } from '../api/users';
import { UserRole, UserSummary } from '../utils/auth';
import { useTheme } from '../contexts/ThemeContext';
import { ColorPalette } from '../constants/colors';
import { getActivityStatuses, ActivityStatus } from '../api/activity';
import ActivityStatusBadge from '../components/ActivityStatusBadge';

const POLL_MS = 5000;
const ROLES = ['everyone', 'TA', 'HTA', 'Instructor'];

const EMOJI_CATEGORIES = [
  {
    label: 'Smileys', icon: '😀',
    emojis: ['😀','😁','😂','🤣','😅','😊','😉','🥰','😍','🤩','😎','🤔','🥺','😢','😭','😤','🤦','🤷','🙃','😶','😴','🥱','😋','😬'],
  },
  {
    label: 'Gestures', icon: '👍',
    emojis: ['👍','👎','👏','🙌','🤝','💪','✌️','🖐️','🤞','❤️','🔥','💯','✅','⭐','🎉','💡','🚀','🏆','😈'],
  },
  {
    label: 'Tech', icon: '💻',
    emojis: ['💻','🖥️','📱','⌨️','🖱️','🛠️','🔧','🐛','✨','📊','📈','📋','🗒️','📚','🎓','🔒','🔑','📡','⚙️','🧪'],
  },
  {
    label: 'Food', icon: '🍕',
    emojis: ['🍕','🍔','🌮','🍜','🍣','☕','🧃','🍺','🍦','🍩','🍪','🎂','🍎','🥑','🌶️','🥐','🍰','🍟','🥗'],
  },
] as const;

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

function ColorAvatar({ name, size = 36, status }: { name: string; size?: number; status?: ActivityStatus }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `hsl(${hue},55%,48%)`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
      </View>
      {status && (
        <View style={{ position: 'absolute', bottom: 0, right: 0 }}>
          <ActivityStatusBadge status={status} size={size * 0.38} borderColor="#1f2937" />
        </View>
      )}
    </View>
  );
}

function MessageContent({ content, mentionedNetids, mentionedRoles, myNetid, staffMap, colors }: {
  content: string;
  mentionedNetids: string[];
  mentionedRoles: string[];
  myNetid: string;
  staffMap: Map<string, string>;
  colors: ColorPalette;
}) {
  const parts = content.split(/(@\w+)/g);
  return (
    <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20, flexWrap: 'wrap' }}>
      {parts.map((part, i) => {
        if (!part.startsWith('@')) return <Text key={i}>{part}</Text>;
        const handle = part.slice(1);
        const isRole = mentionedRoles.includes(handle) || ROLES.includes(handle);
        const isUser = mentionedNetids.includes(handle) || staffMap.has(handle);
        const isMe = handle === myNetid;
        const displayName = staffMap.get(handle);
        if (isRole || isUser) {
          return (
            <Text key={i} style={{
              backgroundColor: isMe ? colors.warningBg : colors.ungradedBg,
              color: isMe ? colors.warningText : colors.ungradedText,
              fontWeight: '600', borderRadius: 3,
            }}>
              @{displayName ?? handle}
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
  userRole: UserRole;
  onUnreadChange: (count: number) => void;
}

export default function StaffChatScreen({ myNetid, myName: _myName, userRole, onUnreadChange }: Props) {
  const { colors } = useTheme();
  const isInstructor = userRole === 'Instructor';
  const [activeChannel, setActiveChannel] = useState('general');
  const [channelMeta, setChannelMeta] = useState<Record<string, ChannelMeta>>({});
  const [channelUnreads, setChannelUnreads] = useState<Record<string, number>>({});
  const [editingChannel, setEditingChannel] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingChannel, setSavingChannel] = useState(false);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activityStatuses, setActivityStatuses] = useState<Record<string, ActivityStatus>>({});

  const scrollRef = useRef<ScrollView>(null);
  const isAtBottomRef = useRef(true);
  const mapRef = useRef<Map<number, ChatMessage>>(new Map());
  const inputRef = useRef<TextInput>(null);
  const activeChannelRef = useRef(activeChannel);
  const lastTypingSentRef = useRef<number>(0);
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);

  const staffMap = useMemo(
    () => new Map(staff.map(s => [s.netid!, s.name ?? s.netid!])),
    [staff]
  );

  const sortedMessages = useCallback(
    () => Array.from(mapRef.current.values()).sort((a, b) => a.id - b.id),
    []
  );
  const applyMap = useCallback(() => setMessages(sortedMessages()), [sortedMessages]);

  // Load staff for autocomplete + name display
  useEffect(() => {
    Promise.all([
      getUsersByRole('TA').catch(() => [] as UserSummary[]),
      getUsersByRole('HTA').catch(() => [] as UserSummary[]),
      getUsersByRole('Instructor').catch(() => [] as UserSummary[]),
    ]).then(([a, b, c]) => setStaff([...a, ...b, ...c]));
  }, []);

  // Poll activity status of all staff
  useEffect(() => {
    const fetch = () => getActivityStatuses().then(setActivityStatuses).catch(() => {});
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  // Load channel metadata (names + descriptions)
  useEffect(() => {
    getChannels().then(list => {
      setChannelMeta(Object.fromEntries(list.map(c => [c.id, c])));
    }).catch(() => {});
  }, []);

  // Load messages when channel changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasMore(true);
    mapRef.current = new Map();
    setMessages([]);
    getMessages(activeChannel, undefined, 50)
      .then(async msgs => {
        if (cancelled) return;
        mapRef.current = new Map(msgs.map(m => [m.id, m]));
        setMessages(msgs);
        setHasMore(msgs.length === 50);
        if (msgs.length > 0) {
          await markRead(msgs[msgs.length - 1].id, activeChannel).catch(() => {});
          refreshUnreads();
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeChannel]);

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
  }, [loading]);

  const refreshUnreads = useCallback(async () => {
    try {
      const counts = await getAllUnreadCounts();
      setChannelUnreads(counts);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      onUnreadChange(total);
    } catch {}
  }, [onUnreadChange]);

  // Poll for new messages and unread counts
  useEffect(() => {
    const poll = async () => {
      const ch = activeChannelRef.current;
      try {
        const latest = await getMessages(ch, undefined, 50);
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
            await markRead(newest.id, ch).catch(() => {});
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
          }
        }
        refreshUnreads();
      } catch {}
    };
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [sortedMessages, refreshUnreads]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const older = await getMessages(activeChannel, messages[0].id, 50);
      for (const m of older) mapRef.current.set(m.id, m);
      setMessages(sortedMessages());
      setHasMore(older.length === 50);
    } catch {} finally { setLoadingMore(false); }
  };

  // Poll typing state every 2s
  useEffect(() => {
    const poll = async () => {
      try {
        const names = await getTyping(activeChannelRef.current);
        setTypingUsers(names);
      } catch {}
    };
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // @mention autocomplete — allow single spaces for "First Last" searches
  const handleTextChange = (text: string) => {
    setInputText(text);
    // Throttle: send at most once per 3s while typing
    if (text.trim()) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > 3000) {
        lastTypingSentRef.current = now;
        sendTyping(activeChannelRef.current).catch(() => {});
      }
    }
    const lastAt = text.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = text.slice(lastAt + 1);
      // Stop at double-space (deliberate end), but allow single space for name search
      if (!afterAt.includes('  ') && !afterAt.startsWith(' ')) {
        setMentionQuery(afterAt.toLowerCase());
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.trim();
    const roleSuggestions = ROLES
      .filter(r => r.toLowerCase().startsWith(q))
      .map(r => ({ type: 'role' as const, value: r, displayName: r }));
    const staffSuggestions = staff
      .filter(s => s.netid !== myNetid && (() => {
        const name = (s.name ?? '').toLowerCase();
        const netid = (s.netid ?? '').toLowerCase();
        return netid.startsWith(q) || name.includes(q) ||
          name.split(' ').some(part => part.startsWith(q));
      })())
      .map(s => ({ type: 'netid' as const, value: s.netid!, displayName: s.name ?? s.netid! }));
    return [...roleSuggestions, ...staffSuggestions];
  }, [mentionQuery, staff, myNetid]);

  const insertMention = (netidOrRole: string) => {
    const lastAt = inputText.lastIndexOf('@');
    setInputText(inputText.slice(0, lastAt) + `@${netidOrRole} `);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const parseMentions = (text: string) => {
    const handles = [...text.matchAll(/@(\w+)/g)].map(m => m[1]);
    return {
      netids: [...new Set(handles.filter(h => staffMap.has(h)))],
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
        const msg = await sendMessage({ content, channel: activeChannel, replyToId: replyingTo?.id, mentionedNetids: netids, mentionedRoles: roles });
        mapRef.current.set(msg.id, msg);
        applyMap();
        await markRead(msg.id, activeChannel).catch(() => {});
        refreshUnreads();
        setReplyingTo(null);
        isAtBottomRef.current = true;
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
      setInputText('');
      setMentionQuery(null);
      setShowEmojiPicker(false);
      setTypingUsers([]);
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

  const activeChannelStatic = CHANNELS.find(c => c.id === activeChannel)!;
  const activeMeta = channelMeta[activeChannel];
  const activeDisplayName = activeMeta?.displayName ?? activeChannelStatic.defaultLabel;
  const activeDescription = activeMeta?.description ?? null;

  const handleSaveChannel = async () => {
    setSavingChannel(true);
    try {
      const updated = await updateChannel(activeChannel, { displayName: editName.trim() || activeDisplayName, description: editDesc.trim() || null });
      setChannelMeta(prev => ({ ...prev, [activeChannel]: updated }));
      setEditingChannel(false);
    } catch {
      Alert.alert('Error', 'Failed to save channel.');
    } finally { setSavingChannel(false); }
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>

      {/* ── Channel sidebar ── */}
      <View style={{ width: 180, backgroundColor: colors.navBg, paddingTop: 16, borderLeftWidth: 3, borderLeftColor: colors.gold }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, paddingHorizontal: 12, marginBottom: 6 }}>
          CHANNELS
        </Text>
        {CHANNELS.map(ch => {
          const isActive = ch.id === activeChannel;
          const unread = channelUnreads[ch.id] ?? 0;
          const label = channelMeta[ch.id]?.displayName ?? ch.defaultLabel;
          return (
            <TouchableOpacity
              key={ch.id}
              onPress={() => { setActiveChannel(ch.id); setEditingChannel(false); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4,
                borderRadius: 6, marginBottom: 2,
                backgroundColor: isActive ? colors.gold : 'transparent',
              }}
            >
              <Ionicons
                name={ch.icon}
                size={17}
                color={isActive ? '#7c2d12' : unread > 0 ? 'white' : 'rgba(255,255,255,0.85)'}
              />
              <Text style={{ fontSize: 15, color: isActive ? '#7c2d12' : unread > 0 ? 'white' : 'rgba(255,255,255,0.9)', fontWeight: isActive || unread > 0 ? '700' : '500', flex: 1 }} numberOfLines={1}>
                {label}
              </Text>
              {unread > 0 && !isActive && (
                <View style={{ backgroundColor: colors.gold, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: '#7c2d12', fontSize: 10, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Main chat area ── */}
      <KeyboardAvoidingView style={{ flex: 1, flexDirection: 'column' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        {editingChannel ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 }}>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder={activeDisplayName}
              placeholderTextColor={colors.textFaint}
              style={{ fontSize: 15, fontWeight: '700', color: colors.text, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.inputBg }}
            />
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Add a description..."
              placeholderTextColor={colors.textFaint}
              style={{ fontSize: 13, color: colors.textMuted, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.inputBg }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleSaveChannel}
                disabled={savingChannel}
                style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 }}
              >
                {savingChannel
                  ? <ActivityIndicator size="small" color={colors.textInverse} />
                  : <Text style={{ color: colors.textInverse, fontWeight: '600', fontSize: 13 }}>Save</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingChannel(false)}
                style={{ backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={activeChannelStatic.icon} size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{activeDisplayName}</Text>
              {activeDescription && (
                <Text style={{ fontSize: 12, color: colors.textFaint, marginTop: 1 }}>{activeDescription}</Text>
              )}
            </View>
            {isInstructor && (
              <TouchableOpacity
                onPress={() => { setEditName(activeDisplayName); setEditDesc(activeDescription ?? ''); setEditingChannel(true); }}
                style={{ padding: 6 }}
              >
                <Ionicons name="pencil-outline" size={16} color={colors.textFaint} />
              </TouchableOpacity>
            )}
          </View>
        )}

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
              style={{ alignSelf: 'center', marginBottom: 12, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.borderLight, borderRadius: 20 }}
            >
              {loadingMore
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Text style={{ fontSize: 12, color: colors.textMuted }}>Load older messages</Text>
              }
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : messages.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.textFaint, marginTop: 12, fontSize: 14 }}>No messages yet. Say hello!</Text>
            </View>
          ) : (
            grouped.map((row, i) => {
              if (row.kind === 'date') {
                return (
                  <View key={`date-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginHorizontal: 10 }}>{row.date}</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
                  </View>
                );
              }

              const { msg, showHeader } = row;
              const isOwn = msg.senderNetid === myNetid;
              const displayName = msg.senderName || msg.senderNetid;

              return (
                <View
                  key={`msg-${msg.id}`}
                  // @ts-expect-error web-only hover
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    flexDirection: 'row',
                    marginBottom: showHeader ? 6 : 1,
                    paddingTop: showHeader ? 6 : 0,
                    paddingHorizontal: 4,
                    borderRadius: 6,
                    backgroundColor: hoveredId === msg.id ? colors.borderLight : 'transparent',
                  }}
                >
                  <View style={{ width: 40, marginRight: 10, alignItems: 'center', paddingTop: showHeader ? 2 : 0 }}>
                    {showHeader && (
                      <ColorAvatar
                        name={displayName}
                        size={36}
                        status={activityStatuses[msg.senderNetid] ?? 'offline'}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    {showHeader && (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>{displayName}</Text>
                        <Text style={{ fontSize: 11, color: colors.textFaint }}>{formatTime(msg.createdAt)}</Text>
                        {msg.edited && <Text style={{ fontSize: 10, color: colors.textFaint, fontStyle: 'italic' }}>(edited)</Text>}
                        {hoveredId === msg.id && (() => {
                          const st = activityStatuses[msg.senderNetid] ?? 'offline';
                          return (
                            <Text style={{ fontSize: 11, fontWeight: '600', color: st === 'online' ? '#22c55e' : st === 'away' ? '#eab308' : '#94a3b8' }}>
                              {st === 'online' ? 'Online' : st === 'away' ? 'Away' : 'Offline'}
                            </Text>
                          );
                        })()}
                      </View>
                    )}

                    {msg.replyTo && (
                      <View style={{ borderLeftWidth: 3, borderLeftColor: colors.gold, backgroundColor: colors.warningBg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warningText, marginBottom: 1 }}>
                          {msg.replyTo.senderName || msg.replyTo.senderNetid}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={2}>{msg.replyTo.content}</Text>
                      </View>
                    )}

                    <MessageContent
                      content={msg.content}
                      mentionedNetids={msg.mentionedNetids}
                      mentionedRoles={msg.mentionedRoles}
                      myNetid={myNetid}
                      staffMap={staffMap}
                      colors={colors}
                    />
                  </View>

                  {hoveredId === msg.id && (
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingLeft: 8 }}>
                      <TouchableOpacity
                        onPress={() => { setReplyingTo(msg); setEditingMsg(null); inputRef.current?.focus(); }}
                        style={{ padding: 6, backgroundColor: colors.surface, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
                      >
                        <Ionicons name="return-down-back-outline" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                      {isOwn && (
                        <>
                          <TouchableOpacity
                            onPress={() => startEdit(msg)}
                            style={{ padding: 6, backgroundColor: colors.surface, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
                          >
                            <Ionicons name="pencil-outline" size={15} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(msg)}
                            style={{ padding: 6, backgroundColor: colors.criticalBg, borderRadius: 6, borderWidth: 1, borderColor: colors.criticalBorder }}
                          >
                            <Ionicons name="trash-outline" size={15} color={colors.criticalBorder} />
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

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 4, minHeight: 22 }}>
            <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}
            </Text>
          </View>
        )}

        {/* Mention autocomplete — scrollable */}
        {mentionSuggestions.length > 0 && (
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginHorizontal: 12, marginBottom: 4, maxHeight: 220, elevation: 6, shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 6 }}>
            <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled>
              {mentionSuggestions.map((s) => (
                <TouchableOpacity
                  key={`${s.type}-${s.value}`}
                  onPress={() => insertMention(s.value)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                >
                  {s.type === 'role' ? (
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="people" size={15} color={colors.primary} />
                    </View>
                  ) : (
                    <ColorAvatar name={s.displayName} size={30} />
                  )}
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{s.displayName}</Text>
                    {s.type === 'netid' && s.displayName !== s.value && (
                      <Text style={{ fontSize: 11, color: colors.textFaint }}>@{s.value}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reply / edit context bar */}
        {(replyingTo || editingMsg) && (
          <View style={{ backgroundColor: colors.warningBg, borderTopWidth: 1, borderTopColor: colors.gold, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={editingMsg ? 'pencil' : 'return-down-back'} size={14} color={colors.warningText} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.warningText }} numberOfLines={1}>
              {editingMsg
                ? `Editing: ${editingMsg.content}`
                : `Replying to ${replyingTo!.senderName || replyingTo!.senderNetid}: ${replyingTo!.content}`}
            </Text>
            <TouchableOpacity onPress={() => { setReplyingTo(null); setEditingMsg(null); setInputText(''); }}>
              <Ionicons name="close" size={18} color={colors.warningText} />
            </TouchableOpacity>
          </View>
        )}

        {/* Emoji picker panel */}
        {showEmojiPicker && (
          <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 4 }}>
            {/* Category tabs */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingHorizontal: 8 }}>
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <TouchableOpacity
                  key={cat.label}
                  onPress={() => setEmojiCategory(idx)}
                  style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: emojiCategory === idx ? colors.primary : 'transparent' }}
                >
                  <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Emoji grid */}
            <ScrollView horizontal={false} style={{ maxHeight: 150 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 6 }} keyboardShouldPersistTaps="always">
              {EMOJI_CATEGORIES[emojiCategory].emojis.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => insertEmoji(emoji)} style={{ padding: 5 }}>
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Read-only banner for non-Instructors in Announcements */}
        {activeChannel === 'announcements' && !isInstructor ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.warningBg, borderTopWidth: 1, borderTopColor: colors.warningBorder }}>
            <Ionicons name="megaphone-outline" size={16} color={colors.warningText} />
            <Text style={{ fontSize: 13, color: colors.warningText, fontWeight: '500' }}>
              Only Instructors can post in Announcements.
            </Text>
          </View>
        ) : (

        /* Input bar */
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowEmojiPicker(v => !v)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: showEmojiPicker ? colors.borderLight : 'transparent', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}
          >
            <Ionicons name="happy-outline" size={22} color={showEmojiPicker ? colors.textSecondary : colors.textFaint} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder={`Message ${activeDisplayName}... use @ to mention`}
            placeholderTextColor={colors.textFaint}
            multiline
            onKeyPress={(e: any) => {
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{ flex: 1, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.text, backgroundColor: colors.inputBg, maxHeight: 120, minHeight: 40 }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !inputText.trim()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: inputText.trim() ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            {sending
              ? <ActivityIndicator size="small" color={colors.textInverse} />
              : <Ionicons name={editingMsg ? 'checkmark' : 'send'} size={16} color={inputText.trim() ? colors.textInverse : colors.textFaint} />
            }
          </TouchableOpacity>
        </View>
        )}

      </KeyboardAvoidingView>
    </View>
  );
}
