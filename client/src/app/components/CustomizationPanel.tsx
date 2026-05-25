import { useState } from 'react';
import { Settings2, X, RotateCcw, PanelLeft, PanelRight, PanelTop, PanelBottom, GripHorizontal } from 'lucide-react';
import { useWorkspaceConfig } from '../context/WorkspaceConfigContext';
import type { SidebarPosition } from '../../lib/workspaceConfig';

const PANEL_CSS = `
  @keyframes cpSlideUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cpBtnSpin   { from{transform:rotate(0deg)} to{transform:rotate(180deg)} }
  @keyframes cpBtnSpinR  { from{transform:rotate(180deg)} to{transform:rotate(0deg)} }
  .cp-panel { animation: cpSlideUp 0.2s ease; }
  .cp-btn-open  { animation: cpBtnSpin  0.25s ease forwards; }
  .cp-btn-close { animation: cpBtnSpinR 0.25s ease forwards; }
`;

const POSITIONS: { pos: SidebarPosition; icon: React.ElementType; label: string }[] = [
  { pos: 'left',   icon: PanelLeft,   label: 'Left'   },
  { pos: 'right',  icon: PanelRight,  label: 'Right'  },
  { pos: 'top',    icon: PanelTop,    label: 'Top'    },
  { pos: 'bottom', icon: PanelBottom, label: 'Bottom' },
];

export function CustomizationPanel() {
  const { config, isEditingLayout, setSidebarPosition, setEditingLayout, resetLayout, setMode } = useWorkspaceConfig();
  const [open, setOpen] = useState(false);

  if (config.mode !== 'custom') return null;

  return (
    <>
      <style>{PANEL_CSS}</style>
      <div className="hidden md:block" style={{ position:'fixed', bottom:'24px', left:'24px', zIndex:9990 }}>

        {/* ── Dropdown panel ── */}
        {open && (
          <div
            className="cp-panel"
            style={{
              position:'absolute', bottom:'60px', left:0,
              width:'252px', borderRadius:'16px',
              background:'var(--card)', border:'1px solid var(--border)',
              boxShadow:'0 20px 60px rgba(0,0,0,.22)',
              padding:'16px', userSelect:'none',
            }}
          >
            {/* Header */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
              <div style={{ display:'flex',alignItems:'center',gap:'7px' }}>
                <GripHorizontal size={14} style={{ color:'var(--muted-foreground)' }} />
                <span style={{ fontWeight:600,fontSize:'13.5px',color:'var(--foreground)' }}>Customize Layout</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background:'none',border:'none',cursor:'pointer',color:'var(--muted-foreground)',padding:'2px',display:'flex' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Sidebar position */}
            <p style={{ fontSize:'10px',fontWeight:600,color:'var(--muted-foreground)',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'8px' }}>
              Sidebar Position
            </p>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'14px' }}>
              {POSITIONS.map(({ pos, icon: Icon, label }) => {
                const active = config.sidebarPosition === pos;
                return (
                  <button
                    key={pos}
                    onClick={() => setSidebarPosition(pos)}
                    style={{
                      padding:'8px 6px', borderRadius:'9px', fontSize:'12px',
                      border:`1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      background: active ? 'var(--primary)' : 'var(--muted)',
                      color: active ? 'white' : 'var(--foreground)',
                      cursor:'pointer', fontWeight:500,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',
                      transition:'all 0.15s ease',
                    }}
                  >
                    <Icon size={13} /> {label}
                  </button>
                );
              })}
            </div>

            <div style={{ height:'1px',background:'var(--border)',margin:'0 0 12px' }} />

            {/* Edit layout toggle */}
            <button
              onClick={() => setEditingLayout(!isEditingLayout)}
              style={{
                width:'100%',padding:'8px 12px',borderRadius:'9px',marginBottom:'7px',
                background: isEditingLayout ? 'var(--primary)' : 'var(--muted)',
                color: isEditingLayout ? 'white' : 'var(--foreground)',
                border:'none',cursor:'pointer',fontSize:'12.5px',fontWeight:500,
                display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',
                transition:'all 0.15s ease',
              }}
            >
              {isEditingLayout ? '🔒 Lock Layout' : '✏️ Edit Layout'}
            </button>

            {/* Reset */}
            <button
              onClick={() => { resetLayout(); setOpen(false); }}
              style={{
                width:'100%',padding:'8px 12px',borderRadius:'9px',marginBottom:'7px',
                background:'transparent',color:'var(--muted-foreground)',
                border:'1px solid var(--border)',cursor:'pointer',fontSize:'12.5px',
                display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',
                transition:'all 0.15s ease',
              }}
            >
              <RotateCcw size={12} /> Reset Layout
            </button>

            {/* Switch mode */}
            <button
              onClick={() => { setMode('basic'); setOpen(false); }}
              style={{
                width:'100%',background:'none',border:'none',
                cursor:'pointer',fontSize:'11.5px',color:'var(--muted-foreground)',
                textDecoration:'underline', textUnderlineOffset:'3px',
                padding:'4px 0',
              }}
            >
              Switch to Basic Mode
            </button>
          </div>
        )}

        {/* ── Trigger button ── */}
        <button
          onClick={() => setOpen(o => !o)}
          className={open ? 'cp-btn-open' : 'cp-btn-close'}
          title="Customization"
          style={{
            width:'48px',height:'48px',borderRadius:'50%',
            background: open
              ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
              : 'var(--card)',
            border:'1.5px solid var(--border)',
            cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow: open
              ? '0 8px 28px rgba(99,102,241,.45)'
              : '0 4px 16px rgba(0,0,0,.12)',
            transition:'background 0.2s, box-shadow 0.2s, border-color 0.2s',
            color: open ? 'white' : 'var(--foreground)',
          }}
        >
          <Settings2 size={19} />
        </button>

        {/* Mode indicator pill */}
        {!open && (
          <div style={{
            position:'absolute',bottom:'52px',left:'50%',transform:'translateX(-50%)',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white',fontSize:'9px',fontWeight:700,letterSpacing:'0.5px',
            padding:'2px 8px',borderRadius:'20px',whiteSpace:'nowrap',
            boxShadow:'0 4px 12px rgba(99,102,241,.4)',
            pointerEvents:'none',
          }}>
            CUSTOM
          </div>
        )}
      </div>
    </>
  );
}
