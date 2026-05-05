import React from 'react';
import { useSettingsStore, useAuthStore } from '../store/useStore';
import { translations } from '../translations';
import { Home, Package, Camera, ShoppingBag, Settings } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onOpenSettings }) => {
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];

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
          src="/logo.png?v=1"
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
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom" style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid var(--border)' }}>
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
      `}} />
    </aside>
  );
};

export default Sidebar;
