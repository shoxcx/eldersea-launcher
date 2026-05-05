import React, { useState, useEffect } from 'react';
import { useAuthStore, useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { Play, X, Lightbulb } from 'lucide-react';

const HomeView = ({ onOpenAuth }) => {
  const { user, isLoggedIn } = useAuthStore();
  const { ram, language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  const [isLaunching, setIsLaunching] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);

  const [newsList, setNewsList] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.on('game-status', (_, running) => {
        setGameRunning(running);
        if (!running) setIsLaunching(false);
      });

      // Vérification immédiate au montage du composant
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

  return (
    <div className="home-view fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── HERO ── */}
      <section className="home-hero" style={{ 
        padding: '50px 50px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', flexShrink: 0 
      }}>
        <div className="hero-logo-wrap" style={{ position: 'relative', textAlign: 'center', padding: '20px' }}>
          <img 
            src="/logo.png" 
            alt="ElderSea Logo" 
            style={{ 
              width: '450px', 
              position: 'relative', 
              zIndex: 2, 
              filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.3))' 
            }} 
          />
        </div>

        <div className="hero-actions" style={{ position: 'relative', zIndex: 5 }}>
          <button className="play-btn" onClick={handleLaunch} disabled={isLaunching || gameRunning} style={{ padding: '16px 54px', fontSize: '17px' }}>
            {gameRunning ? 'EN JEU' : (isLaunching ? t.launching : t.play)}
          </button>
        </div>
      </section>

      {/* ── NEWS ── */}
      <section className="section-header" style={{ display: 'flex', alignItems: 'center', padding: '10px 50px 15px' }}>
        <div className="section-title cinzel" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--crystal)', letterSpacing: '3px' }}>{t.latest_news}</div>
        <div className="section-line" style={{ flex: 1, height: '1px', marginLeft: '20px', background: 'linear-gradient(90deg, var(--border-bright), transparent)' }} />
      </section>

      <div className="news-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '10px 50px 40px' }}>
        {newsList.length === 0 ? (
           <div style={{color:'var(--text-muted)', textAlign:'center', marginTop:'20px'}}>Aucune actualité pour le moment.</div>
        ) : (
          <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
            {newsList.map((item, i) => (
              <div 
                key={i} 
                className="news-card glass-panel" 
                style={{ padding: '0', display: 'flex', flexDirection: 'column', height: 'fit-content', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => setSelectedNews(item)}
              >
                {item.image && (
                  <div style={{ width: '100%', height: '140px', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid var(--glass-border)' }}></div>
                )}
                <div style={{ padding: '24px' }}>
                  <div className="news-tag cinzel" style={{ display: 'inline-block', fontSize: '10px', color: '#111', background: 'var(--purple-light)', padding: '4px 8px', borderRadius: '4px', marginBottom: '12px', fontWeight: 900 }}>{item.tag || 'INFO'}</div>
                  <div className="news-title cinzel" style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginBottom: '12px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{item.title || 'Nouvelle'}</div>
                  <div className="news-body" style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: (item.content || '').substring(0, 100) + '...' }}></div>
                  <div className="news-date" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '20px', fontStyle: 'italic' }}>{item.date ? new Date(item.date).toLocaleDateString('fr-FR') : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FULLSCREEN NEWS MODAL ── */}
      {selectedNews && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(5, 7, 10, 0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
        }}>
          <div style={{
            width: '100%', maxWidth: '850px', maxHeight: '90vh', background: 'var(--bg-panel)',
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
                  <div style={{ color: 'var(--text-main)', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.6 }}>
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
};

export default HomeView;
