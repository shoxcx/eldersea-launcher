import React from 'react';
import { useSettingsStore, useAuthStore } from '../store/useStore';
import { translations } from '../translations';
import { Home, Package, Camera, ShoppingBag, Settings, User, ChevronDown, LogOut, ChevronUp, Users, UserPlus } from 'lucide-react';
import packageJson from '../../package.json';

const Sidebar = ({ activeTab, setActiveTab, onOpenSettings, onOpenAuth, isProfileOpen, onToggleProfile, setActiveChatFriend, onInspectUser }) => {
  const { language } = useSettingsStore();
  const { user, isLoggedIn, logout, accounts, switchAccount, removeAccount } = useAuthStore();
  const [isAccountsMenuOpen, setIsAccountsMenuOpen] = React.useState(true);

  const effectiveAccounts = React.useMemo(() => {
    if (!isLoggedIn || !user) return [];
    const list = Array.isArray(accounts) ? [...accounts] : [];
    if (!list.some(a => (a.pseudo || '').toLowerCase() === (user.pseudo || '').toLowerCase())) {
      list.unshift(user);
    }
    return list;
  }, [accounts, user, isLoggedIn]);
  const t = translations[language] || translations['fr'];

  const getPseudo = () => {
    if (typeof user === 'string') return user;
    return user?.pseudo || user?.username || t.player;
  };

  const [isPremium, setIsPremium] = React.useState(false);
  const [isFriendsExpanded, setIsFriendsExpanded] = React.useState(false);

  const [sidebarFriends, setSidebarFriends] = React.useState([]);
  const [incomingCount, setIncomingCount] = React.useState(0);
  const [friendsWithUnread, setFriendsWithUnread] = React.useState({});
  const [apiUsers, setApiUsers] = React.useState([]);

  const processFriendsData = (data) => {
    if (!data) return;
    const rawPseudo = (typeof user === 'string' ? user : (user?.pseudo || user?.username || '')).trim();
    if (!rawPseudo) return;
    const curL = rawPseudo.toLowerCase();

    const requests = Array.isArray(data.requests) ? data.requests : [];
    const friends = Array.isArray(data.friends) ? data.friends : [];
    const messages = Array.isArray(data.messages) ? data.messages : [];

    // Count incoming requests
    const incomingReqs = requests.filter(r => r && r.to && r.to.trim().toLowerCase() === curL);

    // Count unread messages and track senders
    let unreadCount = 0;
    const unreadMap = {};
    messages.forEach(m => {
      if (m && m.to && m.to.trim().toLowerCase() === curL) {
        const sender = (m.from || '').trim().toLowerCase();
        const lastRead = parseInt(localStorage.getItem(`chat_last_read_${curL}_${sender}`) || '0', 10);
        if (m.timestamp > lastRead) {
          unreadCount++;
          unreadMap[sender] = (unreadMap[sender] || 0) + 1;
        }
      }
    });

    setIncomingCount(incomingReqs.length + unreadCount);
    setFriendsWithUnread(unreadMap);

    const list = [];
    friends.forEach(f => {
      if (!f) return;
      const u1L = (f.user1 || '').trim().toLowerCase();
      const u2L = (f.user2 || '').trim().toLowerCase();
      if (u1L === curL && f.user2 && !list.some(x => x.toLowerCase() === u2L)) {
        list.push(f.user2.trim());
      } else if (u2L === curL && f.user1 && !list.some(x => x.toLowerCase() === u1L)) {
        list.push(f.user1.trim());
      }
    });
    setSidebarFriends(list);
  };

  const loadSidebarFriends = async () => {
    if (!isLoggedIn) return;
    let data = null;
    if (window.ipcRenderer) {
      try {
        data = await window.ipcRenderer.invoke('friends-get-data');
      } catch (e) {
        console.error("Failed to load sidebar friends via IPC:", e);
      }
    }

    // Cloud fallback: eldersea.tekao.fr/api/users/12
    if (!data || !Array.isArray(data.friends)) {
      try {
        const res = await fetch('https://eldersea.tekao.fr/api/users/12');
        if (res.ok) {
          const userObj = await res.json();
          if (userObj && userObj.bio) {
            data = JSON.parse(userObj.bio);
          }
        }
      } catch (e) {
        console.error("Failed cloud fallback sidebar friends load:", e);
      }
    }

    if (data) {
      processFriendsData(data);
    }
  };

  const fetchSidebarUsers = async () => {
    try {
      const res = await fetch('https://eldersea.tekao.fr/api/users');
      if (res.ok) {
        const users = await res.json();
        setApiUsers(users);
      }
    } catch (e) { }
  };

  React.useEffect(() => {
    if (isLoggedIn) {
      loadSidebarFriends();
      fetchSidebarUsers();
      const friendsInterval = setInterval(loadSidebarFriends, 4000);
      const usersInterval = setInterval(fetchSidebarUsers, 2500);
      const handleFriendsUpdate = (e) => {
        if (e && e.detail) {
          processFriendsData(e.detail);
        } else {
          loadSidebarFriends();
        }
      };
      window.addEventListener('friends-data-updated', handleFriendsUpdate);
      return () => {
        clearInterval(friendsInterval);
        clearInterval(usersInterval);
        window.removeEventListener('friends-data-updated', handleFriendsUpdate);
      };
    }
  }, [isLoggedIn, user]);

  const getFriendDetails = (pseudo) => {
    if (!pseudo) return { online: false, lastActive: null, avatar: 'https://minotar.net/avatar/Steve/32' };
    const cleanPseudo = pseudo.trim().toLowerCase();
    const found = apiUsers.find(u => u && u.pseudo && u.pseudo.toLowerCase().trim() === cleanPseudo);

    let isOnline = false;
    if (found) {
      const isRecent = found.lastActive ? Math.abs(Date.now() - new Date(found.lastActive).getTime()) < 65000 : false;
      isOnline = Boolean((found.isOnline === true || found.isOnline === 1 || found.isOnline === '1') && isRecent);
    }

    return {
      online: isOnline,
      lastActive: found?.lastActive || null,
      avatar: `https://minotar.net/avatar/${pseudo}/32`
    };
  };

  const getStatusColor = (isOnlineOrLastActive) => {
    if (typeof isOnlineOrLastActive === 'boolean') {
      return isOnlineOrLastActive ? { bg: '#10b981', glow: '0 0 8px #10b981' } : { bg: '#6b7280', glow: 'none' };
    }
    if (!isOnlineOrLastActive) return { bg: '#6b7280', glow: 'none' };
    const diff = Math.abs(Date.now() - new Date(isOnlineOrLastActive).getTime()) / 1000;
    if (diff <= 65) {
      return { bg: '#10b981', glow: '0 0 8px #10b981' };
    } else {
      return { bg: '#6b7280', glow: 'none' };
    }
  };

  const handleFriendClick = (friend) => {
    setActiveChatFriend(friend);
    setActiveTab('friends');
  };

  React.useEffect(() => {
    const checkStatus = async () => {
      const pseudo = getPseudo();
      if (pseudo && pseudo !== t.player) {
        const result = await window.ipcRenderer.invoke('check-mojang', pseudo);
        setIsPremium(result);
      }
    };
    checkStatus();
  }, [user]);

  const getSkinHead = () => {
    const pseudo = getPseudo();
    if (pseudo !== t.player) {
      return `https://minotar.net/avatar/${pseudo}/64`;
    }
    return 'https://minotar.net/avatar/Steve/64';
  };

  const onlineFriendsCount = isLoggedIn ? sidebarFriends.filter(f => getFriendDetails(f).online).length : 0;

  const menuItems = [
    { id: 'home', label: t.home, icon: <Home size={18} /> },
    { id: 'screenshots', label: t.captures, icon: <Camera size={18} /> },
    { id: 'shop', label: t.shop, icon: <ShoppingBag size={18} />, special: 'nav-shop' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '30px 5px', textAlign: 'center' }}>
        <img
          className="logo-gem"
          src="logo.png"
          alt="ElderSea"
          style={{
            width: '230px',
            filter: 'drop-shadow(0 0 25px rgba(212,175,55,0.4))',
            marginTop: '2.5px'
          }}
        />
        <div className="logo-text" style={{ marginTop: '15px' }}>
          <span className="version cinzel" style={{ fontSize: '10px', color: 'var(--purple-light)', letterSpacing: '2px' }}>
            V{packageJson.version} MODDED 1.20.1
          </span>
        </div>
      </div>

      <div className="nav-section" style={{ padding: '0 16px' }}>
        <div className="nav-label cinzel" style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--text-dim)', padding: '0 8px 12px' }}>
          {t.navigation}
        </div>

        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''} ${item.special || ''}`}
            onClick={() => {
              if (item.id === 'shop') {
                window.ipcRenderer.send('open-external-url', 'https://eldersea.tekao.fr/boutique');
              } else {
                setActiveTab(item.id);
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom" style={{ marginTop: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>

        {/* ── REDESIGNED SIDEBAR FRIENDS LIST ── */}
        {isLoggedIn && (
          <div className="sidebar-friends-section" style={{
            background: 'rgba(168, 85, 247, 0.03)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
            borderRadius: '12px',
            padding: isFriendsExpanded ? '12px' : '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: isFriendsExpanded ? '10px' : '0px',
            maxHeight: isFriendsExpanded ? '200px' : '38px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            cursor: isFriendsExpanded ? 'default' : 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            marginBottom: '8px'
          }}
            onClick={() => {
              if (!isFriendsExpanded) {
                setIsFriendsExpanded(true);
                loadSidebarFriends();
              }
            }}
          >
            <div
              className="cinzel"
              onClick={(e) => {
                if (isFriendsExpanded) {
                  e.stopPropagation();
                  setIsFriendsExpanded(false);
                }
              }}
              style={{
                fontSize: '10px',
                letterSpacing: '1.5px',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                paddingBottom: isFriendsExpanded ? '8px' : '0px',
                borderBottom: isFriendsExpanded ? '1px solid rgba(168, 85, 247, 0.15)' : 'none',
                fontWeight: 700,
                userSelect: 'none',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={13} color="var(--purple-light)" style={{ filter: 'drop-shadow(0 0 4px var(--purple-light))' }} />
                <span style={{ fontWeight: 800, color: 'var(--crystal)' }}>{language === 'en' ? 'FRIENDS LIST' : "LISTE D'AMIS"}</span>
                {onlineFriendsCount > 0 && (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: '#10b981',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontSize: '8px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    boxShadow: '0 0 6px rgba(16, 185, 129, 0.15)',
                    marginLeft: '4px'
                  }}>
                    {onlineFriendsCount} LIGNE
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {incomingCount > 0 && !isFriendsExpanded && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    boxShadow: '0 0 6px #ef4444'
                  }}>
                    {incomingCount}
                  </span>
                )}
                {isFriendsExpanded ? <ChevronUp size={12} color="var(--text-dim)" /> : <ChevronDown size={12} color="var(--text-dim)" />}
              </div>
            </div>
            <div
              className="custom-scrollbar"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                overflowY: isFriendsExpanded ? 'auto' : 'hidden',
                flex: 1,
                maxHeight: isFriendsExpanded ? '180px' : '0px',
                opacity: isFriendsExpanded ? 1 : 0,
                pointerEvents: isFriendsExpanded ? 'auto' : 'none',
                marginTop: isFriendsExpanded ? '4px' : '0px',
                paddingRight: '4px',
                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-top 0.3s ease',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--purple) transparent'
              }}
            >
              {sidebarFriends.length === 0 ? (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '15px 0' }}>
                  {t.no_friends}
                </div>
              ) : (
                sidebarFriends.map(friend => {
                  const details = getFriendDetails(friend);
                  const statusColor = getStatusColor(details.online);
                  return (
                    <div
                      key={friend}
                      onClick={() => handleFriendClick(friend)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid transparent',
                        transition: 'all 0.2s'
                      }}
                      className="sidebar-friend-item"
                    >
                      <div style={{ position: 'relative', display: 'flex' }}>
                        <img
                          src={details.avatar}
                          alt="avatar"
                          onClick={(e) => { e.stopPropagation(); onInspectUser(friend); }}
                          style={{ width: '18px', height: '18px', borderRadius: '3px', imageRendering: 'pixelated', border: '1px solid rgba(255,255,255,0.05)', cursor: 'zoom-in' }}
                          title="Inspecter le profil"
                        />
                        {friendsWithUnread[friend.toLowerCase()] > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '1px 3px',
                            fontSize: '7px',
                            fontWeight: 'bold',
                            boxShadow: '0 0 4px #ef4444',
                            zIndex: 2
                          }}>
                            +{friendsWithUnread[friend.toLowerCase()]}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {friend}
                      </span>
                      <span
                        style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: statusColor.bg,
                          boxShadow: statusColor.glow
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── USER INFO / LOGIN ── */}
        <div className="sidebar-auth-wrapper" style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          {!isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="sidebar-auth-btn" onClick={onOpenAuth} style={{ ...authBtnStyle, background: 'rgba(212,175,55,0.1)', color: 'var(--crystal)', borderColor: 'var(--purple)' }}>{t.connexion}</div>
              <div className="sidebar-auth-btn" onClick={onOpenAuth} style={authBtnStyle}>{t.inscription}</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                className="sidebar-user-pill"
                onClick={(e) => { e.stopPropagation(); onToggleProfile(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s',
                  position: 'relative'
                }}
              >
                <img src={getSkinHead()} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '4px', imageRendering: 'pixelated' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#f3e5ab', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPseudo().toUpperCase()}</div>
                  <div style={{ fontSize: '9px', color: '#34d399', fontWeight: 700 }}>
                    {(() => {
                      const found = apiUsers.find(u => u && u.pseudo && u.pseudo.toLowerCase() === getPseudo().toLowerCase());
                      return (found?.rank || (isPremium ? 'PREMIUM' : 'CRACK')).toUpperCase();
                    })()}
                  </div>
                </div>
                <ChevronUp size={14} color="var(--text-dim)" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                {incomingCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: '#ef4444', border: '2px solid var(--bg-dark)',
                    boxShadow: '0 0 6px #ef4444',
                    animation: 'gemPulse 1.5s infinite'
                  }} />
                )}
              </div>

              {isProfileOpen && (
                <div className="profile-dropdown-sidebar glass-panel fade-in" style={{
                  position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, right: 0, zIndex: 2005, padding: '6px',
                  boxShadow: '0 -10px 40px rgba(0,0,0,0.6)', background: 'var(--bg-panel)'
                }}>
                  {/* 1. Mon Profil */}
                  <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveTab('profile'); onToggleProfile(); }}>
                    <User size={14} /> <span>{t.profile}</span>
                  </div>

                  {/* 2. Amis & Tchat */}
                  <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); setActiveTab('friends'); onToggleProfile(); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={14} /> <span>{t.friends}</span>
                    </div>
                    {incomingCount > 0 && (
                      <span style={{
                        background: '#ef4444', color: '#fff', borderRadius: '50%',
                        padding: '1px 6px', fontSize: '9px', fontWeight: 'bold',
                        boxShadow: '0 0 6px #ef4444'
                      }}>
                        {incomingCount}
                      </span>
                    )}
                  </div>

                  {/* 3. Liste des comptes (si plusieurs comptes connectés) */}
                  {effectiveAccounts.length > 1 && (
                    <div style={{ marginTop: '2px', marginBottom: '2px' }}>
                      <div 
                        className="dropdown-item"
                        onClick={(e) => { e.stopPropagation(); setIsAccountsMenuOpen(!isAccountsMenuOpen); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                          background: isAccountsMenuOpen ? 'rgba(212,175,55,0.08)' : 'transparent',
                          color: 'var(--crystal)', fontWeight: 600
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={13} color="#d4af37" />
                          <span>{t.accounts_list || 'Liste des comptes'}</span>
                          <span style={{
                            fontSize: '9px', background: 'rgba(212,175,55,0.25)', color: '#f3e5ab',
                            padding: '1px 5px', borderRadius: '8px', fontWeight: 'bold'
                          }}>
                            {effectiveAccounts.length}
                          </span>
                        </div>
                        <ChevronDown 
                          size={13} 
                          color="var(--text-dim)" 
                          style={{ transform: isAccountsMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} 
                        />
                      </div>

                      {isAccountsMenuOpen && (
                        <div style={{
                          marginTop: '3px', marginLeft: '6px', paddingLeft: '8px',
                          borderLeft: '2px solid rgba(212,175,55,0.25)',
                          display: 'flex', flexDirection: 'column', gap: '3px',
                          maxHeight: '130px', overflowY: 'auto'
                        }}>
                          {effectiveAccounts.map((acc) => {
                            const isCurrent = (acc.pseudo || '').toLowerCase() === (user?.pseudo || '').toLowerCase();
                            return (
                              <div
                                key={acc.pseudo}
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isCurrent) {
                                    switchAccount(acc.pseudo);
                                    onToggleProfile();
                                  }
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '5px 8px', borderRadius: '6px',
                                  background: isCurrent ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.02)',
                                  border: isCurrent ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                                  cursor: isCurrent ? 'default' : 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                  <img 
                                    src={`https://minotar.net/avatar/${acc.pseudo}/32`} 
                                    alt={acc.pseudo} 
                                    style={{ width: '18px', height: '18px', borderRadius: '3px', imageRendering: 'pixelated' }} 
                                  />
                                  <span style={{
                                    fontSize: '11px', fontWeight: isCurrent ? 800 : 600,
                                    color: isCurrent ? '#f3e5ab' : 'var(--text-dim)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                  }}>
                                    {acc.pseudo}
                                  </span>
                                </div>
                                {isCurrent ? (
                                  <span style={{
                                    fontSize: '8px', fontWeight: 'bold', color: '#34d399',
                                    background: 'rgba(52,211,153,0.15)', padding: '1px 5px',
                                    borderRadius: '3px', border: '1px solid rgba(52,211,153,0.3)'
                                  }}>
                                    {t.active || 'Actif'}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '9px', color: 'var(--purple-light)', fontWeight: 600 }}>
                                    {t.switch || 'Swap'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. + Ajouter un compte */}
                  <div 
                    className="dropdown-item" 
                    onClick={(e) => { e.stopPropagation(); onOpenAuth(); onToggleProfile(); }}
                    style={{ color: '#d4af37' }}
                  >
                    <UserPlus size={14} /> <span>{t.add_account || '+ Ajouter un compte'}</span>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '6px 4px' }} />

                  {/* 5. Se déconnecter */}
                  <div className="dropdown-item" onClick={(e) => { e.stopPropagation(); logout(); onToggleProfile(); }} style={{ color: '#f87171' }}>
                    <LogOut size={14} /> <span>{t.logout}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="settings-btn" onClick={onOpenSettings} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-dim)', transition: 'all 0.25s' }}>
          <Settings size={18} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.settings}</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes gemPulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 16px rgba(212,175,55,0.4)); transform: scale(1); }
          50% { filter: brightness(1.2) drop-shadow(0 0 24px rgba(212,175,55,0.7)); transform: scale(1.03); }
        }
        .nav-shop:hover { color: #fbbf24 !important; }
        .settings-btn:hover { color: var(--crystal); background: rgba(255,255,255,0.05); }
        .sidebar-user-pill:hover { background: rgba(212,175,55,0.08) !important; border-color: var(--purple) !important; }
        .sidebar-auth-btn { padding: 8px; text-align: center; border-radius: 8px; font-size: 11px; font-weight: 700; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 1px; }
        .sidebar-auth-btn:hover { background: rgba(255,255,255,0.05); border-color: var(--text-dim); }
        .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 12px; }
        .dropdown-item:hover { background: rgba(255,255,255,0.05); color: var(--purple-light); }
        .sidebar-friend-item:hover { background: rgba(212,175,55,0.08) !important; border-color: rgba(168,85,247,0.2) !important; }
      `}} />
    </aside>
  );
};

const authBtnStyle = {
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--text-muted)'
};

export default Sidebar;
