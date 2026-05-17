import React from 'react';
import { useSettingsStore, useAuthStore } from '../store/useStore';
import { translations } from '../translations';
import { Home, Package, Camera, ShoppingBag, Settings, User, ChevronDown, LogOut, ChevronUp } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onOpenSettings, onOpenAuth, isProfileOpen, onToggleProfile }) => {
  const { language } = useSettingsStore();
  const { user, isLoggedIn, logout } = useAuthStore();
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

  const getPseudo = () => {
    if (typeof user === 'string') return user;
    return user?.pseudo || t.player;
  };

  const getSkinHead = () => {
    const pseudo = getPseudo();
    if (pseudo !== t.player) {
      return `https://mc-heads.net/avatar/${pseudo}/64`;
    }
    return 'https://mc-heads.net/avatar/Steve/64';
  };

  const menuItems = [
    { id: 'home', label: t.home, icon: <Home size={18} /> },
    { id: 'screenshots', label: t.captures, icon: <Camera size={18} /> },
    { id: 'shop', label: t.shop, icon: <ShoppingBag size={18} />, special: 'nav-shop' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '30px 5px', textAlign: 'center' }}>
        <img
          className="logo-gem"
          src="logo.png"
          alt="ElderSea"
          style={{
            width: '230px',
            filter: 'drop-shadow(0 0 25px rgba(212,175,55,0.4))',
            marginTop: '2.5px'
          }}
        />
        <div className="logo-text" style={{ marginTop: '15px' }}>
          <span className="version cinzel" style={{ fontSize: '10px', color: 'var(--purple-light)', letterSpacing: '2px' }}>
            V1.0.0 MODDED 1.20.1
          </span>
        </div>
      </div>

      <div className="nav-section" style={{ padding: '0 16px' }}>
        <div className="nav-label cinzel" style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--text-dim)', padding: '0 8px 12px' }}>
          {t.navigation}
        </div>

        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''} ${item.special || ''}`}
            onClick={() => {
              if (item.id === 'shop') {
                window.ipcRenderer.send('open-external-url', 'https://eldersea.tekao.fr');
              } else {
                setActiveTab(item.id);
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom" style={{ marginTop: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* ── USER INFO / LOGIN ── */}
        <div className="sidebar-auth-wrapper" style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          {!isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="sidebar-auth-btn" onClick={onOpenAuth} style={{ ...authBtnStyle, background: 'rgba(212,175,55,0.1)', color: 'var(--crystal)', borderColor: 'var(--purple)' }}>{t.connexion}</div>
              <div className="sidebar-auth-btn" onClick={onOpenAuth} style={authBtnStyle}>{t.inscription}</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div 
                className="sidebar-user-pill"
                onClick={(e) => { e.stopPropagation(); onToggleProfile(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s'
                }}
              >
                <img src={getSkinHead()} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '4px', imageRendering: 'pixelated' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f3e5ab', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPseudo().toUpperCase()}</div>
                  <div style={{ fontSize: '9px', color: isPremium ? '#34d399' : '#f87171', fontWeight: 700 }}>{isPremium ? 'PREMIUM' : 'CRACK'}</div>
                </div>
                <ChevronUp size={14} color="var(--text-dim)" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
              </div>

              {isProfileOpen && (
                <div className="profile-dropdown-sidebar glass-panel fade-in" style={{
                  position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, right: 0, zIndex: 2005, padding: '6px',
                  boxShadow: '0 -10px 40px rgba(0,0,0,0.6)', background: 'var(--bg-panel)'
                }}>
                  <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveTab('profile'); onToggleProfile(); }}>
                    <User size={14} /> <span>{t.profile}</span>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '6px 4px' }} />
                  <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); logout(); onToggleProfile(); }} style={{ color: '#f87171' }}>
                    <LogOut size={14} /> <span>{t.logout}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-btn" onClick={onOpenSettings} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-dim)', transition: 'all 0.25s' }}>
          <Settings size={18} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.settings}</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes gemPulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 16px rgba(212,175,55,0.4)); transform: scale(1); }
          50% { filter: brightness(1.2) drop-shadow(0 0 24px rgba(212,175,55,0.7)); transform: scale(1.03); }
        }
        .nav-shop:hover { color: #fbbf24 !important; }
        .settings-btn:hover { color: var(--crystal); background: rgba(255,255,255,0.05); }
        .sidebar-user-pill:hover { background: rgba(212,175,55,0.08) !important; border-color: var(--purple) !important; }
        .sidebar-auth-btn { padding: 8px; text-align: center; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; }
        .sidebar-auth-btn:hover { background: rgba(255,255,255,0.05); border-color: var(--text-dim); }
        .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 12px; }
        .dropdown-item:hover { background: rgba(255,255,255,0.05); color: var(--purple-light); }
      `}} />
    </aside>
  );
};

const authBtnStyle = {
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--text-muted)'
};

export default Sidebar;
