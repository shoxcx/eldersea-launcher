import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { Package, RefreshCw, FolderOpen } from 'lucide-react';

const ModsView = () => {
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMods = async () => {
    setRefreshing(true);
    if (window.ipcRenderer) {
      const list = await window.ipcRenderer.invoke('get-mods');
      setMods(list);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMods();

    // Auto-refresh when sync finishes in backend
    if (window.ipcRenderer) {
        window.ipcRenderer.on('mods-updated', fetchMods);
        return () => window.ipcRenderer.removeAllListeners('mods-updated');
    }
  }, []);

  const openModsFolder = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-folder', 'mods');
    }
  };

  if (loading) return null;

  return (
    <div className="mods-view fade-in" style={{ padding: '30px 40px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="cinzel" style={{ fontSize: '20px', letterSpacing: '3px', color: 'var(--crystal)' }}>{t.mods.toUpperCase()}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '5px' }}>{mods.length} {t.mods_installed}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={openModsFolder}
                className="action-button-small"
                style={{
                    padding: '8px 15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', transition: 'all 0.3s ease'
                }}
            >
                <FolderOpen size={14} />
                OUVRIR LE DOSSIER
            </button>
            <button 
                onClick={fetchMods}
                disabled={refreshing}
                className="action-button-small"
                style={{
                    padding: '8px 15px', background: 'var(--purple-gradient)', border: 'none',
                    borderRadius: '8px', color: 'white', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', boxShadow: '0 5px 15px rgba(212,175,55,0.3)', transition: 'all 0.3s ease',
                    opacity: refreshing ? 0.6 : 1
                }}
            >
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                ACTUALISER
            </button>
        </div>
      </header>

      {mods.length === 0 ? (
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', opacity: 0.7 }}>
          <Package size={48} color="var(--text-dim)" />
          <p className="cinzel" style={{ fontSize: '14px', letterSpacing: '2px' }}>{t.no_mods}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', textAlign: 'center' }}>
            Les mods apparaîtront ici après la première synchronisation ou si vous les ajoutez manuellement au dossier.
          </p>
        </div>
      ) : (
        <div className="mods-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '20px' }}>
          {mods.map((mod, i) => (
            <div key={i} className="mod-card glass-panel" style={{ padding: '20px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              <div style={{ background: 'rgba(212,175,55,0.1)', padding: '10px', borderRadius: '10px' }}>
                <Package size={20} color="var(--purple-light)" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div className="cinzel" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--silver-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mod.name.replace('.jar', '')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .action-button-small:hover { background: rgba(255,255,255,0.1) !important; transform: translateY(-2px); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default ModsView;
