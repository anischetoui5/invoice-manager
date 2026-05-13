import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, ChevronDown } from 'lucide-react';
import api from '../../lib/api';
import { useWorkspaceConfig } from '../context/WorkspaceConfigContext';

const BTN_SIZE = 56;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Show me pending invoices',
  'What is my total this month?',
  'Who is my biggest vendor?',
  'How many invoices were approved?',
  'Résume mes factures récentes',
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function AiChat({ workspaceId }: { workspaceId: string }) {
  const { config, setAiPosition } = useWorkspaceConfig();
  const isCustom = config.mode === 'custom';

  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);

  // Draggable position — null means use CSS default (bottom-right)
  const defaultPos = () => ({
    x: window.innerWidth  - BTN_SIZE - 16,
    y: window.innerHeight - BTN_SIZE - 76,
  });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    isCustom ? (config.aiPosition ?? null) : null
  );

  const dragging   = useRef(false);
  const hasMoved   = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const btnRef     = useRef<HTMLButtonElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Sync position from config when mode changes to custom
  useEffect(() => {
    if (isCustom && config.aiPosition && !pos) {
      setPos(config.aiPosition);
    }
    if (!isCustom) setPos(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustom]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    hasMoved.current = true;
    setPos({
      x: clamp(e.clientX - dragOffset.current.x, 0, window.innerWidth  - BTN_SIZE),
      y: clamp(e.clientY - dragOffset.current.y, 0, window.innerHeight - BTN_SIZE),
    });
  }, []);

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.userSelect = '';
    setPos(prev => {
      if (prev) setAiPosition(prev);
      return prev;
    });
  }, [setAiPosition]);

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const handleBtnMouseDown = (e: React.MouseEvent) => {
    if (!isCustom) return;
    hasMoved.current = false;
    dragging.current = true;
    document.body.style.userSelect = 'none';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  };

  const handleBtnClick = () => {
    if (hasMoved.current) return; // was a drag, not a click
    setOpen(o => !o);
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post(`/workspaces/${workspaceId}/ai/chat`, {
        messages: newMessages,
      });
      setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, I could not reach the AI service. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Floating button — draggable in custom mode */}
      <button
        ref={btnRef}
        onMouseDown={handleBtnMouseDown}
        onClick={handleBtnClick}
        style={{
          position: 'fixed',
          ...(pos
            ? { left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }
            : { bottom: 'calc(env(safe-area-inset-bottom) + 76px)', right: '16px' }
          ),
          width: `${BTN_SIZE}px`,
          height: `${BTN_SIZE}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: isCustom ? '2px dashed rgba(255,255,255,0.4)' : 'none',
          cursor: isCustom ? 'grab' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
          zIndex: 1000,
          transition: 'box-shadow 0.2s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(99,102,241,0.65)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(99,102,241,0.45)'; }}
        title={isCustom ? 'Drag to move · Click to open' : 'AI Assistant'}
      >
        {open ? <ChevronDown size={22} color="white" /> : <Sparkles size={22} color="white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          background: 'white',
          borderRadius: 0,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.06)',
          animation: 'aiSlideUp 0.25s ease',
        }}
          className="md:!inset-auto md:!bottom-[96px] md:!right-7 md:!left-auto md:!top-auto md:!w-[380px] md:!h-[520px] md:!rounded-[20px]"
        >
          <style>{`
            @keyframes aiSlideUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes aiDot {
              0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
            .ai-msg-user { animation: aiSlideUp 0.2s ease; }
            .ai-msg-bot  { animation: aiSlideUp 0.2s ease; }
            .ai-input:focus { outline: none; }
            .ai-suggest:hover { background: #ede9fe !important; color: #6366f1 !important; }
          `}</style>

          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '700', fontSize: '14px', lineHeight: 1 }}>EASYfact AI</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '2px' }}>Powered by Claude</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
              width: '28px', height: '28px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <X size={15} color="white" />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {isEmpty && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '0 0 8px' }}>
                  Ask me anything about your invoices
                </p>
                {SUGGESTIONS.map(s => (
                  <button key={s} className="ai-suggest" onClick={() => send(s)} style={{
                    background: '#f5f3ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '10px',
                    padding: '9px 14px',
                    fontSize: '13px',
                    color: '#7c3aed',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                    fontFamily: 'inherit',
                  }}>{s}</button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : '#f8fafc',
                  color: m.role === 'user' ? 'white' : '#1e293b',
                  fontSize: '13.5px',
                  lineHeight: '1.55',
                  border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px 16px 16px 4px',
                  display: 'flex', gap: '5px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: '#8b5cf6',
                      animation: `aiDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              className="ai-input"
              type="text"
              placeholder="Ask about your invoices..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '13.5px',
                fontFamily: 'inherit',
                background: '#f8fafc',
                color: '#1e293b',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#8b5cf6')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: '38px', height: '38px',
                borderRadius: '12px',
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : '#e2e8f0',
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <Send size={15} color={input.trim() && !loading ? 'white' : '#94a3b8'} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
