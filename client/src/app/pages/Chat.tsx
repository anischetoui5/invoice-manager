import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  Hash, MessageSquare, Plus, Send, X, Users, AtSign, ChevronDown,
  Lock, Sparkles, ArrowUpRight, Loader2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import type { User, Workspace, ChatConversation, ChatMessage, ChatMember, Subscription } from '../types';
import api from '../../lib/api';

interface OutletContext {
  currentUser: User;
  currentWorkspace: Workspace;
  currentSubscription: Subscription | null;
}

function formatMsgTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'MMM d, HH:mm');
}

function formatDateLabel(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
];
function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ── Upsell screen for plans without chat ────────────────────────────────────
function ChatUpsell({ planName, onNavigate }: { planName: string; onNavigate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center w-full">
      {/* Icon */}
      <div className="relative">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg"
          style={{ background: 'var(--gradient-brand)', boxShadow: '0 8px 32px rgba(88,101,242,0.35)' }}
        >
          <MessageSquare className="h-11 w-11 text-white" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 shadow-md">
          <Lock className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Text */}
      <div className="max-w-sm">
        <h2 className="text-2xl font-bold text-foreground">Team Chat</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Real-time messaging is not available on the{' '}
          <span className="font-semibold text-foreground">{planName}</span> plan.
          Upgrade to unlock instant team communication.
        </p>
      </div>

      {/* Plan comparison */}
      <div className="w-full max-w-sm space-y-3">
        {[
          { plan: 'Business',     badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   desc: 'Team channels for group discussions' },
          { plan: 'Professional', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', desc: 'Channels + Direct Messages' },
          { plan: 'Enterprise',   badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', desc: 'Custom channels + DMs + Director controls' },
        ].map(({ plan, badge, desc }) => (
          <div key={plan} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-left">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge}`}>{plan}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90 active:scale-95"
        style={{ background: 'var(--gradient-brand)', boxShadow: '0 4px 16px rgba(88,101,242,0.4)' }}
      >
        View Plans <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Chat() {
  const { currentUser, currentWorkspace, currentSubscription } = useOutletContext<OutletContext>();
  const navigate = useNavigate();

  const isDirector = currentWorkspace?.role === 'Director';
  const hasChat           = currentSubscription?.has_chat ?? false;
  const hasDM             = currentSubscription?.has_dm ?? false;
  const canCreateChannels = currentSubscription?.can_create_channels ?? false;
  // Enterprise: Director-only channel creation; Pro: all directors can
  const showCreateChannel = canCreateChannels && isDirector;

  const socketRef       = useRef<Socket | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const typingTimers    = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const autoScrollRef   = useRef(true);

  const [conversations, setConversations]   = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [input, setInput]                   = useState('');
  const [loadingConvs, setLoadingConvs]     = useState(true);
  const [loadingMsgs, setLoadingMsgs]       = useState(false);
  const [typingUsers, setTypingUsers]       = useState<Record<string, string>>({});
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewDM, setShowNewDM]           = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [members, setMembers]               = useState<ChatMember[]>([]);
  const [dmSearch, setDmSearch]             = useState('');

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasChat) return;
    const token = localStorage.getItem('token');
    const socket = io(`http://${window.location.hostname}:3000`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.emit('join:workspace', currentWorkspace.id);

    socket.on('message:new', (msg: ChatMessage) => {
      autoScrollRef.current = true;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === msg.conversation_id
          ? {
              ...c,
              last_msg_content: msg.content,
              last_msg_at: msg.created_at,
              last_msg_sender_name: msg.sender_name,
              unread_count: selectedId === c.id ? 0 : (c.unread_count || 0) + 1,
            }
          : c
      ));
    });

    socket.on('typing', ({ user_id, user_name, typing }: { user_id: string; user_name: string; conversation_id: string; typing: boolean }) => {
      if (user_id === currentUser.id) return;
      if (typing) {
        setTypingUsers(prev => ({ ...prev, [user_id]: user_name }));
        if (typingTimers.current[user_id]) clearTimeout(typingTimers.current[user_id]);
        typingTimers.current[user_id] = setTimeout(() => {
          setTypingUsers(prev => { const n = { ...prev }; delete n[user_id]; return n; });
        }, 3000);
      } else {
        setTypingUsers(prev => { const n = { ...prev }; delete n[user_id]; return n; });
      }
    });

    return () => { socket.disconnect(); };
  }, [currentWorkspace.id, currentUser.id, hasChat]);

  // ── Load conversations ───────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!hasChat) { setLoadingConvs(false); return; }
    try {
      const { data } = await api.get(`/workspaces/${currentWorkspace.id}/chat/conversations`);
      setConversations(data.conversations);
      if (data.conversations.length > 0 && !selectedId) {
        setSelectedId(data.conversations[0].id);
      }
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [currentWorkspace.id, hasChat]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages on conversation change ────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    socketRef.current?.emit('join:conversation', selectedId);
    api.post(`/workspaces/${currentWorkspace.id}/chat/conversations/${selectedId}/read`).catch(() => {});
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c));
    autoScrollRef.current = true;
    setLoadingMsgs(true);
    setMessages([]);
    setHasMore(false);
    api.get(`/workspaces/${currentWorkspace.id}/chat/conversations/${selectedId}/messages`, { params: { limit: 50 } })
      .then(({ data }) => {
        setMessages(data.messages);
        setHasMore(data.messages.length === 50);
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false));
  }, [selectedId, currentWorkspace.id]);

  // ── Load more (older) ────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (!selectedId || loadingMore || !hasMore || messages.length === 0) return;
    const before = messages[0].created_at;
    const area = messagesAreaRef.current;
    const prevScrollHeight = area?.scrollHeight ?? 0;
    setLoadingMore(true);
    try {
      const { data } = await api.get(
        `/workspaces/${currentWorkspace.id}/chat/conversations/${selectedId}/messages`,
        { params: { limit: 50, before } }
      );
      const older: ChatMessage[] = data.messages;
      setHasMore(older.length === 50);
      autoScrollRef.current = false;
      setMessages(prev => [...older, ...prev]);
      requestAnimationFrame(() => {
        if (area) area.scrollTop = area.scrollHeight - prevScrollHeight;
      });
    } catch {
      toast.error('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const sendMessage = () => {
    const content = input.trim();
    if (!content || !selectedId || !socketRef.current) return;
    socketRef.current.emit('message:send', { conversation_id: selectedId, content });
    socketRef.current.emit('typing:stop', { conversation_id: selectedId });
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!selectedId || !socketRef.current) return;
    socketRef.current.emit('typing:start', { conversation_id: selectedId });
    if (typingTimers.current['self']) clearTimeout(typingTimers.current['self']);
    typingTimers.current['self'] = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { conversation_id: selectedId });
    }, 2000);
  };

  // ── Create channel ────────────────────────────────────────────────────────────
  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const { data } = await api.post(`/workspaces/${currentWorkspace.id}/chat/conversations`, {
        type: 'channel', name: newChannelName.trim(),
      });
      await loadConversations();
      setSelectedId(data.conversation.id);
      setShowNewChannel(false);
      setNewChannelName('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to create channel');
    }
  };

  // ── Create DM ─────────────────────────────────────────────────────────────────
  const loadMembers = async () => {
    try {
      const { data } = await api.get(`/workspaces/${currentWorkspace.id}/chat/members`);
      setMembers(data.members);
    } catch { toast.error('Failed to load members'); }
  };

  const openNewDM = async () => {
    await loadMembers();
    setDmSearch('');
    setShowNewDM(true);
  };

  const createDM = async (userId: string) => {
    try {
      const { data } = await api.post(`/workspaces/${currentWorkspace.id}/chat/conversations`, {
        type: 'direct', user_id: userId,
      });
      await loadConversations();
      setSelectedId(data.conversation.id);
      setShowNewDM(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Failed to start conversation');
    }
  };

  const channels = conversations.filter(c => c.type === 'channel');
  const dms      = conversations.filter(c => c.type === 'direct');

  type Group = { date: string; messages: ChatMessage[] };
  const groups = messages.reduce<Group[]>((acc, msg) => {
    const label = formatDateLabel(msg.created_at);
    const last  = acc[acc.length - 1];
    if (last && last.date === label) last.messages.push(msg);
    else acc.push({ date: label, messages: [msg] });
    return acc;
  }, []);

  const typingList  = Object.values(typingUsers);
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // ── Upsell for Starter / personal ───────────────────────────────────────────
  if (!hasChat) {
    return (
      <div className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card" style={{ height: 'calc(100dvh - 11rem)' }}>
        <ChatUpsell
          planName={currentSubscription?.plan ?? (currentWorkspace?.type === 'personal' ? 'Personal' : 'Starter')}
          onNavigate={() => navigate('/dashboard/subscription')}
        />
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden rounded-xl border border-border bg-card shadow-sm" style={{ height: 'calc(100dvh - 11rem)' }}>

      {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/20">

        {/* Workspace header */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-white">
            {getInitials(currentWorkspace?.name ?? 'W')}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{currentWorkspace?.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {currentSubscription?.plan ?? 'Team'} · {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">

          {/* Channels */}
          <div className="px-2">
            <div className="mb-1 flex items-center justify-between px-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Channels</span>
              {showCreateChannel && (
                <button
                  onClick={() => setShowNewChannel(true)}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="New channel"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {loadingConvs ? (
              <div className="space-y-1 px-2">
                {[1, 2, 3].map(i => <div key={i} className="h-7 rounded-md bg-muted animate-pulse" />)}
              </div>
            ) : channels.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`group w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all ${
                  selectedId === c.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="flex-1 truncate text-left">{c.name}</span>
                {(c.unread_count ?? 0) > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {(c.unread_count ?? 0) > 99 ? '99+' : c.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Direct Messages — only if plan supports it */}
          {hasDM && (
            <div className="px-2">
              <div className="mb-1 flex items-center justify-between px-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Direct Messages</span>
                <button
                  onClick={openNewDM}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="New DM"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {dms.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">No direct messages yet</p>
              ) : dms.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all ${
                    selectedId === c.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarColor(c.dm_user_name ?? 'U')}`}>
                    {getInitials(c.dm_user_name ?? 'U')}
                  </div>
                  <span className="flex-1 truncate text-left">{c.dm_user_name ?? 'Unknown'}</span>
                  {(c.unread_count ?? 0) > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {c.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Upgrade hint for Business (channels-only) */}
          {!hasDM && (
            <div className="mx-2 rounded-lg border border-border bg-background p-3">
              <p className="text-[11px] font-medium text-foreground">Unlock Direct Messages</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Upgrade to Professional or Enterprise.</p>
              <button
                onClick={() => navigate('/dashboard/subscription')}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                View plans <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MAIN PANEL ════════════════════════════════════════════════════════ */}
      {!selectedConv ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-w-0">

          {/* Conversation header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3 bg-card/50 backdrop-blur-sm">
            {selectedConv.type === 'channel' ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground leading-tight">{selectedConv.name}</p>
                  <p className="text-[11px] text-muted-foreground">Channel</p>
                </div>
              </>
            ) : (
              <>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(selectedConv.dm_user_name ?? 'U')}`}>
                  {getInitials(selectedConv.dm_user_name ?? 'U')}
                </div>
                <div>
                  <p className="font-semibold text-foreground leading-tight">{selectedConv.dm_user_name ?? 'Unknown'}</p>
                  <p className="text-[11px] text-muted-foreground">Direct Message</p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesAreaRef} className="flex-1 overflow-y-auto px-5 py-4">
            {loadingMsgs ? (
              <div className="space-y-5 pt-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-24 rounded-full bg-muted animate-pulse" />
                      <div className={`h-4 rounded-full bg-muted animate-pulse`} style={{ width: `${40 + (i * 13) % 40}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  {selectedConv.type === 'channel'
                    ? <Hash className="h-8 w-8 text-muted-foreground/40" />
                    : <AtSign className="h-8 w-8 text-muted-foreground/40" />}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedConv.type === 'channel' ? `Welcome to #${selectedConv.name}!` : `Start chatting with ${selectedConv.dm_user_name}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  This is the very beginning of this {selectedConv.type === 'channel' ? 'channel' : 'conversation'}.
                </p>
              </div>
            ) : (
              <>
                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pb-4">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {loadingMore
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Loading…</>
                        : <><ChevronDown className="h-3 w-3 rotate-180" /> Load older messages</>}
                    </button>
                  </div>
                )}

                {/* Message groups */}
                {groups.map(group => (
                  <div key={group.date} className="mb-4">
                    {/* Date separator */}
                    <div className="my-5 flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="rounded-full border border-border bg-background px-3 py-0.5 text-[11px] font-medium text-muted-foreground">{group.date}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-0.5">
                      {group.messages.map((msg, idx) => {
                        const prevMsg   = idx > 0 ? group.messages[idx - 1] : null;
                        const isChained = prevMsg?.sender_id === msg.sender_id;
                        const isMe      = msg.sender_id === currentUser.id;

                        return (
                          <div
                            key={msg.id}
                            className={`group flex gap-3 px-1 py-0.5 rounded-lg transition-colors hover:bg-muted/30 ${isChained ? 'mt-0' : 'mt-3'} ${isMe ? 'flex-row-reverse' : ''}`}
                          >
                            {/* Avatar */}
                            <div className={`shrink-0 mt-0.5 ${isChained ? 'w-8' : ''}`}>
                              {!isChained && (
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(msg.sender_name)}`}>
                                  {getInitials(msg.sender_name)}
                                </div>
                              )}
                            </div>

                            <div className={`flex max-w-[72%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {!isChained && (
                                <div className={`mb-1 flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-xs font-semibold text-foreground">{isMe ? 'You' : msg.sender_name}</span>
                                  <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                    {formatMsgTime(msg.created_at)}
                                  </span>
                                </div>
                              )}
                              <div className={`relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                                isMe
                                  ? 'rounded-tr-sm bg-primary text-white'
                                  : 'rounded-tl-sm bg-muted text-foreground'
                              }`}>
                                {msg.content}
                                {isChained && (
                                  <span className="absolute -bottom-4 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap"
                                    style={{ [isMe ? 'right' : 'left']: 0 }}>
                                    {formatMsgTime(msg.created_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {typingList.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 px-1">
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {typingList.length === 1 ? `${typingList[0]} is typing…` : `${typingList.join(', ')} are typing…`}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Compose */}
          <div className="shrink-0 border-t border-border px-4 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedConv.type === 'channel'
                    ? `Message #${selectedConv.name}`
                    : `Message ${selectedConv.dm_user_name ?? 'user'}`
                }
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none max-h-32"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-all disabled:opacity-30 hover:opacity-90 hover:scale-105 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* ═══ NEW CHANNEL MODAL ══════════════════════════════════════════════════ */}
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Create Channel</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Add a new channel to your workspace</p>
              </div>
              <button
                onClick={() => { setShowNewChannel(false); setNewChannelName(''); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channel name</label>
            <div className="mt-1.5 flex items-center rounded-xl border border-border bg-muted/30 px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Hash className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createChannel()}
                placeholder="e.g. invoices, finance"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Lowercase letters, numbers, hyphens only.</p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setShowNewChannel(false); setNewChannelName(''); }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEW DM MODAL ═══════════════════════════════════════════════════════ */}
      {showNewDM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">New Direct Message</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Start a private conversation</p>
              </div>
              <button
                onClick={() => setShowNewDM(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center rounded-xl border border-border bg-muted/30 px-3 py-2.5 mb-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                placeholder="Search team members…"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-0.5 rounded-xl">
              {members
                .filter(m =>
                  m.name.toLowerCase().includes(dmSearch.toLowerCase()) ||
                  m.email.toLowerCase().includes(dmSearch.toLowerCase())
                )
                .map(m => (
                  <button
                    key={m.id}
                    onClick={() => createDM(m.id)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(m.name)}`}>
                      {getInitials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{m.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{m.role} · {m.email}</p>
                    </div>
                  </button>
                ))}
              {members.filter(m => m.name.toLowerCase().includes(dmSearch.toLowerCase())).length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
