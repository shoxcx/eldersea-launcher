import React, { useState } from 'react';
import { useAuthStore, useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { firebaseService, hashPassword } from '../services/firebase';
import { User, ShieldCheck, Mail, Calendar, Lock, Eye, EyeOff, CheckCircle, Key } from 'lucide-react';

const ProfileView = () => {
  const { user, logout } = useAuthStore();
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  
  const [showPwd, setShowPwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [isPremium, setIsPremium] = useState(false);

  React.useEffect(() => {
    const checkStatus = async () => {
      if (user?.pseudo) {
        const result = await window.ipcRenderer.invoke('check-mojang', user.pseudo);
        setIsPremium(result);
      }
    };
    checkStatus();
  }, [user]);

  if (!user) return null;

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      setStatus({ type: 'error', msg: 'Veuillez saisir votre mot de passe actuel.' });
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    
    try {
      setStatus({ type: '', msg: 'Vérification...' });
      
      // Essayer de se connecter avec le mot de passe actuel pour le vérifier
      try {
        await firebaseService.login(user.pseudo, currentPassword);
      } catch (loginErr) {
        setStatus({ type: 'error', msg: 'Mot de passe actuel incorrect.' });
        return;
      }

      const success = await firebaseService.updatePassword(user.pseudo, newPassword);
      if (success) {
        setStatus({ type: 'success', msg: 'Mot de passe mis à jour !' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error("Erreur de mise à jour");
      }
    } catch (e) {
      setStatus({ type: 'error', msg: 'Erreur lors de la mise à jour.' });
    }
  };

  return (
    <div className="profile-view fade-in" style={{ padding: '40px 60px', height: '100%', overflowY: 'auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h2 className="cinzel" style={{ fontSize: '24px', letterSpacing: '4px', color: 'var(--crystal)' }}>{t.profile.toUpperCase()}</h2>
        <div style={{ width: '60px', height: '3px', background: 'var(--purple)', marginTop: '10px' }}></div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', alignItems: 'start' }}>
        
        {/* ── Left Column: Identity ── */}
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '25px' }}>
            <div style={{ position: 'absolute', inset: '-10px', borderRadius: '20px', border: '2px solid var(--purple)', opacity: 0.3, animation: 'pulse 2s infinite' }}></div>
            <img 
              src={`https://mc-heads.net/avatar/${user.pseudo}/128`} 
              alt="Skin" 
              style={{ width: '128px', height: '128px', borderRadius: '15px', position: 'relative', zIndex: 2, background: 'var(--bg-dark)' }} 
            />
          </div>
          
          <h3 className="cinzel" style={{ fontSize: '22px', color: 'white', marginBottom: '5px', letterSpacing: '1px' }}>{user.pseudo}</h3>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: isPremium ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', 
            color: isPremium ? '#34d399' : '#f87171', 
            padding: '6px 15px', borderRadius: '99px', fontSize: '11px', fontWeight: 800 
          }}>
            <ShieldCheck size={14} /> {isPremium ? 'PREMIUM ACCOUNT' : 'CRACK ACCOUNT'}
          </div>

          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '30px 0' }}></div>

          <div style={{ width: '100%', display: 'grid', gap: '20px', textAlign: 'left' }}>
            <div className="profile-info-row">
              <label style={labelStyle}><Mail size={14} /> {t.email}</label>
              <div style={valStyle}>{user.email}</div>
            </div>
            <div className="profile-info-row">
              <label style={labelStyle}><Calendar size={14} /> {t.created_at}</label>
              <div style={valStyle}>{user.createdAt}</div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div className="glass-panel" style={{ padding: '35px' }}>
            <h4 className="cinzel" style={{ fontSize: '14px', color: 'var(--purple-light)', marginBottom: '25px', letterSpacing: '2px' }}>{t.change_password}</h4>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={iconInputStyle} />
                <input 
                  type={showPwd ? "text" : "password"} 
                  placeholder="Code 2FA / mdp actuel (app google auth)" 
                  className="profile-input" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={16} style={iconInputStyle} />
                <input 
                  type={showPwd ? "text" : "password"} 
                  placeholder={t.new_password} 
                  className="profile-input" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
                <button onClick={() => setShowPwd(!showPwd)} style={eyeBtnStyle}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={16} style={iconInputStyle} />
                <input 
                  type={showPwd ? "text" : "password"} 
                  placeholder={t.confirm_password} 
                  className="profile-input" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>

              {status.msg && (
                <div style={{ 
                  padding: '12px', borderRadius: '8px', fontSize: '12px',
                  background: status.type === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
                  color: status.type === 'error' ? '#f87171' : '#34d399',
                  border: `1px solid ${status.type === 'error' ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`
                }}>
                  {status.msg}
                </div>
              )}

              <button className="btn-primary" onClick={handleUpdatePassword} style={{ padding: '14px', fontSize: '13px', marginTop: '10px' }}>
                {t.save}
              </button>
            </div>
          </div>

          <div className="glass-panel logout-danger" onClick={logout} style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.3s', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ padding: '10px', background: 'rgba(248,113,113,0.1)', borderRadius: '10px' }}>
                  <User size={20} color="#f87171" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f87171' }}>{t.logout.toUpperCase()}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(248,113,113,0.6)' }}>Quitter la session actuelle</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.5; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        .profile-input {
          width: 100%; padding: 14px 20px 14px 48px; background: rgba(0,0,0,0.3);
          border: 1px solid var(--border); border-radius: 12px; color: white;
          outline: none; transition: all 0.3s;
        }
        .profile-input:focus { border-color: var(--purple-light); background: rgba(212,175,55,0.05); }
        .logout-danger:hover { background: rgba(248,113,113,0.05) !important; border-color: #f87171 !important; }
      `}} />
    </div>
  );
};

const labelStyle = { fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 };
const valStyle = { fontSize: '15px', color: 'var(--silver-bright)', background: 'rgba(255,255,255,0.03)', padding: '12px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' };
const iconInputStyle = { position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' };
const eyeBtnStyle = { position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' };

export default ProfileView;
