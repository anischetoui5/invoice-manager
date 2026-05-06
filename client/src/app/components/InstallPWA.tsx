import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export function InstallPWA() {
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setPrompt(e); setVisible(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const install = async () => {
    prompt?.prompt();
    const { outcome } = await prompt?.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: '76px', left: '12px', right: '12px',
      background: 'white', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      border: '1px solid #e2e8f0',
      padding: '16px', zIndex: 200,
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'slideUp 0.3s ease',
    }}
      className="md:hidden"
    >
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: 'white', fontWeight: '800', fontSize: '20px', fontFamily: 'Arial' }}>E</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', margin: 0 }}>Install EASYfact</p>
        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Add to home screen for quick access</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button onClick={install} style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: 'white', border: 'none', borderRadius: '8px',
          padding: '7px 14px', fontSize: '12px', fontWeight: '600',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <Download size={13} /> Install
        </button>
        <button onClick={() => setVisible(false)} style={{
          background: 'none', border: 'none', fontSize: '11px',
          color: '#94a3b8', cursor: 'pointer', textAlign: 'center',
        }}>Not now</button>
      </div>
    </div>
  );
}
