import React from 'react';
import { useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { X, Cpu, Globe, Monitor } from 'lucide-react';

const SettingsModal = ({ onClose }) => {
  const { ram, setRam, language, setLanguage, launchOnStartup, setLaunchOnStartup, backgroundMode, setBackgroundMode } = useSettingsStore();
  const t = translations[language] || translations['fr'];

  const handleSave = () => {
    onClose();
  };

  return (
    <div className="modal-overlay fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="settings-card glass-panel" style={{
        width: '640px', height: '520px', display: 'flex', overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)', border: '1px solid var(--border-bright)'
      }}>
        {/* ── Sidebar ── */}
        <div style={{ width: '180px', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid var(--border)', padding: '30px 15px' }}>
          <div className="settings-nav-item active">
            <Cpu size={16} /> <span>{t.settings}</span>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>

          <h2 className="cinzel" style={{ fontSize: '18px', color: 'var(--crystal)', marginBottom: '30px', letterSpacing: '2px' }}>
            {t.settings.toUpperCase()}
          </h2>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div className="setting-group">
                <label className="setting-label"><Globe size={14} /> {t.language}</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="setting-input">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label"><Cpu size={14} /> {t.ram}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input type="range" min="2" max="16" step="1" value={ram} onChange={(e) => setRam(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--purple)' }} />
                  <span className="cinzel" style={{ width: '50px', fontSize: '14px', color: 'var(--purple-light)' }}>{ram}GB</span>
                </div>
              </div>

              <div className="setting-row">
                <div className="setting-label"><Monitor size={14} /> {t.startup}</div>
                <input type="checkbox" checked={launchOnStartup} onChange={(e) => setLaunchOnStartup(e.target.checked)} className="setting-toggle" />
              </div>

              <div className="setting-row">
                <div className="setting-label"><Monitor size={14} /> {t.bg_mode}</div>
                <input type="checkbox" checked={backgroundMode} onChange={(e) => setBackgroundMode(e.target.checked)} className="setting-toggle" />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSave} style={{ padding: '12px 40px' }}>{t.save}</button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .settings-nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-radius: 8px; color: var(--text-dim); font-size: 13px; font-weight: 600; margin-bottom: 5px; }
        .settings-nav-item.active { color: var(--crystal); background: rgba(212,175,55,0.15); box-shadow: 0 0 15px rgba(212,175,55,0.1); }
        .setting-group { display: flex; flex-direction: column; gap: 10px; }
        .setting-row { display: flex; justify-content: space-between; align-items: center; }
        .setting-label { font-size: 11px; letter-spacing: 1px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; text-transform: uppercase; font-family: 'Cinzel', serif; font-weight: 600; }
        .setting-input { width: 100%; padding: 10px 15px; background: var(--bg-dark); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); outline: none; transition: border-color 0.2s; }
        .setting-input:focus { border-color: var(--purple-light); }
        .setting-toggle { width: 40px; height: 20px; cursor: pointer; accent-color: var(--purple); }
      `}} />
    </div>
  );
};

export default SettingsModal;
