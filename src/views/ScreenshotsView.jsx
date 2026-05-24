import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { Camera, RefreshCw, FolderOpen, Maximize2, X, ExternalLink, Trash2 } from 'lucide-react';

const ScreenshotsView = ({ setFullscreen }) => {
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScreenshots = async () => {
    setLoading(true);
    if (window.ipcRenderer) {
      try {
        const list = await window.ipcRenderer.invoke('get-screenshots');
        setScreenshots(list);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScreenshots();
  }, []);

  const openFolder = () => {
    window.ipcRenderer?.send('open-folder', 'screenshots');
  };

  const showItem = (e, fullPath) => {
    e.stopPropagation();
    window.ipcRenderer?.send('show-item', fullPath);
  };

  const deleteImg = async (e, fullPath) => {
    e.stopPropagation();
    // Use a simpler confirmation or direct action if blocked
    try {
      const success = await window.ipcRenderer.invoke('delete-screenshot', fullPath);
      if (success) {
        // Optimistic UI update
        setScreenshots(prev => prev.filter(s => s.fullPath !== fullPath));
      } else {
        alert("Impossible de supprimer le fichier.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="screenshots-view fade-in" style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 className="cinzel" style={{ fontSize: '20px', letterSpacing: '3px', color: 'var(--crystal)' }}>{t.captures.toUpperCase()}</h2>
          <button className="icon-btn" onClick={fetchScreenshots} title="Rafraîchir">
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
        <button className="btn-secondary cinzel" onClick={openFolder} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', fontSize: '12px' }}>
          <FolderOpen size={16} /> {t.open_folder}
        </button>
      </header>

      {loading && screenshots.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <RefreshCw size={40} className="spin" color="var(--purple)" />
        </div>
      ) : screenshots.length === 0 ? (
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', opacity: 0.7 }}>
          <Camera size={48} color="var(--text-dim)" />
          <p className="cinzel" style={{ fontSize: '14px', letterSpacing: '2px' }}>{t.no_screenshots}</p>
        </div>
      ) : (
        <div className="screenshot-grid" style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gridAutoRows: 'max-content',
          gap: '25px', overflowY: 'auto', paddingBottom: '30px', paddingRight: '10px',
          flex: 1, minHeight: 0
        }}>
          {screenshots.map((s, i) => (
            <div key={s.fullPath || i} className="screenshot-card glass-panel" style={{ overflow: 'hidden', cursor: 'default', position: 'relative' }}>
              <div className="img-wrap" style={{ height: '160px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <img 
                  src={s.url} 
                  alt={s.name} 
                  onClick={() => setFullscreen(s.url)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} 
                />
                
                <div className="card-actions" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
                  <button onClick={(e) => showItem(e, s.fullPath)} className="action-pill" title="Voir dans le dossier">
                    <ExternalLink size={14} />
                  </button>
                  <button onClick={(e) => deleteImg(e, s.fullPath)} className="action-pill delete" title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '12px 15px', fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border)' }}>
                {s.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .action-pill { background: rgba(15,22,40,0.85); border: 1px solid var(--border); border-radius: 6px; padding: 8px; color: var(--crystal); cursor: pointer; transition: all 0.2s; backdrop-filter: blur(5px); }
        .action-pill:hover { background: var(--purple); color: white; border-color: var(--purple-light); transform: scale(1.1); }
        .action-pill.delete:hover { background: #f87171 !important; border-color: #f87171 !important; }
        .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; padding: 8px; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
        .icon-btn:hover { color: var(--crystal); border-color: var(--crystal); background: rgba(243,229,171,0.1); }
        .btn-secondary { background: rgba(212,175,55,0.1); border: 1px solid var(--border); border-radius: 8px; color: var(--crystal); cursor: pointer; transition: all 0.2s; font-weight: 600; letter-spacing: 1px; }
        .btn-secondary:hover { background: rgba(212,175,55,0.2); border-color: var(--purple-light); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default ScreenshotsView;
