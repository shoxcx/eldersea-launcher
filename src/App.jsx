















import React, { useState, useEffect } from 'react';
import { X, Lightbulb, RefreshCw, AlertTriangle, CheckCircle, Download, Package, Zap, Shield, Compass, Clock, Calendar, Users, User, Info } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import HomeView from './views/HomeView';
import ModsView from './views/ModsView';
import ScreenshotsView from './views/ScreenshotsView';
import ImageHostingView from './views/ImageHostingView';
import ShopView from './views/ShopView';
import ProfileView from './views/ProfileView';
import FriendsView from './views/FriendsView';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import CrashModal from './components/CrashModal';
import MediaPlayer from './components/MediaPlayer';
import { useAuthStore, useSettingsStore } from './store/useStore';
import { translations } from './translations';

function App() {
  const { isLoggedIn, user } = useAuthStore();
  const { launchOnStartup, backgroundMode, showConsole, language } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [crashData, setCrashData] = useState(null);
  const [elderAlert, setElderAlert] = useState(null); // Custom ElderSea Dialog/Alert

  const [inspectedUser, setInspectedUser] = useState(null);
  const [inspectedUserDetails, setInspectedUserDetails] = useState(null);
  const [isInspectedLoading, setIsInspectedLoading] = useState(false);

  const getCrewForUser = (pseudo) => {
    if (!pseudo) return 'Aucun';
    const name = pseudo.toLowerCase();
    if (name === 'zewolf929') return 'Chapeau de Paille';
    if (name === 'shox') return 'Légende de la Mer';
    if (name === 'pierre') return 'Garde Impériale';
    if (name === 'lou') return 'Juge de l\'Ombre';
    if (name === 'magernos') return 'Seigneurs de Guerre';
    if (name === 'sky_cookies') return 'Cookies Volants';
    if (name === 'z_wolf929') return 'Matelots d\'Élite';
    if (name === 'admin' || name === 'eldersea') return 'Légende';
    return 'Aucun';
  };

  const getStatusColor = (userObjOrLastActive) => {
    if (!userObjOrLastActive) return { bg: '#6b7280', glow: 'none' };
    if (typeof userObjOrLastActive === 'boolean') {
      return userObjOrLastActive ? { bg: '#10b981', glow: '0 0 6px #10b981' } : { bg: '#6b7280', glow: 'none' };
    }
    if (typeof userObjOrLastActive === 'object') {
      const isRecent = userObjOrLastActive.lastActive ? Math.abs(Date.now() - new Date(userObjOrLastActive.lastActive).getTime()) < 65000 : false;
      const isOnline = Boolean((userObjOrLastActive.isOnline === true || userObjOrLastActive.isOnline === 1 || userObjOrLastActive.isOnline === '1') && isRecent);
      return isOnline ? { bg: '#10b981', glow: '0 0 6px #10b981' } : { bg: '#6b7280', glow: 'none' };
    }
    const diff = Math.abs(Date.now() - new Date(userObjOrLastActive).getTime()) / 1000;
    if (diff <= 65) {
      return { bg: '#10b981', glow: '0 0 6px #10b981' }; // green
    } else {
      return { bg: '#6b7280', glow: 'none' }; // grey
    }
  };

  const formatLastActive = (dateStr, lang) => {
    const t = translations[lang] || translations['fr'];
    if (!dateStr) return t.offline;
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60;
    if (diff <= 3) return t.online_launcher;

    try {
      const d = new Date(dateStr);
      return d.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return t.offline;
    }
  };

  // Fetch inspected user details
  useEffect(() => {
    if (!inspectedUser) {
      setInspectedUserDetails(null);
      return;
    }

    let isMounted = true;
    const fetchInspectedUser = async () => {
      setIsInspectedLoading(true);
      try {
        const res = await fetch('https://eldersea.tekao.fr/api/users');
        if (res.ok && isMounted) {
          const users = await res.json();
          const found = users.find(u => u.pseudo && u.pseudo.toLowerCase() === inspectedUser.toLowerCase());
          if (found) {
            setInspectedUserDetails(found);
          } else {
            setInspectedUserDetails({
              pseudo: inspectedUser,
              rank: 'Joueur',
              isOnline: false,
              lastActive: null,
              createdAt: null
            });
          }
        }
      } catch (err) {
        console.error("Error fetching inspected user:", err);
        if (isMounted) {
          setInspectedUserDetails({
            pseudo: inspectedUser,
            rank: 'Joueur',
            isOnline: false,
            lastActive: null,
            createdAt: null
          });
        }
      } finally {
        if (isMounted) {
          setIsInspectedLoading(false);
        }
      }
    };

    fetchInspectedUser();
  }, [inspectedUser]);

  // Periodic status ping for the logged-in user
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    let resolvedUserId = null;

    const pingStatus = async () => {
      const pseudo = typeof user === 'string' ? user : user?.pseudo;
      if (!pseudo) return;
      try {
        const res = await fetch('https://eldersea.tekao.fr/api/users');
        if (res.ok) {
          const users = await res.json();
          const found = users.find(u => u.pseudo && u.pseudo.toLowerCase() === pseudo.toLowerCase());
          if (found) {
            resolvedUserId = found.id;
            if (window.ipcRenderer) {
              window.ipcRenderer.send('sync-active-user', { pseudo, id: found.id });
            }
            await fetch(`https://eldersea.tekao.fr/api/users/${found.id}/online`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isOnline: true })
            });
            // Vérifier et livrer d'éventuels achats en attente
            await fetch(`https://eldersea.tekao.fr/api/shop/deliver-pending?pseudo=${encodeURIComponent(pseudo)}`).catch(() => { });
          }
        }
      } catch (err) {
        console.error("Failed to ping status:", err);
      }
    };

    pingStatus();
    const interval = setInterval(pingStatus, 15000); // every 15 seconds

    const handleBeforeUnload = () => {
      if (resolvedUserId) {
        try {
          fetch(`https://eldersea.tekao.fr/api/users/${resolvedUserId}/online`, {
            method: 'PATCH',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isOnline: false })
          });
        } catch (e) { }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [isLoggedIn, user]);

  // Download progress state
  const [downloadInfo, setDownloadInfo] = useState(null);
  const downloadTracker = React.useRef({
    sessionStartTime: null,
    lastTime: null,
    currentProgress: 0,
    smoothRemaining: null
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
      let lastUpdate = 0;
      let updateTimeout = null;
      let pendingData = null;

      const updateStateNow = (data) => {
        const now = Date.now();
        lastUpdate = now;
        const tracker = downloadTracker.current;

        let progress = 0;
        if (data.total && data.total > 0) {
          progress = Math.min(100, Math.round((data.task / data.total) * 100));
        }

        // Initialize session start time for total download countdown
        if (!tracker.sessionStartTime || data.type === 'finished' || progress >= 100) {
          if (progress < 100 && data.type !== 'finished') {
            tracker.sessionStartTime = now;
            tracker.currentProgress = progress;
            tracker.smoothRemaining = null;
          }
        }

        tracker.currentProgress = Math.max(tracker.currentProgress || 0, progress);

        // Calculate global remaining time across the entire download
        let remainingText = '';
        if (tracker.sessionStartTime && tracker.currentProgress > 0 && tracker.currentProgress < 100) {
          const totalElapsed = Math.max(0.2, (now - tracker.sessionStartTime) / 1000);
          const estimatedTotalSeconds = totalElapsed / (tracker.currentProgress / 100);
          const rawRemaining = Math.max(0, estimatedTotalSeconds - totalElapsed);
          tracker.smoothRemaining = tracker.smoothRemaining === null
            ? rawRemaining
            : tracker.smoothRemaining * 0.7 + rawRemaining * 0.3;

          const rem = Math.max(1, Math.round(tracker.smoothRemaining));
          if (rem < 60) {
            remainingText = `~${rem}s restant`;
          } else {
            const mins = Math.floor(rem / 60);
            const secs = rem % 60;
            remainingText = `~${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
          }
        } else if (progress >= 100 || data.type === 'finished') {
          remainingText = 'Terminé';
          tracker.sessionStartTime = null;
        } else {
          remainingText = 'Estimation...';
        }

        let currentSpeed = data.speed;
        if (!currentSpeed && data.fileCurrent && data.fileTotal) {
          const dt = (now - (tracker.lastByteTick || now)) / 1000;
          if (dt >= 0.4) {
            const deltaBytes = Math.max(0, data.fileCurrent - (tracker.lastFileBytes || 0));
            tracker.lastFileBytes = data.fileCurrent;
            tracker.lastByteTick = now;
            const bps = deltaBytes / dt;
            if (bps >= 1048576) currentSpeed = (bps / 1048576).toFixed(1) + ' Mo/s';
            else if (bps >= 1024) currentSpeed = Math.round(bps / 1024) + ' Ko/s';
          }
        }

        setDownloadInfo(prev => ({
          type: data.type || (prev?.type || '...'),
          progress: progress > 0 ? progress : (prev?.progress || 0),
          task: data.task || 0,
          total: data.total || 100,
          filename: data.filename || null,
          speed: currentSpeed || prev?.speed || null,
          bytesText: data.bytesText || prev?.bytesText || '0.0 Mo',
          remainingText: remainingText
        }));

        if (data.type === 'finished') {
          setTimeout(() => setDownloadInfo(null), 3000);
        }
      };

      const handleProgress = (event, data) => {
        const now = Date.now();
        const isCritical =
          !data.task ||
          data.task === data.total ||
          data.type === 'finished' ||
          data.type === 'Décollage...' ||
          data.type === 'Extraction de Java...' ||
          data.type === 'Chargement Forge...';

        if (isCritical || (now - lastUpdate >= 100)) {
          if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
          }
          pendingData = null;
          updateStateNow(data);
        } else {
          pendingData = data;
          if (!updateTimeout) {
            updateTimeout = setTimeout(() => {
              if (pendingData) {
                updateStateNow(pendingData);
                pendingData = null;
              }
              updateTimeout = null;
            }, 100);
          }
        }
      };

      const handleFinished = () => {
        setDownloadInfo({ type: 'Lancement réussi !', progress: 100 });
        setTimeout(() => setDownloadInfo(null), 3000);
      };

      const handleError = (event, msg) => {
        setDownloadInfo(null);
        if (typeof msg === 'object' && msg !== null) {
          setCrashData(msg);
        } else {
          setCrashData({
            title: "Erreur de lancement",
            message: msg || "Une erreur est survenue lors de l'exécution du jeu.",
            logs: msg || "Aucun log disponible."
          });
        }
      };

      const handleGameCrashed = (event, data) => {
        setDownloadInfo(null);
        if (typeof data === 'object' && data !== null) {
          setCrashData(data);
        } else {
          setCrashData({
            title: "Crash du jeu",
            message: data,
            logs: data
          });
        }
      };

      const handleUpdateStatus = (event, data) => {
        setUpdateState(data);
      };

      const handleShowToast = (event, toast) => {
        if (toast) {
          setElderAlert({
            title: toast.title || 'NOTIFICATION ELDERSEA',
            message: toast.message || '',
            type: toast.type || 'info'
          });
        }
      };

      const handleTriggerVerifyFiles = () => {
        setIsSettingsOpen(true);
      };

      window.ipcRenderer.on('launch-progress', handleProgress);
      window.ipcRenderer.on('launch-finished', handleFinished);
      window.ipcRenderer.on('launch-error', handleError);
      window.ipcRenderer.on('game-crashed', handleGameCrashed);
      window.ipcRenderer.on('hide-progress', () => setDownloadInfo(null));
      window.ipcRenderer.on('update-status', handleUpdateStatus);
      window.ipcRenderer.on('show-toast', handleShowToast);
      window.ipcRenderer.on('trigger-verify-files', handleTriggerVerifyFiles);

      return () => {
        if (updateTimeout) clearTimeout(updateTimeout);
        window.ipcRenderer.removeAllListeners('launch-progress');
        window.ipcRenderer.removeAllListeners('launch-finished');
        window.ipcRenderer.removeAllListeners('launch-error');
        window.ipcRenderer.removeAllListeners('game-crashed');
        window.ipcRenderer.removeAllListeners('update-status');
        window.ipcRenderer.removeAllListeners('show-toast');
        window.ipcRenderer.removeAllListeners('trigger-verify-files');
      };
    }
  }, []);

  // Custom ElderSea global alert override so NO standard browser alert is ever displayed!
  useEffect(() => {
    window.alert = (msg) => {
      const text = String(msg || '');
      const isErr = text.toLowerCase().includes('erreur') || 
                    text.toLowerCase().includes('échec') || 
                    text.toLowerCase().includes('impossible') ||
                    text.toLowerCase().includes('interdit') ||
                    text.toLowerCase().includes('invalide');
      setElderAlert({
        title: isErr ? 'ATTENTION' : 'NOTIFICATION ELDERSEA',
        message: text,
        type: isErr ? 'error' : 'info'
      });
    };

    window.showElderAlert = (message, type = 'info', title = null) => {
      setElderAlert({
        title: title || (type === 'error' ? 'ERREUR' : type === 'success' ? 'SUCCÈS' : 'NOTIFICATION ELDERSEA'),
        message: String(message || ''),
        type
      });
    };
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
        setActiveChatFriend={setActiveChatFriend}
        onInspectUser={setInspectedUser}
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
          {activeTab === 'screenshots' && <ScreenshotsView setFullscreen={setFullscreenImage} setActiveTab={setActiveTab} />}
          {activeTab === 'image-hosting' && <ImageHostingView setFullscreen={setFullscreenImage} setActiveTab={setActiveTab} />}
          {activeTab === 'shop' && <ShopView />}
          {activeTab === 'profile' && <ProfileView />}
          {activeTab === 'friends' && (
            <FriendsView
              setFullscreen={setFullscreenImage}
              activeChatFriend={activeChatFriend}
              setActiveChatFriend={setActiveChatFriend}
              onInspectUser={setInspectedUser}
            />
          )}
        </div>
      </main>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      <CrashModal isOpen={!!crashData} data={crashData} onClose={() => setCrashData(null)} />

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
          position: 'fixed', bottom: '26px', right: '26px', width: '320px',
          padding: '14px 16px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '8px',
          background: 'rgba(12, 14, 22, 0.92)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '14px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.65)'
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                {downloadInfo.type === 'launching' || downloadInfo.type?.includes('Décollage') || downloadInfo.type?.includes('Forge') ? (
                  <Zap size={15} color="var(--purple-light)" />
                ) : (
                  <Download size={15} color="var(--crystal)" />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="cinzel" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--crystal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {downloadInfo.type === 'launching' ? 'LANCEMENT DU JEU' : 'TÉLÉCHARGEMENT'}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {downloadInfo.filename ? (downloadInfo.filename.includes('/') ? downloadInfo.filename.split('/').pop() : downloadInfo.filename) : downloadInfo.type}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {downloadInfo.speed && downloadInfo.speed !== '0 Ko/s' && downloadInfo.speed !== '—' && (
                <span style={{
                  fontSize: '9px', fontWeight: 700, color: '#34d399',
                  background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)',
                  padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace'
                }}>
                  {downloadInfo.speed}
                </span>
              )}
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--crystal)', fontFamily: 'monospace' }}>
                {downloadInfo.progress}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '5px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div
              className="progress-bar-animated"
              style={{
                height: '100%', width: `${downloadInfo.progress}%`,
                boxShadow: '0 0 10px rgba(212,175,55,0.5)', transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>

          {/* Bottom detail row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {downloadInfo.bytesText && (
                <span style={{ color: 'var(--crystal)', fontWeight: 700 }}>
                  {downloadInfo.bytesText}
                </span>
              )}
              {downloadInfo.task && downloadInfo.total ? (
                <span style={{ color: 'var(--text-dim)', fontSize: '9px' }}>
                  ({downloadInfo.task}/{downloadInfo.total})
                </span>
              ) : ''}
            </span>
            <span style={{ color: '#fbbf24', fontWeight: 700, fontFamily: 'monospace' }}>
              {downloadInfo.remainingText || ''}
            </span>
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

      {/* ── CUSTOM ELDERSEA ALERT / ERROR / NOTIFICATION DIALOG ── */}
      {elderAlert && (
        <div 
          className="modal-overlay fade-in" 
          onClick={() => setElderAlert(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 12000,
            background: 'rgba(5, 8, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px',
              background: 'linear-gradient(135deg, rgba(20, 26, 42, 0.96), rgba(12, 16, 28, 0.98))',
              border: elderAlert.type === 'error' ? '1px solid rgba(239, 68, 68, 0.45)' : elderAlert.type === 'success' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(212, 175, 55, 0.45)',
              borderRadius: '16px',
              padding: '28px 24px',
              boxShadow: elderAlert.type === 'error' ? '0 20px 60px rgba(239, 68, 68, 0.25)' : '0 20px 60px rgba(0, 0, 0, 0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px',
              animation: 'scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: elderAlert.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : elderAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(212, 175, 55, 0.15)',
              border: elderAlert.type === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' : elderAlert.type === 'success' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(212, 175, 55, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {elderAlert.type === 'error' ? (
                <AlertTriangle size={28} color="#ef4444" />
              ) : elderAlert.type === 'success' ? (
                <CheckCircle size={28} color="#10b981" />
              ) : (
                <Info size={28} color="var(--crystal)" />
              )}
            </div>

            <div style={{ width: '100%' }}>
              <h3 className="cinzel" style={{
                fontSize: '15px', fontWeight: 800, letterSpacing: '2px',
                color: elderAlert.type === 'error' ? '#fca5a5' : 'var(--crystal)',
                margin: '0 0 8px 0'
              }}>
                {elderAlert.title || (elderAlert.type === 'error' ? 'ATTENTION' : 'NOTIFICATION')}
              </h3>
              <p style={{
                fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6', margin: 0,
                whiteSpace: 'pre-line', wordBreak: 'break-word'
              }}>
                {elderAlert.message}
              </p>
            </div>

            <button
              onClick={() => setElderAlert(null)}
              className="btn-primary"
              style={{
                width: '100%', padding: '10px 0', fontSize: '12px', fontWeight: 700,
                letterSpacing: '1.5px', marginTop: '4px'
              }}
            >
              COMPRIS
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
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

      {/* ── 3D SKIN INSPECTION MODAL ── */}
      {inspectedUser && (
        <div
          className="modal-overlay fade-in"
          style={{
            position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setInspectedUser(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '580px', background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
              borderRadius: '20px', padding: '30px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)', display: 'flex', gap: '25px',
              alignItems: 'stretch', animation: 'fadeIn 0.2s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top border glow line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--purple), transparent)' }} />

            {/* Close button */}
            <button
              onClick={() => setInspectedUser(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}
            >
              <X size={20} />
            </button>

            {/* Left Column: 3D Render iframe */}
            <div style={{
              width: '220px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center',
              background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--border)',
              padding: '15px', position: 'relative'
            }}>
              <div style={{ width: '100%', height: '280px', position: 'relative', overflow: 'hidden' }}>
                <iframe
                  src={`https://kurojs.github.io/McView3D/embed.html?skin=${inspectedUser}&width=190&height=260`}
                  width="100%"
                  height="100%"
                  scrolling="no"
                  style={{ border: 'none', overflow: 'hidden', display: 'block' }}
                  title="3D Skin Viewer"
                />
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textAlign: 'center', fontStyle: 'italic' }}>
                Faites glisser pour faire tourner le skin
              </div>
            </div>

            {/* Right Column: Player details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h2 className="cinzel" style={{ fontSize: '20px', color: 'var(--crystal)', margin: 0, letterSpacing: '2px', fontWeight: 800 }}>
                  {inspectedUser.toUpperCase()}
                </h2>
                {inspectedUserDetails && (
                  <span
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: getStatusColor(inspectedUserDetails.lastActive).bg,
                      boxShadow: getStatusColor(inspectedUserDetails.lastActive).glow
                    }}
                  />
                )}
              </div>

              {inspectedUserDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  {/* Rank */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(212,175,55,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                      <Shield size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Grade</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--crystal)' }}>{inspectedUserDetails.rank}</div>
                    </div>
                  </div>



                  {/* Last Connection */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(212,175,55,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dernière connexion</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatLastActive(inspectedUserDetails.lastActive, language)}
                      </div>
                    </div>
                  </div>

                  {/* Member since / Registered at */}
                  {inspectedUserDetails.createdAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(212,175,55,0.08)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' }}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Membre depuis</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(inspectedUserDetails.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Chargement des détails...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* <MediaPlayer isHidden={!!downloadInfo || activeTab !== 'home'} /> */}
    </div>
  );
}

export default App;
