import React from 'react';
import { useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { X, Cpu, Globe, Monitor, ShieldCheck } from 'lucide-react';
import CustomDropdown from './CustomDropdown';

const SettingsModal = ({ onClose }) => {
  const { ram, setRam, language, setLanguage, launchOnStartup, setLaunchOnStartup, backgroundMode, setBackgroundMode, showConsole, setShowConsole } = useSettingsStore();
  const t = translations[language] || translations['fr'];

  const [verifying, setVerifying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [statusText, setStatusText] = React.useState('');

  React.useEffect(() => {
    if (window.ipcRenderer) {
      const handleProgress = (event, data) => {
        const pct = Math.round((data.completed / data.total) * 100);
        setProgress(pct);
        setStatusText(prev => {
          const successMsg = t.integrity_success || 'Tous les fichiers sont valides !';
          const errorPrefix = t.integrity_error || 'Échec de la vérification : ';
          if (prev === successMsg || prev.startsWith(errorPrefix)) {
            return prev;
          }
          return `${t.integrity_verifying || 'Vérification en cours...'} (${pct}%)`;
        });
      };

      window.ipcRenderer.on('verify-progress', handleProgress);
      return () => {
        window.ipcRenderer.removeListener('verify-progress', handleProgress);
      };
    }
  }, [t.integrity_verifying]);

  const handleVerifyIntegrity = async () => {
    if (verifying) return;
    setVerifying(true);
    setProgress(0);
    setStatusText(t.integrity_init || 'Initialisation...');
    try {
      const result = await window.ipcRenderer.invoke('verify-files');
      if (result.success) {
        setStatusText(t.integrity_success || 'Tous les fichiers sont valides !');
      } else {
        setStatusText(`${t.integrity_error || 'Échec : '}${result.error}`);
      }
    } catch (err) {
      setStatusText('Erreur de communication avec le launcher.');
    }
    setVerifying(false);
  };

  const langOptions = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' }
  ];

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

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div className="setting-group">
                <label className="setting-label"><Globe size={14} /> {t.language}</label>
                <CustomDropdown 
                  value={language} 
                  onChange={setLanguage} 
                  options={langOptions} 
                />
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

              <div className="setting-row">
                <div className="setting-label"><Monitor size={14} /> {t.show_console}</div>
                <input type="checkbox" checked={showConsole} onChange={(e) => setShowConsole(e.target.checked)} className="setting-toggle" />
              </div>

              <div className="setting-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '10px' }}>
                <label className="setting-label"><ShieldCheck size={14} /> {t.integrity_label}</label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {t.integrity_desc}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button 
                      onClick={handleVerifyIntegrity} 
                      className="btn-secondary" 
                      disabled={verifying}
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '11px', 
                        cursor: verifying ? 'not-allowed' : 'pointer',
                        opacity: verifying ? 0.6 : 1,
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--crystal)',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {verifying ? 'VÉRIFICATION...' : t.integrity_btn}
                    </button>
                    <span style={{ fontSize: '11px', color: verifying ? 'var(--purple-light)' : 'var(--text-dim)', fontWeight: 600 }}>
                      {statusText}
                    </span>
                  </div>
                  {verifying && (
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.2s ease' }} />
                    </div>
                  )}
                </div>
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
