import { useState, useEffect } from 'react';
import { Zap, LayoutDashboard, Sparkles, Check } from 'lucide-react';
import type { AppMode } from '../../lib/workspaceConfig';

const CSS = `
  @keyframes orb1  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.1)} }
  @keyframes orb2  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,30px) scale(1.08)} }
  @keyframes msFadeIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes msCardA { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
  @keyframes msCardB { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
  @keyframes msExit  { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(1.04)} }
  @keyframes msSelectPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.6)} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0)} }
  .ms-screen      { animation: none; }
  .ms-screen.exit { animation: msExit 0.38s ease forwards; }
  .ms-header      { animation: msFadeIn 0.55s ease both; }
  .ms-card-a      { animation: msCardA 0.55s ease 0.18s both; }
  .ms-card-b      { animation: msCardB 0.55s ease 0.30s both; }
  .ms-card-a.selected, .ms-card-b.selected { animation: msSelectPulse 0.7s ease; }
  .ms-footer      { animation: msFadeIn 0.5s ease 0.55s both; }
  .ms-card        { transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease, border-color 0.22s ease; }
  .ms-card:hover:not(:disabled)  { transform: translateY(-7px); }
  .ms-feat        { display:flex; align-items:center; gap:8px; }
`;

const BASIC_FEATS  = ['Default clean layout', 'All core features', 'Fast & familiar'];
const CUSTOM_FEATS = [
  'Sidebar position & drag reorder',
  'Draggable AI assistant',
  'Dashboard section reordering',
  'Persistent workspace config',
];

