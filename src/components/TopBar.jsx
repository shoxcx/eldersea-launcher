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

  const [serverStatus, setServerStatus] = React.useState({
    online: false,
    players: 0,
    maxPlayers: 0,
    loading: true
  });

  const checkServerStatus = React.useCallback(async () => {
    if (window.ipcRenderer) {
      try {
        const res = await window.ipcRenderer.invoke('get-server-status');
        setServerStatus({
          online: res.online,
          players: res.players,
          maxPlayers: res.maxPlayers,
          loading: false
        });
      } catch (err) {
        console.error("Failed to fetch server status:", err);
        setServerStatus(prev => ({ ...prev, loading: false }));
      }
    } else {
      try {
        const response = await fetch('https://api.mcstatus.io/v2/status/java/eldersea.tekao.fr');
        const json = await response.json();
        setServerStatus({
          online: json.online ?? false,
          players: json.players?.online ?? 0,
          maxPlayers: json.players?.max ?? 0,
          loading: false
        });
      } catch (err) {
        setServerStatus({ online: false, players: 0, maxPlayers: 0, loading: false });
      }
    }
  }, []);

  React.useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000);
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  const handleDiscordClick = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-external-url', 'https://discord.gg/xABVSPdDk5');
    } else {
      window.open('https://discord.gg/xABVSPdDk5', '_blank');
    }
  };

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
        display: 'flex', gap: '15px', alignItems: 'center',
        WebkitAppRegion: 'no-drag', position: 'relative', zIndex: 1001,
        pointerEvents: 'auto', marginLeft: 'auto'
      }}>
        {/* ── SERVER STATUS CARD ── */}
        <div className="server-status-card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '6px 16px',
          borderRadius: '6px',
          background: 'rgba(10,13,26,0.6)',
          border: '1px solid rgba(212,175,55,0.25)',
          fontSize: '11px',
          fontFamily: 'Outfit, sans-serif',
          color: 'var(--text-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-dot ${serverStatus.online ? 'online' : 'offline'}`} />
            <span style={{ fontWeight: 600, letterSpacing: '1.5px', color: 'var(--crystal)', fontSize: '10.5px' }}>
              ELDERSEA
            </span>
          </div>
          <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: serverStatus.online ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '10.5px', letterSpacing: '1px' }}>
            {serverStatus.loading ? '...' : (serverStatus.online ? `${serverStatus.players} CONNECTÉS` : 'HORS LIGNE')}
          </span>
        </div>

        {/* ── DISCORD BUTTON ── */}
        <button 
          onClick={handleDiscordClick}
          className="pirate-control discord-btn"
          style={{
            background: 'rgba(10,13,26,0.6)',
            border: '1px solid rgba(114, 137, 218, 0.3)',
            color: '#7289da',
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          title="Rejoindre notre Discord"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
          </svg>
        </button>
        
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

        .status-dot {
          width: 7px; height: 7px; border-radius: 50%; display: inline-block;
        }
        .status-dot.online {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse-green 2s infinite;
        }
        .status-dot.offline {
          background-color: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }
        @keyframes pulse-green {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        .pirate-control.discord-btn {
          color: #7289da;
          border-color: rgba(114, 137, 218, 0.3) !important;
        }
        .pirate-control.discord-btn:hover {
          background: rgba(114, 137, 218, 0.15) !important;
          border-color: #7289da !important;
          color: #a5b4fc !important;
          box-shadow: 0 0 15px rgba(114, 137, 218, 0.3) !important;
        }
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
