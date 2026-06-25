import React from 'react';
import { useAuthStore, useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { User, ChevronDown, LogOut, Minus, X as CloseIcon } from 'lucide-react';
import packageJson from '../../package.json';

const TopBar = ({ onOpenAuth, onOpenSettings, setActiveTab, onToggleProfile, isProfileOpen }) => {
  const { user, isLoggedIn, logout } = useAuthStore();
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  const [isPremium, setIsPremium] = React.useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      const pseudo = getPseudo();
      if (pseudo && pseudo !== t.player) {
        const result = await window.ipcRenderer.invoke('check-mojang', pseudo);
        setIsPremium(result);
      }
    };
    checkStatus();
  }, [user]);

  const handleControl = (action) => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('window-control', action);
    }
  };

  const getPseudo = () => {
    if (typeof user === 'string') return user;
    return user?.pseudo || t.player;
  };

  const getSkinHead = () => {
    const pseudo = getPseudo();
    if (pseudo !== t.player) {
      return `https://minotar.net/avatar/${pseudo}/64`;
    }
    return 'https://minotar.net/avatar/Steve/64';
  };

  return (
    <div className="topbar" style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '0 20px 0 28px', borderBottom: '1px solid var(--border)',
      background: 'rgba(15,22,40,0.4)', backdropFilter: 'blur(10px)',
      flexShrink: 0, height: '64px', position: 'relative',
      zIndex: 1000
    }}>
      <div style={{ position: 'absolute', inset: 0, WebkitAppRegion: 'drag', zIndex: 0 }} />
      
      <div className="topbar-title cinzel" style={{ 
        position: 'relative', zIndex: 1001, fontSize: '13px', color: 'var(--crystal)', 
        letterSpacing: '2px', pointerEvents: 'none', opacity: 0.8
      }}>
        ELDERSEA <span style={{ color: 'var(--purple)', marginLeft: '8px', fontSize: '10px' }}>V{packageJson.version}</span>
      </div>

      <div className="window-controls-wrapper" style={{ 
        display: 'flex', gap: '25px', alignItems: 'center',
        WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1001,
        pointerEvents: 'auto', marginLeft: 'auto'
      }}>
        {/* ── PIRATE THEMED WINDOW CONTROLS ── */}
        <div className="window-controls" style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => handleControl('minimize')} 
            className="pirate-control minimize"
            style={btnStyle}
          >
            <Minus size={14} />
          </button>
          <button 
            onClick={() => handleControl('close')} 
            className="pirate-control close"
            style={{ ...btnStyle, borderColor: 'rgba(248,113,113,0.3)' }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .interactive-element:hover { transform: translateY(-1px); background: rgba(212,175,55,0.1) !important; border-color: #d4af37 !important; box-shadow: 0 4px 15px rgba(212,175,55,0.15), inset 0 0 15px rgba(212,175,55,0.05) !important; }
        .dropdown-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 4px; cursor: pointer; transition: all 0.2s ease; font-size: 13px; color: var(--text-primary); font-weight: 500; }
        .dropdown-item:hover { background: rgba(212,175,55,0.15); color: #f3e5ab; }
        .topbar-pill:hover { border-color: #d4af37; color: #f3e5ab; background: rgba(212,175,55,0.05); }
        
        .pirate-control {
          width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justifyContent: center;
          background: rgba(10,13,26,0.6); border: 1px solid rgba(212,175,55,0.2); color: var(--text-dim);
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pirate-control:hover { border-color: #d4af37; color: #f3e5ab; transform: scale(1.1); box-shadow: 0 0 15px rgba(212,175,55,0.2); }
        .pirate-control.close:hover { background: rgba(139,0,0,0.15); border-color: #8b0000; color: #ff4444; box-shadow: 0 0 20px rgba(139,0,0,0.3); }
      `}} />
    </div>
  );
};

const pillStyle = {
  padding: '8px 22px', borderRadius: '99px', fontSize: '10.5px',
  border: '1px solid var(--border)', color: 'var(--text-muted)',
  cursor: 'pointer', transition: 'all 0.3s ease', letterSpacing: '1px',
  fontFamily: 'Outfit, sans-serif', fontWeight: 700
};

const btnStyle = {
  background: 'rgba(10,13,26,0.6)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-dim)', width: '32px', height: '32px', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  transition: 'all 0.3s'
};

export default TopBar;
