import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import HomeView from './views/HomeView';
import ModsView from './views/ModsView';
import ScreenshotsView from './views/ScreenshotsView';
import ShopView from './views/ShopView';
import ProfileView from './views/ProfileView';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import { useAuthStore } from './store/useStore';
import { Download, Package, Zap } from 'lucide-react';

function App() {
  const { isLoggedIn } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  
  // Download progress state
  const [downloadInfo, setDownloadInfo] = useState(null);

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
        // data: { type: string, task: number, total: number }
        let progress = 0;
        if (data.total && data.total > 0) {
          progress = Math.round((data.task / data.total) * 100);
        }
        
        setDownloadInfo(prev => ({
          type: data.type || (prev?.type || '...'),
          progress: progress > 0 ? progress : (prev?.progress || 0),
          task: data.task || 0,
          total: data.total || 100
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

      window.ipcRenderer.on('launch-progress', handleProgress);
      window.ipcRenderer.on('launch-finished', handleFinished);
      window.ipcRenderer.on('launch-error', handleError);
      window.ipcRenderer.on('hide-progress', () => setDownloadInfo(null));

      return () => {
        window.ipcRenderer.removeAllListeners('launch-progress');
        window.ipcRenderer.removeAllListeners('launch-finished');
        window.ipcRenderer.removeAllListeners('launch-error');
      };
    }
  }, []);

  const handleAppClick = () => {
    if (isProfileOpen) setIsProfileOpen(false);
  };

  return (
    <div className="app-container" onClick={handleAppClick} style={{ 
      display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-dark)',
      overflow: 'hidden', color: 'var(--text-primary)', fontFamily: 'Lato, sans-serif'
    }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <main className="main-content">
        <TopBar 
          onOpenAuth={() => setIsAuthModalOpen(true)} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          setActiveTab={setActiveTab}
          isProfileOpen={isProfileOpen}
          onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
        />
        
        <div className="view-container fade-in" key={activeTab}>
          {activeTab === 'home' && <HomeView onOpenAuth={() => setIsAuthModalOpen(true)} />}
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
        <div className="download-bubble glass-panel fade-in" style={{
          position: 'fixed', bottom: '30px', right: '30px', width: '300px',
          padding: '20px', zIndex: 10000, boxShadow: '0 15px 50px rgba(0,0,0,0.8)',
          border: '1px solid var(--border-bright)', background: 'rgba(15,22,40,0.9)',
          backdropFilter: 'blur(15px)', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pulse-icon" style={{ 
              background: 'rgba(212,175,55,0.2)', padding: '8px', borderRadius: '10px',
              color: 'var(--purple-light)'
            }}>
              {downloadInfo.type === 'launching' ? <Zap size={20} /> : <Download size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className="cinzel" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: 'var(--crystal)' }}>
                {downloadInfo.type === 'launching' ? 'LANCEMENT DU JEU...' : 'TÉLÉCHARGEMENT...'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', textTransform: 'uppercase' }}>
                {downloadInfo.type} ({downloadInfo.progress}%)
              </div>
            </div>
          </div>

          <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', width: `${downloadInfo.progress}%`, 
              background: 'linear-gradient(90deg, var(--purple) 0%, var(--purple-light) 100%)',
              boxShadow: '0 0 15px var(--purple)', transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .pulse-icon { animation: pulse 2s infinite; }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(212,175,55,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212,175,55,0); }
        }
      `}} />
    </div>
  );
}

export default App;
