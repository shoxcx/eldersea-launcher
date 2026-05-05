import React, { useState } from 'react';
import { useAuthStore } from '../store/useStore';
import { firebaseService } from '../services/firebase';
import { X, User, Lock, Mail, Eye, EyeOff, ShieldCheck, Smartphone } from 'lucide-react';
import * as OTPAuth from 'otpauth';
import { QRCodeSVG } from 'qrcode.react';

const AuthModal = ({ onClose }) => {
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [step, setStep] = useState('auth'); // 'auth', 'setup2fa', 'verify2fa'
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vCode, setVCode] = useState('');
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [currentUserData, setCurrentUserData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login: setStoreLogin } = useAuthStore();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const user = await firebaseService.login(pseudo, password);
        if (user.twoFaSecret) {
          setTwoFaSecret(user.twoFaSecret);
          setCurrentUserData(user);
          setStep('verify2fa');
        } else {
          setStoreLogin(user.pseudo, user.email, user.createdAt);
          onClose();
        }
      } else {
        const exists = await firebaseService.checkUserExists(pseudo);
        if (exists) {
          setError('Ce pseudo est déjà utilisé.');
          setLoading(false);
          return;
        }
        
        // Setup 2FA with otpauth
        const secret = new OTPAuth.Secret({ size: 20 });
        setTwoFaSecret(secret.base32);
        setStep('setup2fa');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    }
    setLoading(false);
  };

  const handleSetup2FA = async (e) => {
    e.preventDefault();
    // Verify code with otpauth
    let totp = new OTPAuth.TOTP({
      issuer: 'ElderSea',
      label: pseudo,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: twoFaSecret
    });

    const delta = totp.validate({ token: vCode, window: 1 });
    if (delta === null) {
      setError('Code de vérification incorrect.');
      return;
    }

    setLoading(true);
    try {
      await firebaseService.register({ pseudo, email, password, twoFaSecret });
      setStoreLogin(pseudo, email);
      onClose();
    } catch (err) {
      setError('Erreur lors de la création du compte.');
    }
    setLoading(false);
  };

  const handleVerify2FA = (e) => {
    e.preventDefault();
    let totp = new OTPAuth.TOTP({
      issuer: 'ElderSea',
      label: pseudo,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: twoFaSecret
    });

    const delta = totp.validate({ token: vCode, window: 1 });
    if (delta !== null) {
      setStoreLogin(currentUserData.pseudo, currentUserData.email, currentUserData.createdAt);
      onClose();
    } else {
      setError('Code 2FA incorrect.');
    }
  };

  const getOtpAuthUrl = () => {
    let totp = new OTPAuth.TOTP({
      issuer: 'ElderSea',
      label: pseudo,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: twoFaSecret
    });
    return totp.toString();
  };

  return (
    <div className="modal-overlay fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="auth-card" style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
        borderRadius: '20px', padding: '40px', width: '420px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--crystal), transparent)' }} />
        
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}>
          <X size={20} />
        </button>

        {step === 'auth' && (
          <>
            <h2 className="cinzel" style={{ textAlign: 'center', fontSize: '18px', color: 'var(--crystal)', marginBottom: '32px', letterSpacing: '3px' }}>
              {tab === 'login' ? 'BIENVENUE' : 'NOUVEAU COMPTE'}
            </h2>

            <div className="auth-tabs" style={{ display: 'flex', gap: 0, marginBottom: '32px', background: 'var(--bg-dark)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
              <div className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>CONNEXION</div>
              <div className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>INSCRIPTION</div>
            </div>

            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label className="form-label">Pseudo Minecraft</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input type="text" className="form-input" placeholder="Ex: Steve" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required style={{ paddingLeft: '44px' }} />
                </div>
              </div>

              {tab === 'register' && (
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input type="email" className="form-input" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ paddingLeft: '44px' }} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input type={showPassword ? "text" : "password"} className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingLeft: '44px', paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '16px', textAlign: 'center', background: 'rgba(248,113,113,0.1)', padding: '8px', borderRadius: '8px' }}>{error}</div>}

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: '13px', marginTop: '10px' }}>
                {loading ? 'CHARGEMENT...' : tab === 'login' ? 'SE CONNECTER' : 'CONTINUER'}
              </button>
            </form>
          </>
        )}

        {step === 'setup2fa' && (
          <div className="verify-step fade-in" style={{ textAlign: 'center' }}>
            <h2 className="cinzel" style={{ fontSize: '18px', color: 'white', marginBottom: '15px' }}>DOUBLE AUTHENTIFICATION</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>Scannez ce QR Code avec l'application <strong>Google Authenticator</strong>.</p>
            
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}>
              <QRCodeSVG value={getOtpAuthUrl()} size={160} />
            </div>

            <form onSubmit={handleSetup2FA}>
              <div className="form-group">
                <input 
                  type="text" maxLength="6" className="form-input" 
                  style={{ textAlign: 'center', fontSize: '22px', letterSpacing: '6px', fontWeight: 700 }}
                  placeholder="000000" value={vCode} onChange={(e) => setVCode(e.target.value)} required 
                />
              </div>
              {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '16px' }}>{error}</div>}
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px' }}>
                VALIDER ET CRÉER
              </button>
            </form>
          </div>
        )}

        {step === 'verify2fa' && (
          <div className="verify-step fade-in" style={{ textAlign: 'center' }}>
             <div style={{ background: 'rgba(212,175,55,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <ShieldCheck size={32} color="var(--purple)" />
              </div>
            <h2 className="cinzel" style={{ fontSize: '18px', color: 'white', marginBottom: '10px' }}>SÉCURITÉ 2FA</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '25px' }}>Entrez le code à 6 chiffres de votre application mobile.</p>

            <form onSubmit={handleVerify2FA}>
              <div className="form-group">
                <input 
                  type="text" maxLength="6" className="form-input" 
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 700 }}
                  placeholder="000000" value={vCode} onChange={(e) => setVCode(e.target.value)} required 
                />
              </div>
              {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '16px' }}>{error}</div>}
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '13px' }}>
                SE CONNECTER
              </button>
              <button type="button" onClick={() => setStep('auth')} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '12px', marginTop: '15px', cursor: 'pointer' }}>
                Retour
              </button>
            </form>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-tab { flex:1; padding:9px; text-align:center; cursor:pointer; border-radius:8px; font-size:11px; font-family:'Cinzel',serif; font-weight:600; letter-spacing:1px; transition:all 0.25s; color:var(--text-dim); }
        .auth-tab.active { background:linear-gradient(135deg, var(--purple-glow), var(--purple)); color:white; box-shadow:0 0 20px rgba(212,175,55,0.4); }
        .form-group { margin-bottom:18px; }
        .form-label { display:block; font-size:10px; letter-spacing:2px; color:var(--text-muted); margin-bottom:7px; font-family:'Cinzel',serif; text-transform:uppercase; font-weight:700; }
        .form-input { width:100%; padding:12px 16px; background:var(--bg-dark); border:1px solid var(--border); border-radius:10px; color:var(--text-primary); font-size:14px; outline:none; transition:all 0.2s; }
        .form-input:focus { border-color:var(--purple-light); box-shadow:0 0 0 3px rgba(212,175,55,0.1); }
      `}} />
    </div>
  );
};

export default AuthModal;
