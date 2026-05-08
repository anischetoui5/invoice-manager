import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  Hash, MessageSquare, Plus, Send, X, Users, AtSign, ChevronDown,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import type { User, Workspace, ChatConversation, ChatMessage, ChatMember } from '../types';
import api from '../../lib/api';

interface OutletContext {
  currentUser: User;
  currentWorkspace: Workspace;
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
  'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
];
function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function Chat() {
  const { currentUser, currentWorkspace } = useOutletContext<OutletContext>();

  const socketRef      = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const typingTimers   = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [conversations, setConversations]   = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
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

  // ── Socket setup ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(`http://${window.location.hostname}:3000`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.emit('join:workspace', currentWorkspace.id);

    socket.on('message:new', (msg: ChatMessage) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);

      setConversations(prev => prev.map(c =>
        c.id === msg.conversation_id
          ? {
              ...c,
              last_msg_content: msg.content,
              last_msg_at: msg.created_at,
              last_msg_sender_name: msg.sender_name,
              unread_count: selectedId === c.id ? 0 : c.unread_count + 1,
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
  }, [currentWorkspace.id, currentUser.id]);

  // ── Load conversations ──
  const loadConversations = useCallback(async () => {
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
  }, [currentWorkspace.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages on conversation change ──
  useEffect(() => {
    if (!selectedId) return;

    socketRef.current?.emit('join:conversation', selectedId);

    api.post(`/workspaces/${currentWorkspace.id}/chat/conversations/${selectedId}/read`).catch(() => {});
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c));

    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/workspaces/${currentWorkspace.id}/chat/conversations/${selectedId}/messages`)
      .then(({ data }) => setMessages(data.messages))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false));
  }, [selectedId, currentWorkspace.id]);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──
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

  // ── Create channel ──
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

  // ── Create DM ──
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
    } catch { toast.error('Failed to start conversation'); }
  };

  const channels = conversations.filter(c => c.type === 'channel');
  const dms      = conversations.filter(c => c.type === 'direct');

  // ── Group messages by date ──
  type Group = { date: string; messages: ChatMessage[] };
  const groups = messages.reduce<Group[]>((acc, msg) => {
    const label = formatDateLabel(msg.created_at);
    const last  = acc[acc.length - 1];
    if (last && last.date === label) last.messages.push(msg);
    else acc.push({ date: label, messages: [msg] });
    return acc;
  }, []);

  const typingList = Object.values(typingUsers);
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="h-full flex overflow-hidden rounded-xl border border-border bg-card">

      {/* ═══ LEFT PANEL ═══ */}
      <div className="w-60 shrink-0 flex flex-col border-r border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Chat</span>
            {totalUnread > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Channels */}
          <div className="px-3 mb-1">
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Channels</span>
              <button
                onClick={() => setShowNewChannel(true)}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="New channel"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingConvs ? (
              <div className="space-y-1">
                {[1,2].map(i => <div key={i} className="h-7 rounded animate-pulse bg-muted" />)}
              </div>
            ) : channels.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  selectedId === c.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1 text-left">{c.name}</span>
                {c.unread_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Direct messages */}
          <div className="px-3 mt-3">
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Direct Messages</span>
              <button
                onClick={openNewDM}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="New DM"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {dms.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1">No direct messages yet</p>
            ) : dms.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  selectedId === c.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarColor(c.dm_user_name ?? 'U')}`}>
                  {getInitials(c.dm_user_name ?? 'U')}
                </div>
                <span className="truncate flex-1 text-left">{c.dm_user_name ?? 'Unknown'}</span>
                {c.unread_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {c.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      {!selectedConv ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
            {selectedConv.type === 'channel' ? (
              <>
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{selectedConv.name}</span>
              </>
            ) : (
              <>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(selectedConv.dm_user_name ?? 'U')}`}>
                  {getInitials(selectedConv.dm_user_name ?? 'U')}
                </div>
                <span className="font-semibold text-foreground">{selectedConv.dm_user_name ?? 'Unknown'}</span>
              </>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {loadingMsgs ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                      <div className="h-4 w-64 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                {selectedConv.type === 'channel' ? (
                  <Hash className="h-10 w-10 text-muted-foreground/30" />
                ) : (
                  <AtSign className="h-10 w-10 text-muted-foreground/30" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {selectedConv.type === 'channel'
                    ? `Welcome to #${selectedConv.name}!`
                    : `Start a conversation with ${selectedConv.dm_user_name}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  This is the beginning of this {selectedConv.type === 'channel' ? 'channel' : 'conversation'}.
                </p>
              </div>
            ) : (
              <>
                {groups.map(group => (
                  <div key={group.date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground shrink-0">{group.date}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="space-y-1">
                      {group.messages.map((msg, idx) => {
                        const prevMsg   = idx > 0 ? group.messages[idx - 1] : null;
                        const isChained = prevMsg?.sender_id === msg.sender_id;
                        const isMe      = msg.sender_id === currentUser.id;

                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-3 group ${isChained ? 'mt-0.5' : 'mt-3'} ${isMe ? 'flex-row-reverse' : ''}`}
                          >
                            {/* Avatar */}
                            <div className={`shrink-0 ${isChained ? 'invisible' : ''}`}>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(msg.sender_name)}`}>
                                {getInitials(msg.sender_name)}
                              </div>
                            </div>

                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : ''}`}>
                              {!isChained && (
                                <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-xs font-semibold text-foreground">{isMe ? 'You' : msg.sender_name}</span>
                                  <span className="text-[10px] text-muted-foreground">{formatMsgTime(msg.created_at)}</span>
                                </div>
                              )}
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                  isMe
                                    ? 'rounded-tr-sm bg-primary text-white'
                                    : 'rounded-tl-sm bg-muted text-foreground'
                                }`}
                              >
                                {msg.content}
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <div className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                    <span>
                      {typingList.length === 1
                        ? `${typingList[0]} is typing…`
                        : `${typingList.join(', ')} are typing…`}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Compose box */}
          <div className="shrink-0 px-5 py-3 border-t border-border">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-opacity disabled:opacity-30 hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}

      {/* ═══ NEW CHANNEL MODAL ═══ */}
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Create Channel</h3>
              <button onClick={() => { setShowNewChannel(false); setNewChannelName(''); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="text-xs font-medium text-muted-foreground">Channel name</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Hash className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
              <input
                autoFocus
                type="text"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createChannel()}
                placeholder="e.g. invoices"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Lowercase letters, numbers, hyphens only.</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setShowNewChannel(false); setNewChannelName(''); }}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEW DM MODAL ═══ */}
      {showNewDM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">New Direct Message</h3>
              <button onClick={() => setShowNewDM(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 mb-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Users className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
              <input
                autoFocus
                type="text"
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                placeholder="Search team members…"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {members
                .filter(m => m.name.toLowerCase().includes(dmSearch.toLowerCase()) || m.email.toLowerCase().includes(dmSearch.toLowerCase()))
                .map(m => (
                  <button
                    key={m.id}
                    onClick={() => createDM(m.id)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(m.name)}`}>
                      {getInitials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{m.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{m.role}</p>
                    </div>
                  </button>
                ))}
              {members.filter(m => m.name.toLowerCase().includes(dmSearch.toLowerCase())).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No members found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
