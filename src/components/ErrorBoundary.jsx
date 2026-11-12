import React from 'react';
import { X, Copy, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleCopy = () => {
    const errText = `${this.state.error}\n\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(errText);
    if (window.showElderAlert) {
      window.showElderAlert('Les informations d\'erreur ont été copiées dans le presse-papiers.', 'success', 'COPIÉ');
    } else {
      alert('Erreur copiée dans le presse-papier !');
    }
  };

  handleClose = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(5, 7, 10, 0.95)', backdropFilter: 'blur(15px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          fontFamily: 'Outfit, sans-serif'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '600px', background: 'var(--bg-card, #12182b)',
            border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 20px rgba(239, 68, 68, 0.2)',
            padding: '30px', position: 'relative', display: 'flex', flexDirection: 'column',
            gap: '20px', animation: 'fadeIn 0.3s ease', color: 'white'
          }}>
            <button 
              onClick={this.handleClose}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-dim, #9ca3af)', cursor: 'pointer', borderRadius: '50%',
                width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim, #9ca3af)'; e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)', padding: '15px', borderRadius: '50%',
                color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 className="cinzel" style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '1px' }}>
                  ERREUR CRITIQUE
                </h2>
                <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '4px' }}>
                  L'application a rencontré un problème inattendu.
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '15px', fontSize: '12px', color: '#fca5a5',
              maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace',
              wordBreak: 'break-all'
            }} className="custom-scrollbar">
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>{this.state.error && this.state.error.toString()}</div>
              <div style={{ opacity: 0.8, whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <button
                onClick={this.handleCopy}
                style={{
                  flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  color: 'white', fontWeight: 700, fontSize: '12px', letterSpacing: '1px',
                  textTransform: 'uppercase', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                <Copy size={16} /> Copier l'erreur
              </button>
              <button
                onClick={this.handleClose}
                style={{
                  flex: 1, padding: '14px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  border: '1px solid #f87171', borderRadius: '8px',
                  color: 'white', fontWeight: 800, fontSize: '12px', letterSpacing: '1px',
                  textTransform: 'uppercase', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
