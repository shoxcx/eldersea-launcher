import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, X, ExternalLink, FileText, Terminal } from 'lucide-react';

export default function CrashModal({ isOpen, data, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'crashReport'

  if (!isOpen || !data) return null;

  const rawLogs = typeof data === 'string' ? data : (data.logs || data.message || '');
  const crashReport = typeof data === 'object' ? data.crashReport : null;
  const exitCode = typeof data === 'object' ? data.code : null;

  const displayText = activeTab === 'crashReport' && crashReport ? crashReport : rawLogs;

  const handleCopy = () => {
    const textToCopy = `=== RAPPORT DE CRASH ELDERSEA ===\nDate : ${new Date().toLocaleString()}\nCode de sortie : ${exitCode ?? 'Non spécifié'}\n\n${displayText}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const openDiscord = () => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send('open-external-url', 'https://discord.gg/xABVSPdDk5');
    } else {
      window.open('https://discord.gg/xABVSPdDk5', '_blank');
    }
  };

  // Colorize log lines for enhanced readability
  const renderLogLines = (text) => {
    if (!text) return <span style={{ color: '#94a3b8' }}>Aucune ligne de log disponible.</span>;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let color = '#cbd5e1';
      const lower = line.toLowerCase();
      if (lower.includes('error') || lower.includes('fatal') || lower.includes('exception') || lower.includes('crash') || lower.includes('caused by')) {
        color = '#f87171'; // red
      } else if (lower.includes('warn')) {
        color = '#fbbf24'; // yellow
      } else if (lower.includes('[mclc]') || lower.includes('[forge]') || lower.includes('[jvm]')) {
        color = '#c084fc'; // purple
      } else if (lower.includes('[debug]')) {
        color = '#38bdf8'; // cyan
      }

      return (
        <div key={idx} style={{ color, display: 'flex', gap: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.2)', userSelect: 'none', width: '38px', textAlign: 'right', flexShrink: 0 }}>
            {idx + 1}
          </span>
          <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div
      className="modal-overlay fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(3, 5, 8, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="crash-card"
        style={{
          width: '840px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #180d1e 0%, #0d0f17 100%)',
          border: '1px solid rgba(239, 68, 68, 0.45)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 70px rgba(0,0,0,0.85), 0 0 45px rgba(239,68,68,0.2)',
          position: 'relative'
        }}
      >
        {/* Top Glowing Red Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #ef4444, transparent)'
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '24px 28px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2
                  className="cinzel"
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#f8fafc',
                    letterSpacing: '2px',
                    margin: 0
                  }}
                >
                  CRASH DU JEU DÉTECTÉ
                </h2>
                {exitCode !== null && exitCode !== undefined && (
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#fca5a5',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace'
                    }}
                  >
                    CODE: {exitCode}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
                Minecraft s'est arrêté de manière inattendue. Consultez le journal ci-dessous pour identifier l'origine du problème.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-dim)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
            title="Fermer la fenêtre d'erreur"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher if crashReport exists */}
        {crashReport && (
          <div style={{ display: 'flex', gap: '8px', padding: '12px 28px 0', background: 'rgba(0,0,0,0.2)' }}>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                background: activeTab === 'logs' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'logs' ? 'rgba(168, 85, 247, 0.4)' : 'transparent',
                color: activeTab === 'logs' ? 'var(--crystal)' : 'var(--text-dim)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Terminal size={14} /> Console de sortie (JVM)
            </button>
            <button
              onClick={() => setActiveTab('crashReport')}
              style={{
                background: activeTab === 'crashReport' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === 'crashReport' ? 'rgba(239, 68, 68, 0.5)' : 'transparent',
                color: activeTab === 'crashReport' ? '#fca5a5' : 'var(--text-dim)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={14} /> Rapport de crash officiel
            </button>
          </div>
        )}

        {/* Scrollable Log Container */}
        <div style={{ padding: '20px 28px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            className="custom-code-scrollbar"
            style={{
              flex: 1,
              maxHeight: '380px',
              minHeight: '200px',
              overflowY: 'auto',
              background: '#07090e',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'Consolas, "Fira Code", Monaco, monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6)'
            }}
          >
            {renderLogLines(displayText)}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px 22px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={openDiscord}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(88, 101, 242, 0.15)',
                border: '1px solid rgba(88, 101, 242, 0.35)',
                color: '#818cf8',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(88, 101, 242, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(88, 101, 242, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(88, 101, 242, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <ExternalLink size={14} /> Demander de l'aide sur Discord
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid',
                borderColor: copied ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
                color: copied ? '#34d399' : 'var(--crystal)',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Rapport copié !' : 'Copier l\'erreur (C/C)'}
            </button>

            <button
              onClick={onClose}
              className="btn-primary"
              style={{
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '1px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              FERMER
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-code-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-code-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .custom-code-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.3);
          border-radius: 4px;
        }
        .custom-code-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(239, 68, 68, 0.6);
        }
      `}} />
    </div>
  );
}

