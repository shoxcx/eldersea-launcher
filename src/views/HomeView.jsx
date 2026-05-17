import React, { useState, useEffect } from 'react';
import { useAuthStore, useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { Play, X, Lightbulb, ChevronDown } from 'lucide-react';

const HomeView = ({ onOpenAuth, setSelectedNews }) => {
  const { user, isLoggedIn } = useAuthStore();
  const { ram, language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  const [isLaunching, setIsLaunching] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);

  const [newsList, setNewsList] = useState([]);

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('game-status', (_, running) => {
        setGameRunning(running);
        if (!running) setIsLaunching(false);
      });

      window.ipcRenderer.invoke('check-game-running').then(running => {
        setGameRunning(running);
      });
    }

    const fetchNews = async () => {
      try {
        const res = await fetch('https://oracle-73d32-default-rtdb.europe-west1.firebasedatabase.app/eldersea_news.json');
        if (!res.ok) return;
        const data = await res.json();
        if (data && !data.error) {
          const arr = Array.isArray(data) ? data : Object.values(data);
          arr.sort((a,b) => new Date(b.date) - new Date(a.date));
          setNewsList(arr);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      }
    };
    fetchNews();
  }, []);

  const handleLaunch = () => {
    if (!isLoggedIn) {
      onOpenAuth();
      return;
    }
    if (gameRunning) return;

    setIsLaunching(true);
    if (window.ipcRenderer) {
      window.ipcRenderer.send('launch-started');
      window.ipcRenderer.send('launch-game', { pseudo: user.pseudo, ram, installPath: null });
      window.ipcRenderer.on('launch-error', (_, err) => { 
        setIsLaunching(false); 
        setGameRunning(false);
        alert('Erreur: ' + err); 
      });
      window.ipcRenderer.on('launch-finished', () => { 
        setIsLaunching(false); 
        setGameRunning(false);
      });
    } else {
      setTimeout(() => { setIsLaunching(false); alert('Jeu lancé ! (Simulation)'); }, 2000);
    }
  };

  const [scrollY, setScrollY] = useState(0);

  const handleScroll = (e) => {
    setScrollY(e.target.scrollTop);
  };

  const isScrolled = scrollY > 100;
  // Smoother interpolation for scaling
  const heroScale = Math.max(0.65, 1 - Math.min(scrollY, 400) / 600);
  const heroOpacity = Math.max(0.2, 1 - Math.min(scrollY, 400) / 500);

  return (
    <div 
      className="home-view fade-in custom-scrollbar" 
      onScroll={handleScroll}
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative'
      }}
    >
      {/* ── HERO SECTION ── */}
      <section className="home-hero" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '40px',
        flexShrink: 0,
        minHeight: 'calc(100vh - 120px)',
        height: 'calc(100vh - 120px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: heroOpacity,
        transform: `scale(${heroScale})`,
        transformOrigin: 'center center',
        position: 'relative',
        zIndex: 5
      }}>
        <div className="hero-logo-wrap" style={{ 
          position: 'relative', textAlign: 'center',
          transition: 'all 0.6s ease'
        }}>
          <img 
            src="logo.png" 
            alt="ElderSea Logo" 
            style={{ 
              width: '480px',
              maxWidth: '80vw',
              position: 'relative', 
              zIndex: 2, 
              filter: 'drop-shadow(0 0 40px rgba(212,175,55,0.3))',
              transition: 'all 0.6s ease'
            }} 
          />
        </div>

        <div className="hero-actions" style={{ 
          position: 'relative', zIndex: 10,
          transition: 'all 0.6s ease'
        }}>
          <button className="play-btn" onClick={handleLaunch} disabled={isLaunching || gameRunning} style={{ 
            padding: '18px 64px', 
            fontSize: '18px',
            transition: 'all 0.6s ease',
            boxShadow: '0 0 30px rgba(212,175,55,0.2)'
          }}>
            {gameRunning ? 'EN JEU' : (isLaunching ? t.launching : t.play)}
          </button>
        </div>

        {/* Scroll Indicator */}
        {newsList.length > 0 && (
          <div className="scroll-indicator fade-in" style={{
            position: 'absolute', bottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '3px', fontWeight: 700, textTransform: 'uppercase',
            opacity: Math.max(0, 1 - scrollY / 100),
            transition: 'opacity 0.3s ease'
          }}>
            <span>Dernières actualités</span>
            <div className="bounce" style={{ animation: 'bounce 2s infinite' }}>
              <ChevronDown size={18} color="var(--purple)" />
            </div>
          </div>
        )}
      </section>

      {/* ── NEWS SECTION ── */}
      <div 
        className="news-container"
        style={{ 
          position: 'relative',
          zIndex: 10,
          background: 'linear-gradient(to bottom, transparent, rgba(5,7,10,0.8) 150px, rgba(5,7,10,0.95))',
          minHeight: newsList.length === 0 ? 'auto' : '100vh',
          paddingTop: '40px'
        }}
      >
        <section className="section-header" style={{ 
          display: 'flex', alignItems: 'center', padding: '40px 50px 20px',
        }}>
          <div className="section-title cinzel" style={{ fontSize: '12px', fontWeight: 800, color: 'var(--crystal)', letterSpacing: '4px' }}>{t.latest_news}</div>
          <div className="section-line" style={{ flex: 1, height: '1px', marginLeft: '25px', background: 'linear-gradient(90deg, var(--border-bright), transparent)', opacity: 0.4 }} />
        </section>

        <div style={{ padding: '20px 50px 100px' }}>
          {newsList.length === 0 ? (
             <div style={{color:'var(--text-muted)', textAlign:'center', marginTop:'40px'}}>Aucune actualité pour le moment.</div>
          ) : (
            <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '30px', alignItems: 'start' }}>
              {newsList.map((item, i) => (
                <div 
                  key={i} 
                  className="news-card glass-panel" 
                  style={{ padding: '0', display: 'flex', flexDirection: 'column', height: 'fit-content', cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => setSelectedNews(item)}
                >
                  {item.image && (
                    <div style={{ width: '100%', height: '180px', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid var(--glass-border)' }}></div>
                  )}
                  <div style={{ padding: '30px' }}>
                    <div className="news-tag cinzel" style={{ display: 'inline-block', fontSize: '9px', color: '#111', background: 'var(--purple-light)', padding: '5px 10px', borderRadius: '4px', marginBottom: '14px', fontWeight: 900 }}>{item.tag || 'INFO'}</div>
                    <div className="news-title cinzel" style={{ fontSize: '19px', fontWeight: 800, color: '#f8fafc', marginBottom: '14px' }}>{item.title || 'Nouvelle'}</div>
                    <div className="news-body" style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: (item.content || '').substring(0, 120) + '...' }}></div>
                    <div className="news-date" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '25px', fontStyle: 'italic', fontWeight: 600 }}>{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-8px);}
          60% {transform: translateY(-4px);}
        }
      `}} />
    </div>
  );
};

export default HomeView;