export function ModeSelect({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  const [selected, setSelected] = useState<AppMode | null>(null);
  const [exiting,  setExiting]  = useState(false);

  const handle = (mode: AppMode) => {
    if (selected) return;
    setSelected(mode);
    setTimeout(() => setExiting(true), 650);
    setTimeout(() => onSelect(mode), 1000);
  };

  // suppress body scroll during splash
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div
        className={`ms-screen${exiting ? ' exit' : ''}`}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(ellipse at 35% 45%, #1a1040 0%, #0c0820 55%, #07050f 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', overflow: 'hidden',
        }}
      >
        {/* Background orbs */}
        <div style={{
          position:'absolute',top:'18%',left:'12%',width:'340px',height:'340px',
          borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,.18),transparent 68%)',
          filter:'blur(48px)',animation:'orb1 7s ease-in-out infinite',pointerEvents:'none',
        }} />
        <div style={{
          position:'absolute',bottom:'15%',right:'10%',width:'280px',height:'280px',
          borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.15),transparent 68%)',
          filter:'blur(48px)',animation:'orb2 9s ease-in-out infinite',pointerEvents:'none',
        }} />

        {/* Header */}
        <div className="ms-header" style={{ textAlign:'center', marginBottom:'52px' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'22px' }}>
            <div style={{
              width:'48px',height:'48px',borderRadius:'14px',
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 10px 36px rgba(99,102,241,.55)',
            }}>
              <Zap size={24} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize:'26px',fontWeight:800,color:'white',letterSpacing:'-0.5px' }}>EasyFact</span>
          </div>
          <h1 style={{ fontSize:'clamp(28px,5vw,44px)',fontWeight:700,color:'white',marginBottom:'12px',letterSpacing:'-1px',lineHeight:1.1 }}>
            Choose your experience
          </h1>
          <p style={{ color:'rgba(255,255,255,.45)',fontSize:'16px' }}>
            Select how you'd like to use EasyFact today
          </p>
        </div>

        {/* Cards */}
        <div style={{ display:'flex',gap:'20px',flexWrap:'wrap',justifyContent:'center',width:'100%',maxWidth:'680px' }}>

          {/* ── Basic ── */}
          <button
            className={`ms-card ms-card-a${selected === 'basic' ? ' selected' : ''}`}
            onClick={() => handle('basic')}
            disabled={!!selected}
            style={{
              flex:'1 1 280px',maxWidth:'320px',padding:'32px 26px',
              borderRadius:'20px',cursor: selected ? 'default' : 'pointer',
              textAlign:'left',border:'2px solid',backdropFilter:'blur(20px)',
              background: selected === 'basic'
                ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.07)',
              borderColor: selected === 'basic'
                ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.12)',
              outline:'none',
            }}
          >
            <div style={{
              width:'50px',height:'50px',borderRadius:'14px',
              background:'rgba(255,255,255,.1)',
              display:'flex',alignItems:'center',justifyContent:'center',
              marginBottom:'18px',
            }}>
              {selected === 'basic'
                ? <Check size={24} color="white" strokeWidth={2.5} />
                : <LayoutDashboard size={24} color="rgba(255,255,255,.8)" />}
            </div>
            <h3 style={{ color:'white',fontSize:'20px',fontWeight:700,marginBottom:'8px' }}>Basic Mode</h3>
            <p style={{ color:'rgba(255,255,255,.5)',fontSize:'13.5px',lineHeight:'1.6',marginBottom:'22px' }}>
              Clean, focused experience. Jump straight into managing your invoices.
            </p>
            <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
              {BASIC_FEATS.map(f => (
                <div key={f} className="ms-feat">
                  <div style={{ width:'5px',height:'5px',borderRadius:'50%',background:'rgba(255,255,255,.35)',flexShrink:0 }} />
                  <span style={{ color:'rgba(255,255,255,.55)',fontSize:'13px' }}>{f}</span>
                </div>
              ))}
            </div>
          </button>

          {/* ── Custom ── */}
          <button
            className={`ms-card ms-card-b${selected === 'custom' ? ' selected' : ''}`}
            onClick={() => handle('custom')}
            disabled={!!selected}
            style={{
              flex:'1 1 280px',maxWidth:'320px',padding:'32px 26px',
              borderRadius:'20px',cursor: selected ? 'default' : 'pointer',
              textAlign:'left',border:'2px solid',backdropFilter:'blur(20px)',
              background: selected === 'custom'
                ? 'linear-gradient(135deg,rgba(99,102,241,.55),rgba(139,92,246,.55))'
                : 'linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.18))',
              borderColor: selected === 'custom'
                ? 'rgba(99,102,241,.9)' : 'rgba(99,102,241,.35)',
              outline:'none',
              boxShadow: selected === 'custom'
                ? '0 0 40px rgba(99,102,241,.45)' : 'none',
            }}
          >
            <div style={{
              width:'50px',height:'50px',borderRadius:'14px',
              background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display:'flex',alignItems:'center',justifyContent:'center',
              marginBottom:'18px',
              boxShadow:'0 8px 24px rgba(99,102,241,.45)',
            }}>
              {selected === 'custom'
                ? <Check size={24} color="white" strokeWidth={2.5} />
                : <Sparkles size={24} color="white" />}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px' }}>
              <h3 style={{ color:'white',fontSize:'20px',fontWeight:700 }}>Custom Mode</h3>
              <span style={{
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color:'white',fontSize:'9px',fontWeight:700,
                padding:'2px 7px',borderRadius:'20px',letterSpacing:'0.6px',
              }}>NEW</span>
            </div>
            <p style={{ color:'rgba(255,255,255,.65)',fontSize:'13.5px',lineHeight:'1.6',marginBottom:'22px' }}>
              Fully personalized workspace. Arrange every element your way.
            </p>
            <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
              {CUSTOM_FEATS.map(f => (
                <div key={f} className="ms-feat">
                  <div style={{ width:'5px',height:'5px',borderRadius:'50%',background:'#a78bfa',flexShrink:0 }} />
                  <span style={{ color:'rgba(255,255,255,.72)',fontSize:'13px' }}>{f}</span>
                </div>
              ))}
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="ms-footer" style={{
          position:'absolute',bottom:'28px',
          color:'rgba(255,255,255,.25)',fontSize:'12.5px',
        }}>
          You can switch modes anytime from the customization panel
        </p>
      </div>
    </>
  );
}
