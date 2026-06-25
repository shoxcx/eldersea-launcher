import React, { useState, useEffect } from 'react';
import { X, Lightbulb, RefreshCw, AlertTriangle, CheckCircle, Download, Package, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import HomeView from './views/HomeView';
import ModsView from './views/ModsView';
import ScreenshotsView from './views/ScreenshotsView';
import ShopView from './views/ShopView';
import ProfileView from './views/ProfileView';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import { useAuthStore, useSettingsStore } from './store/useStore';

function App() {
  const { isLoggedIn } = useAuthStore();
  const { launchOnStartup, backgroundMode, showConsole } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  
  // Download progress state
  const [downloadInfo, setDownloadInfo] = useState(null);
  const downloadTracker = React.useRef({
    type: null,
    startTime: null,
    startTask: 0,
    lastTime: null,
    lastTask: 0,
    speed: 0,
    remainingTime: null
  });

  // Update state from Electron
  const [updateState, setUpdateState] = useState(null);

  // Sync launch on startup to Electron
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('set-launch-on-startup', launchOnStartup);
    }
  }, [launchOnStartup]);

  // Sync background mode to Electron
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('set-background-mode', backgroundMode);
    }
  }, [backgroundMode]);

  // Sync show console to Electron
  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('set-show-console', showConsole);
    }
  }, [showConsole]);

  // Redirect to home on logout
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveTab('home');
    }
  }, [isLoggedIn]);

  // Handle launch progress from Electron
  useEffect(() => {
    if (window.ipcRenderer) {
      const handleProgress = (event, data) => {
        const now = Date.now();
        const tracker = downloadTracker.current;
        
        let progress = 0;
        if (data.total && data.total > 0) {
          progress = Math.min(100, Math.round((data.task / data.total) * 100));
        }

        if (tracker.type !== data.type) {
          tracker.type = data.type;
          tracker.startTime = now;
          tracker.startTask = data.task || 0;
          tracker.lastTime = now;
          tracker.lastTask = data.task || 0;
          tracker.speed = 0;
          tracker.remainingTime = null;
        } else {
          const timeElapsed = (now - tracker.lastTime) / 1000;
          if (timeElapsed >= 0.5) {
            const taskDiff = data.task - tracker.lastTask;
            if (taskDiff > 0) {
              const currentSpeed = taskDiff / timeElapsed;
              tracker.speed = tracker.speed === 0 ? currentSpeed : tracker.speed * 0.7 + currentSpeed * 0.3;
              
              if (tracker.speed > 0) {
                const remaining = data.total - data.task;
                tracker.remainingTime = remaining / tracker.speed;
              }
            }
            tracker.lastTime = now;
            tracker.lastTask = data.task;
          }
        }

        let remainingText = '';
        if (tracker.remainingTime !== null && isFinite(tracker.remainingTime) && tracker.remainingTime > 0) {
          if (tracker.remainingTime < 60) {
            remainingText = `${Math.round(tracker.remainingTime)}s restant`;
          } else {
            const mins = Math.floor(tracker.remainingTime / 60);
            const secs = Math.round(tracker.remainingTime % 60);
            remainingText = `${mins}m ${secs}s restant`;
          }
        } else if (progress >= 100) {
          remainingText = 'Terminé';
        } else {
          remainingText = 'Calcul...';
        }
        
        setDownloadInfo(prev => ({
          type: data.type || (prev?.type || '...'),
          progress: progress > 0 ? progress : (prev?.progress || 0),
          task: data.task || 0,
          total: data.total || 100,
          filename: data.filename || null,
          remainingText: remainingText
        }));
        
        if (data.type === 'finished') {
          setTimeout(() => setDownloadInfo(null), 3000);
        }
      };

      const handleFinished = () => {
        setDownloadInfo({ type: 'Lancement réussi !', progress: 100 });
        setTimeout(() => setDownloadInfo(null), 3000);
      };

      const handleError = (event, msg) => {
        alert("Erreur de lancement: " + msg);
        setDownloadInfo(null);
      };

      const handleUpdateStatus = (event, data) => {
        setUpdateState(data);
      };

      window.ipcRenderer.on('launch-progress', handleProgress);
      window.ipcRenderer.on('launch-finished', handleFinished);
      window.ipcRenderer.on('launch-error', handleError);
      window.ipcRenderer.on('hide-progress', () => setDownloadInfo(null));
      window.ipcRenderer.on('update-status', handleUpdateStatus);

      return () => {
        window.ipcRenderer.removeAllListeners('launch-progress');
        window.ipcRenderer.removeAllListeners('launch-finished');
        window.ipcRenderer.removeAllListeners('launch-error');
        window.ipcRenderer.removeAllListeners('update-status');
      };
    }
  }, []);

  const handleInstallUpdate = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('install-update');
    }
  };

  const getTargetFolder = (type, filename) => {
    if (filename && filename.includes('/')) {
      const parts = filename.split('/');
      return `.eldersea/${parts.slice(0, -1).join('/')}`;
    }
    
    switch (type?.toLowerCase()) {
      case 'assets':
        return '.eldersea/assets';
      case 'libraries':
        return '.eldersea/libraries';
      case 'natives':
        return '.eldersea/bin';
      case 'jar':
        return '.eldersea/versions';
      case 'vérification & téléchargement...':
        return '.eldersea';
      default:
        return '.eldersea';
    }
  };

  const formatProgressDetail = (task, total) => {
    if (total > 10000) {
      const taskMB = (task / (1024 * 1024)).toFixed(1);
      const totalMB = (total / (1024 * 1024)).toFixed(1);
      return `${taskMB} MB / ${totalMB} MB`;
    }
    return `${task} / ${total} fichiers`;
  };

  const [selectedNews, setSelectedNews] = useState(null);

  const handleAppClick = () => {
    if (isProfileOpen) setIsProfileOpen(false);
  };

  return (
    <div className="app-container" onClick={handleAppClick} style={{ 
      display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-dark)',
      overflow: 'hidden', color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif'
    }}>
      <div className="bg-layer" />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isProfileOpen={isProfileOpen}
        onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
      />
      
      <main className="main-content">
        <TopBar 
          onOpenAuth={() => setIsAuthModalOpen(true)} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          setActiveTab={setActiveTab}
          isProfileOpen={isProfileOpen}
          onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
        />
        
        <div className="view-container fade-in" key={activeTab}>
          {activeTab === 'home' && (
            <HomeView 
              onOpenAuth={() => setIsAuthModalOpen(true)} 
              setSelectedNews={setSelectedNews}
            />
          )}
          {activeTab === 'mods' && <ModsView />}
          {activeTab === 'screenshots' && <ScreenshotsView setFullscreen={setFullscreenImage} />}
          {activeTab === 'shop' && <ShopView />}
          {activeTab === 'profile' && <ProfileView />}
        </div>
      </main>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      
      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)} style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 9999, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
        }}>
          <img 
            src={fullscreenImage} 
            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '12px', border: '1px solid var(--border-bright)', boxShadow: '0 0 100px rgba(0,0,0,1)' }} 
          />
        </div>
      )}

      {/* ── DOWNLOAD PROGRESS BUBBLE ── */}
      {downloadInfo && (
        <div className="download-bubble premium-float-bubble" style={{
          position: 'fixed', bottom: '30px', right: '30px', width: '340px',
          padding: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="premium-orb">
              {downloadInfo.type === 'launching' ? <Zap size={18} color="var(--purple)" /> : <Download size={18} color="var(--purple)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cinzel" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--crystal)' }}>
                {downloadInfo.type === 'launching' ? 'LANCEMENT DU JEU...' : 'TÉLÉCHARGEMENT...'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', textTransform: 'uppercase' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  {downloadInfo.type}
                </span>
                <span style={{ fontFamily: 'monospace', color: 'var(--purple-light)', fontWeight: 700, flexShrink: 0 }}>
                  {formatProgressDetail(downloadInfo.task, downloadInfo.total)} ({downloadInfo.progress}%)
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', fontSize: '9px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dossier : <strong style={{ color: 'var(--crystal)' }}>{getTargetFolder(downloadInfo.type, downloadInfo.filename)}</strong></span>
                  <span style={{ color: 'var(--purple-light)', fontWeight: 700, fontFamily: 'monospace' }}>{downloadInfo.remainingText || 'Calcul...'}</span>
                </div>
                {downloadInfo.filename && (
                  <div 
                    style={{ 
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      opacity: 0.7, fontFamily: 'monospace'
                    }}
                    title={downloadInfo.filename}
                  >
                    Fichier : {downloadInfo.filename.includes('/') ? downloadInfo.filename.split('/').slice(1).join('/') : downloadInfo.filename}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div 
              className="progress-bar-animated"
              style={{ 
                height: '100%', width: `${downloadInfo.progress}%`, 
                boxShadow: '0 0 10px rgba(212,175,55,0.5)', transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }} 
            />
          </div>
        </div>
      )}

      {/* ── AUTO-UPDATE MODAL ── */}
      {updateState && (updateState.status === 'downloading' || updateState.status === 'downloaded' || updateState.status === 'error') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 11000, background: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '420px', padding: '35px', borderRadius: '16px',
            border: '1px solid var(--border-bright)', background: 'rgba(15,22,40,0.95)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '24px', textAlign: 'center', position: 'relative'
          }}>
            
            {updateState.status === 'error' && (
              <button 
                onClick={() => setUpdateState(null)}
                style={{
                  position: 'absolute', top: '15px', right: '15px', background: 'transparent',
                  border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            )}

            {/* Icon container */}
            <div className="pulse-icon" style={{
              background: updateState.status === 'error' ? 'rgba(239,68,68,0.15)' : updateState.status === 'downloaded' ? 'rgba(16,185,129,0.15)' : 'rgba(212,175,55,0.15)',
              padding: '20px', borderRadius: '50%', 
              color: updateState.status === 'error' ? '#ef4444' : updateState.status === 'downloaded' ? '#10b981' : 'var(--purple-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {updateState.status === 'error' ? <AlertTriangle size={36} /> : 
               updateState.status === 'downloaded' ? <CheckCircle size={36} /> : 
               <RefreshCw size={36} className="spin-icon" />}
            </div>

            {/* Texts */}
            <div>
              <h2 className="cinzel" style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '1px', color: 'white' }}>
                {updateState.status === 'error' ? 'ÉCHEC DE LA MISE À JOUR' : 
                 updateState.status === 'downloaded' ? 'MISE À JOUR PRÊTE !' : 
                 'MISE À JOUR EN COURS'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                {updateState.status === 'error' ? 'Une erreur est survenue lors du téléchargement de la mise à jour.' : 
                 updateState.status === 'downloaded' ? `La nouvelle version (${updateState.version}) de ElderSea a été téléchargée avec succès et est prête.` : 
                 `Une mise à jour importante de ElderSea est en cours de téléchargement.`}
              </p>
            </div>

            {/* Interactive parts */}
            {updateState.status === 'downloading' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--crystal)', fontWeight: 600 }}>
                  <span>Téléchargement...</span>
                  <span>{updateState.percent || 0}%</span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${updateState.percent || 0}%`,
                    background: 'linear-gradient(90deg, var(--purple) 0%, var(--purple-light) 100%)',
                    boxShadow: '0 0 15px var(--purple)', transition: 'width 0.2s ease'
                  }} />
                </div>
              </div>
            )}

            {updateState.status === 'downloaded' && (
              <button 
                onClick={handleInstallUpdate}
                style={{
                  width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--purple) 0%, var(--purple-dark, #4c1d95) 100%)',
                  border: '1px solid var(--purple-light)', borderRadius: '8px', color: 'white', fontWeight: 800,
                  fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)', transition: 'all 0.3s ease'
                }}
              >
                Redémarrer et Installer
              </button>
            )}

            {updateState.status === 'error' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#fca5a5',
                  maxHeight: '100px', overflowY: 'auto', textAlign: 'left', fontFamily: 'monospace'
                }}>
                  {updateState.message}
                </div>
                <button 
                  onClick={() => setUpdateState(null)}
                  style={{
                    width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white',
                    fontWeight: 700, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  Continuer quand même
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .pulse-icon { animation: pulse 2s infinite; }
        .spin-icon { animation: spin 2s linear infinite; }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(212,175,55,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212,175,55,0); }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}} />
      {/* ── GLOBAL NEWS MODAL ── */}
      {selectedNews && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(5, 7, 10, 0.95)', backdropFilter: 'blur(15px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
        }}>
          <div style={{
            width: '100%', maxWidth: '850px', maxHeight: '85vh', background: 'var(--bg-panel)',
            borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <button 
              onClick={() => setSelectedNews(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px', zIndex: 10, width: '36px', height: '36px',
                borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              width: '100%', height: '300px', backgroundImage: selectedNews.image ? `url(${selectedNews.image})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '40px',
              borderBottom: '1px solid var(--glass-border)'
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, var(--bg-panel) 0%, transparent 100%)' }}></div>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ padding: '6px 12px', background: 'rgba(212,175,55,0.15)', border: '1px solid var(--purple)', color: 'var(--purple)', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {selectedNews.tag || 'INFO'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>{selectedNews.date ? new Date(selectedNews.date).toLocaleDateString('fr-FR') : ''}</span>
                </div>
                <h1 className="cinzel" style={{ margin: 0, fontSize: '38px', fontWeight: 900, color: 'white', textShadow: '0 4px 8px rgba(0,0,0,0.8)' }}>
                  {selectedNews.title || 'Nouvelle'}
                </h1>
              </div>
            </div>

            <div style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.8, marginBottom: '40px' }} dangerouslySetInnerHTML={{ __html: selectedNews.content || '' }}></div>
              
              {selectedNews.tip && (
                <div style={{
                  background: 'rgba(10, 13, 26, 0.8)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '12px',
                  padding: '24px', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--purple)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Lightbulb size={18} color="#000" />
                    </div>
                    <span style={{ color: 'var(--purple)', fontWeight: 800, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Conseil de pro</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.6 }}>
                    {selectedNews.tip}
                  </div>
                  <Lightbulb size={120} color="var(--purple)" style={{ position: 'absolute', right: '-20px', bottom: '-40px', opacity: 0.05 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
