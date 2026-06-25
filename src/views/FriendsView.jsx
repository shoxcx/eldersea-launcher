import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore, useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { Users, UserPlus, Inbox, MessageSquare, Send, Trash2, Check, X, Circle, Shield, User, Smile, Image } from 'lucide-react';

const EMOJIS = ['😄', '😂', '😭', '😡', '😱', '👍', '🔥', '🎉', '❤️', '🤔', '👑', '🏴‍☠️', '⚓', '🌊', '⚔️', '💎', '🗺️', '☠️', '🦜', '🪙'];

const curatedGifs = [
  {
    url: 'https://media.giphy.com/media/1tHzw9PXXf7Ww/giphy.gif',
    tags: ['minecraft', 'steve', 'danse', 'dance', 'fun', 'funny', 'drole'],
    category: 'Minecraft'
  },
  {
    url: 'https://media.giphy.com/media/rYV80F954goDu/giphy.gif',
    tags: ['minecraft', 'creeper', 'boom', 'explosion', 'colere', 'angry'],
    category: 'Minecraft'
  },
  {
    url: 'https://media.giphy.com/media/qj6XMcl5GQgIE/giphy.gif',
    tags: ['minecraft', 'steve', 'mine', 'diamant', 'diamond', 'travail'],
    category: 'Minecraft'
  },
  {
    url: 'https://media.giphy.com/media/3x1e2yRjK9aK0/giphy.gif',
    tags: ['minecraft', 'squelette', 'skeleton', 'combat', 'attack'],
    category: 'Minecraft'
  },
  {
    url: 'https://media.giphy.com/media/2PmMiUc9OH4l2/giphy.gif',
    tags: ['pirate', 'bateau', 'ship', 'mer', 'sea', 'aventure'],
    category: 'Pirates'
  },
  {
    url: 'https://media.giphy.com/media/o0eOCNknADc4JTz08w/giphy.gif',
    tags: ['pirate', 'jack sparrow', 'capitaine', 'hello', 'salut', 'aye'],
    category: 'Pirates'
  },
  {
    url: 'https://media.giphy.com/media/10X22vczHT1Ot2/giphy.gif',
    tags: ['pirate', 'rire', 'laugh', 'drole', 'funny', 'fun'],
    category: 'Pirates'
  },
  {
    url: 'https://media.giphy.com/media/l41JRsPh73mFPADYs/giphy.gif',
    tags: ['pirate', 'combat', 'epee', 'sword', 'fight'],
    category: 'Pirates'
  },
  {
    url: 'https://media.giphy.com/media/3o7TKMt1VsiptXWRTKM/giphy.gif',
    tags: ['pirate', 'carte', 'map', 'tresor', 'treasure'],
    category: 'Pirates'
  },
  {
    url: 'https://media.giphy.com/media/t3mzJQ2NHxJVy4wygZ/giphy.gif',
    tags: ['rire', 'laugh', 'ha', 'fun', 'funny', 'drole'],
    category: 'Réactions'
  },
  {
    url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1K76/giphy.gif',
    tags: ['applaudissements', 'bravo', 'clap', 'win', 'gg'],
    category: 'Réactions'
  },
  {
    url: 'https://media.giphy.com/media/3o7abKhOpu0NXS3HBC/giphy.gif',
    tags: ['pleure', 'triste', 'sad', 'cry', 'no'],
    category: 'Réactions'
  },
  {
    url: 'https://media.giphy.com/media/9PMC8BD8bKfDxG6AEh/giphy.gif',
    tags: ['choc', 'shock', 'wow', 'omg', 'surprise'],
    category: 'Réactions'
  }
];

const cleanGiphyUrl = (url) => {
  if (typeof url !== 'string') return url;
  const trimmed = url.trim();
  
  if (trimmed.includes('giphy.com')) {
    // Extract ID from media URL
    if (trimmed.includes('/media/')) {
      const parts = trimmed.split('/media/');
      if (parts[1]) {
        const id = parts[1].split('/')[0];
        return `https://media.giphy.com/media/${id}/giphy.gif`;
      }
    }
    // Extract ID from gifs/
    if (trimmed.includes('/gifs/')) {
      const parts = trimmed.split('/gifs/');
      if (parts[1]) {
        const firstSegment = parts[1].split('?')[0].split('/')[0];
        const subParts = firstSegment.split('-');
        const id = subParts[subParts.length - 1];
        return `https://media.giphy.com/media/${id}/giphy.gif`;
      }
    }
    // Extract ID from i.giphy.com direct URLs (like curated ones)
    if (trimmed.includes('i.giphy.com/')) {
      const id = trimmed.split('i.giphy.com/')[1].split('.')[0];
      return `https://media.giphy.com/media/${id}/giphy.gif`;
    }
    // Regex fallback
    const match = trimmed.match(/\/([a-zA-Z0-9]{10,25})\b/);
    if (match && match[1]) {
      return `https://media.giphy.com/media/${match[1]}/giphy.gif`;
    }
  }
  return trimmed;
};

const isMediaOnly = (text) => {
  if (typeof text !== 'string') return false;
  const cleaned = cleanGiphyUrl(text);
  const t = cleaned.trim();
  
  if (t.startsWith('http')) {
    const lower = t.toLowerCase();
    return (
      lower.includes('.gif') ||
      lower.includes('.png') ||
      lower.includes('.jpg') ||
      lower.includes('.jpeg') ||
      lower.includes('.webp') ||
      lower.includes('giphy.com') ||
      lower.includes('tenor.co') ||
      lower.includes('tenor.com') ||
      lower.includes('emoji.gg')
    );
  }

  // Regex supporting unicode emoji presentation
  const emojiRegex = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  return emojiRegex.test(t);
};

const renderMessageContent = (text) => {
  const cleaned = cleanGiphyUrl(text);
  const t = cleaned.trim();
  if (t.startsWith('http')) {
    const isCustomEmoji = t.includes('emoji.gg') || t.includes('/emojis/');
    if (isCustomEmoji) {
      return (
        <img 
          src={t} 
          alt="custom emoji" 
          referrerPolicy="no-referrer"
          style={{ 
            width: '80px', 
            height: '80px', 
            objectFit: 'contain',
            display: 'block'
          }} 
        />
      );
    } else {
      return (
        <img 
          src={t} 
          alt="media" 
          referrerPolicy="no-referrer"
          style={{ 
            maxWidth: '100%', 
            borderRadius: '8px', 
            maxHeight: '160px', 
            display: 'block'
          }} 
        />
      );
    }
  }

  const emojiRegex = /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
  const isOnlyEmojis = emojiRegex.test(t);
  if (isOnlyEmojis) {
    return (
      <span style={{ fontSize: '32px', lineHeight: '1.2', display: 'block' }}>
        {t}
      </span>
    );
  }

  return text;
};

const FriendsView = ({ setFullscreen, activeChatFriend, setActiveChatFriend, onInspectUser }) => {
  const { user } = useAuthStore();
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];

  const getPseudo = () => {
    if (typeof user === 'string') return user;
    return user?.pseudo || '';
  };
  const currentPseudo = getPseudo();

  // Modal states
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  
  // Search state
  const [searchPseudo, setSearchPseudo] = useState('');
  const [searchStatus, setSearchStatus] = useState({ type: '', msg: '' });

  // Friends & Chat data from IPC
  const [friendsData, setFriendsData] = useState({ requests: [], friends: [], messages: [] });
  
  // Real users data fetched from ElderSea SQL API (to verify users and check online status/rank/balance)
  const [allApiUsers, setAllApiUsers] = useState([]);
  
  // Message input text
  const [messageText, setMessageText] = useState('');

  // Antispam & Emoji/GIF states
  const lastSentTimeRef = useRef(0);
  const lastSentTextRef = useRef('');
  const [spamError, setSpamError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [activeGifCategory, setActiveGifCategory] = useState('All');

  // GIPHY API states
  const [giphyGifs, setGiphyGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [debouncedGifQuery, setDebouncedGifQuery] = useState('');

  // Custom Emojis states
  const [customEmojis, setCustomEmojis] = useState([]);
  const [loadingEmojis, setLoadingEmojis] = useState(true);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('Unicode');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');

  // Scrolling reference for chat
  const chatEndRef = useRef(null);

  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);

  // Close Emoji/GIF picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.emoji-toggle-btn')) {
        setShowEmojiPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target) && !event.target.closest('.gif-toggle-btn')) {
        setShowGifPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch custom emojis from emoji.gg
  useEffect(() => {
    let isMounted = true;
    fetch('https://emoji.gg/api')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && isMounted) {
          // Filter out category 9 (NSFW)
          const filtered = data.filter(e => String(e.category) !== '9');
          setCustomEmojis(filtered);
        }
        if (isMounted) setLoadingEmojis(false);
      })
      .catch(err => {
        console.error("Failed to fetch custom emojis:", err);
        if (isMounted) setLoadingEmojis(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Debounce search query for GIPHY
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedGifQuery(gifSearchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [gifSearchQuery]);

  // Fetch GIFs from GIPHY API
  useEffect(() => {
    if (!showGifPicker) return;

    let isMounted = true;
    setLoadingGifs(true);

    let url = '';
    const q = debouncedGifQuery.trim();

    if (q) {
      url = `https://giphy.com/api/v1/proxy/gifs/search?q=${encodeURIComponent(q)}&limit=50`;
    } else {
      if (activeGifCategory === 'All') {
        url = `https://giphy.com/api/v1/proxy/gifs/trending?limit=50`;
      } else {
        const queryMap = {
          'Minecraft': 'minecraft',
          'Pirates': 'pirate',
          'Réactions': 'reaction'
        };
        const searchQ = queryMap[activeGifCategory] || activeGifCategory;
        url = `https://giphy.com/api/v1/proxy/gifs/search?q=${encodeURIComponent(searchQ)}&limit=50`;
      }
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && Array.isArray(data.data)) {
          const formatted = data.data.map(item => ({
            id: item.id,
            url: `https://media.giphy.com/media/${item.id}/200.gif`,
            title: item.title
          }));
          setGiphyGifs(formatted);
        }
        if (isMounted) setLoadingGifs(false);
      })
      .catch(err => {
        console.error("Giphy API error:", err);
        if (isMounted) {
          // Fallback to curated if API fails
          setGiphyGifs(curatedGifs.map(g => ({
            id: g.url.split('/').pop().replace('.gif', ''),
            url: g.url,
            title: g.tags.join(' ')
          })));
          setLoadingGifs(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showGifPicker, activeGifCategory, debouncedGifQuery]);

  // Load friends database state & API users
  const loadData = async () => {
    if (window.ipcRenderer) {
      try {
        const data = await window.ipcRenderer.invoke('friends-get-data');
        setFriendsData(data);
      } catch (err) {
        console.error("Failed to load friends data:", err);
      }
    }

    try {
      const res = await fetch('https://eldersea.tekao.fr/api/api/users');
      if (res.ok) {
        const users = await res.json();
        setAllApiUsers(users);
      }
    } catch (err) {
      console.error("Failed to fetch API users:", err);
    }
  };

  // Initial and periodic polling (every 5 seconds)
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [friendsData.messages, activeChatFriend]);

  // Clear search status when closing Add Modal
  useEffect(() => {
    if (!isAddModalOpen) {
      setSearchPseudo('');
      setSearchStatus({ type: '', msg: '' });
    }
  }, [isAddModalOpen]);

  // Parse friendships
  const getFriendsList = () => {
    const list = [];
    friendsData.friends.forEach(f => {
      const u1L = f.user1.toLowerCase();
      const u2L = f.user2.toLowerCase();
      const curL = currentPseudo.toLowerCase();
      if (u1L === curL) {
        list.push(f.user2);
      } else if (u2L === curL) {
        list.push(f.user1);
      }
    });
    return list;
  };

  // Retrieve incoming requests (where `to === currentPseudo`)
  const getIncomingRequests = () => {
    return friendsData.requests.filter(r => r.to.toLowerCase() === currentPseudo.toLowerCase());
  };

  // Retrieve outgoing requests (where `from === currentPseudo`)
  const getOutgoingRequests = () => {
    return friendsData.requests.filter(r => r.from.toLowerCase() === currentPseudo.toLowerCase());
  };

  // Cross-reference target user details from API users database
  const getUserDetails = (pseudo) => {
    if (!pseudo) return null;
    const found = allApiUsers.find(u => u.pseudo && u.pseudo.toLowerCase() === pseudo.toLowerCase());
    if (found) {
      const lastActive = found.lastActive || null;
      const isOnline = lastActive ? ((Date.now() - new Date(lastActive).getTime()) / 1000 / 60 <= 3) : false;
      return {
        online: isOnline,
        lastActive,
        rank: found.rank || 'Joueur',
        balance: found.balance || 0,
        avatar: found.avatar || `https://minotar.net/avatar/${found.pseudo}/64`,
        email: found.email,
        thallis: found.thallis || 0
      };
    }
    return {
      online: false,
      lastActive: null,
      rank: 'Joueur',
      balance: 0,
      avatar: `https://minotar.net/avatar/${pseudo}/64`,
      email: '',
      thallis: 0
    };
  };

  // Search & add a friend
  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!searchPseudo.trim()) return;

    const targetPseudo = searchPseudo.trim();
    const targetL = targetPseudo.toLowerCase();
    const curL = currentPseudo.toLowerCase();

    if (targetL === curL) {
      setSearchStatus({ type: 'error', msg: t.cant_add_self });
      return;
    }

    // Verify user exists in ElderSea SQL backend
    const userExists = allApiUsers.some(u => u.pseudo && u.pseudo.toLowerCase() === targetL);
    if (!userExists) {
      setSearchStatus({ type: 'error', msg: t.user_not_found });
      return;
    }

    // Check if already friends
    const friends = getFriendsList();
    if (friends.some(f => f.toLowerCase() === targetL)) {
      setSearchStatus({ type: 'error', msg: t.friend_already });
      return;
    }

    // Check if outgoing request already sent
    const outgoing = getOutgoingRequests();
    if (outgoing.some(r => r.to.toLowerCase() === targetL)) {
      setSearchStatus({ type: 'error', msg: t.friend_request_sent });
      return;
    }

    setSearchStatus({ type: 'info', msg: 'Envoi...' });

    if (window.ipcRenderer) {
      try {
        const updated = await window.ipcRenderer.invoke('friends-action', {
          action: 'send-request',
          fromUser: currentPseudo,
          toUser: targetPseudo
        });
        setFriendsData(updated);
        setSearchStatus({ type: 'success', msg: t.friend_request_sent });
        setSearchPseudo('');
      } catch (err) {
        setSearchStatus({ type: 'error', msg: 'Erreur lors de l\'ajout.' });
      }
    }
  };

  // Accept incoming request
  const handleAcceptRequest = async (targetUser) => {
    if (window.ipcRenderer) {
      try {
        const updated = await window.ipcRenderer.invoke('friends-action', {
          action: 'accept-request',
          fromUser: currentPseudo,
          toUser: targetUser
        });
        setFriendsData(updated);
      } catch (err) {
        console.error("Accept request failed:", err);
      }
    }
  };

  // Decline incoming request
  const handleDeclineRequest = async (targetUser) => {
    if (window.ipcRenderer) {
      try {
        const updated = await window.ipcRenderer.invoke('friends-action', {
          action: 'decline-request',
          fromUser: currentPseudo,
          toUser: targetUser
        });
        setFriendsData(updated);
      } catch (err) {
        console.error("Decline request failed:", err);
      }
    }
  };

  // Cancel outgoing request
  const handleCancelRequest = async (targetUser) => {
    if (window.ipcRenderer) {
      try {
        const updated = await window.ipcRenderer.invoke('friends-action', {
          action: 'cancel-request',
          fromUser: currentPseudo,
          toUser: targetUser
        });
        setFriendsData(updated);
      } catch (err) {
        console.error("Cancel request failed:", err);
      }
    }
  };

  const getCrewForUser = (pseudo) => {
    if (!pseudo) return 'Aucun';
    const name = pseudo.toLowerCase();
    if (name === 'zewolf929') return 'Chapeau de Paille';
    if (name === 'pierre') return 'Garde Impériale';
    if (name === 'admin' || name === 'eldersea') return 'Légende';
    return 'Aucun';
  };

  const getStatusColor = (lastActive) => {
    if (!lastActive) return { bg: '#6b7280', glow: 'none' };
    const diff = (Date.now() - new Date(lastActive).getTime()) / 1000 / 60;
    if (diff <= 3) {
      return { bg: '#10b981', glow: '0 0 6px #10b981' }; // green
    } else {
      return { bg: '#6b7280', glow: 'none' }; // grey
    }
  };

  const getUnreadCount = (friendPseudo) => {
    const curL = currentPseudo.toLowerCase();
    const sender = friendPseudo.toLowerCase();
    const lastRead = parseInt(localStorage.getItem(`chat_last_read_${curL}_${sender}`) || '0', 10);
    return friendsData.messages.filter(m => 
      m.to.toLowerCase() === curL && 
      m.from.toLowerCase() === sender && 
      m.timestamp > lastRead
    ).length;
  };

  // Mark messages as read when active chat friend is selected or new messages arrive
  useEffect(() => {
    if (activeChatFriend && currentPseudo) {
      localStorage.setItem(`chat_last_read_${currentPseudo.toLowerCase()}_${activeChatFriend.toLowerCase()}`, Date.now().toString());
    }
  }, [activeChatFriend, currentPseudo, friendsData.messages]);

  // Delete friend
  const handleDeleteFriend = (targetUser) => {
    setDeleteConfirmUser(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    const targetUser = deleteConfirmUser;
    setDeleteConfirmUser(null);
    if (window.ipcRenderer) {
      try {
        const updated = await window.ipcRenderer.invoke('friends-action', {
          action: 'delete-friend',
          fromUser: currentPseudo,
          toUser: targetUser
        });
        setFriendsData(updated);
        if (activeChatFriend === targetUser) {
          setActiveChatFriend(null);
        }
      } catch (err) {
        console.error("Delete friend failed:", err);
      }
    }
  };

  const sendDirectMessage = async (text) => {
    if (!activeChatFriend || !text.trim()) return;
    if (window.ipcRenderer) {
      try {
        const updated = await window.ipcRenderer.invoke('friends-send-message', {
          fromUser: currentPseudo,
          toUser: activeChatFriend,
          text: text.trim()
        });
        setFriendsData(updated);
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeChatFriend) return;

    const text = messageText.trim();
    const now = Date.now();

    // Antispam cooldown: 1.5 seconds
    if (now - lastSentTimeRef.current < 1500) {
      setSpamError("Veuillez patienter entre chaque message.");
      setTimeout(() => setSpamError(''), 3000);
      return;
    }

    // Duplicate prevention: same message within 4 seconds
    if (text.toLowerCase() === lastSentTextRef.current.toLowerCase() && now - lastSentTimeRef.current < 4000) {
      setSpamError("Vous ne pouvez pas envoyer le même message deux fois de suite si vite.");
      setTimeout(() => setSpamError(''), 3000);
      return;
    }

    lastSentTimeRef.current = now;
    lastSentTextRef.current = text;
    setSpamError('');

    setMessageText('');
    await sendDirectMessage(text);
  };

  const handleEmojiClick = (emoji) => {
    setMessageText(prev => prev + emoji);
  };



  const getFilteredEmojis = () => {
    const query = emojiSearchQuery.toLowerCase().trim();
    return customEmojis.filter(emoji => {
      let matchesCategory = false;
      if (activeEmojiCategory === 'Pepe' && String(emoji.category) === '13') matchesCategory = true;
      else if (activeEmojiCategory === 'Animés' && String(emoji.category) === '8') matchesCategory = true;
      else if (activeEmojiCategory === 'Memes' && String(emoji.category) === '3') matchesCategory = true;
      else if (activeEmojiCategory === 'Jeux' && String(emoji.category) === '10') matchesCategory = true;
      else if (activeEmojiCategory === 'Cute' && String(emoji.category) === '15') matchesCategory = true;
      else if (activeEmojiCategory === 'Coeurs' && String(emoji.category) === '20') matchesCategory = true;

      const matchesSearch = !query || emoji.title.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  };

  // Filter messages between current user and active chat friend
  const getChatHistory = () => {
    if (!activeChatFriend) return [];
    const curL = currentPseudo.toLowerCase();
    const chatL = activeChatFriend.toLowerCase();
    return friendsData.messages.filter(m => {
      const fromL = m.from.toLowerCase();
      const toL = m.to.toLowerCase();
      return (fromL === curL && toL === chatL) || (fromL === chatL && toL === curL);
    });
  };

  const friends = getFriendsList();
  const incoming = getIncomingRequests();
  const outgoing = getOutgoingRequests();
  const activeChatHistory = getChatHistory();
  const activeDetails = getUserDetails(activeChatFriend);

  return (
    <div className="friends-view fade-in" style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ marginBottom: '25px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="cinzel" style={{ fontSize: '20px', letterSpacing: '3px', color: 'var(--crystal)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} color="var(--purple-light)" /> {t.friends.toUpperCase()}
        </h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setIsRequestsModalOpen(true)}
            className="hover-glow-border"
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'var(--crystal)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            <Inbox size={14} color="var(--purple-light)" />
            <span>{t.requests}</span>
            {incoming.length > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                padding: '1px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                boxShadow: '0 0 6px #ef4444'
              }}>
                {incoming.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="hover-glow-border"
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'var(--crystal)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            <UserPlus size={14} color="var(--purple-light)" />
            <span>{t.add_friend}</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px', flex: 1, minHeight: 0 }}>
        
        {/* ── LEFT COLUMN: FRIENDS LIST ── */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexShrink: 0 }}>
            <Users size={14} color="var(--purple-light)" />
            <span className="cinzel" style={{ fontSize: '11px', color: 'var(--crystal)', letterSpacing: '1px', fontWeight: 700 }}>
              {t.friends} ({friends.length})
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {friends.length === 0 ? (
                <div style={{ padding: '40px 10px', textAlign: 'center', opacity: 0.5, fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t.no_friends}
                </div>
              ) : (
                friends.map((pseudo) => {
                  const details = getUserDetails(pseudo);
                  const statusColor = getStatusColor(details.lastActive);
                  const unreadCount = getUnreadCount(pseudo);
                  return (
                    <div 
                      key={pseudo} 
                      onClick={() => setActiveChatFriend(pseudo)}
                      className="hover-glow-border"
                      style={{
                        background: activeChatFriend === pseudo ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                        border: activeChatFriend === pseudo ? '1px solid var(--purple-light)' : '1px solid var(--border)',
                        borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ position: 'relative', display: 'flex' }}>
                        <img 
                          src={details.avatar} 
                          alt="skin" 
                          onClick={(e) => { e.stopPropagation(); onInspectUser(pseudo); }}
                          style={{ width: '32px', height: '32px', borderRadius: '4px', imageRendering: 'pixelated', background: '#000', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} 
                          title="Inspecter le profil"
                        />
                        {unreadCount > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '-6px',
                            left: '-6px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '10px',
                            padding: '2px 5px',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            boxShadow: '0 0 6px #ef4444',
                            zIndex: 2
                          }}>
                            +{unreadCount}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--crystal)', fontSize: '12px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {pseudo}
                          </span>
                          <span 
                            className="status-dot" 
                            style={{ 
                              width: '6px', height: '6px', borderRadius: '50%', 
                              background: statusColor.bg,
                              boxShadow: statusColor.glow
                            }} 
                          />
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--purple-light)', fontWeight: 600 }}>{details.rank}</div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteFriend(pseudo); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                        title="Supprimer l'ami"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: ACTIVE CHAT ── */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeChatFriend ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Chat Header */}
              <div style={{ padding: '15px 25px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={activeDetails.avatar} 
                    alt="avatar" 
                    onClick={(e) => { e.stopPropagation(); onInspectUser(activeChatFriend); }}
                    style={{ width: '38px', height: '38px', borderRadius: '6px', imageRendering: 'pixelated', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} 
                    title="Inspecter le profil"
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--crystal)' }}>{activeChatFriend.toUpperCase()}</span>
                      <span 
                        className="status-dot" 
                        style={{ 
                          width: '8px', height: '8px', borderRadius: '50%', 
                          background: getStatusColor(activeDetails.lastActive).bg,
                          boxShadow: getStatusColor(activeDetails.lastActive).glow
                        }} 
                      />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>Grade : <strong style={{ color: 'var(--crystal)' }}>{activeDetails.rank}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeChatHistory.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t.language === 'en' ? 'Start of conversation' : 'Début de la conversation'}
                  </div>
                ) : (
                  activeChatHistory.map((m, i) => {
                    const isMe = m.from.toLowerCase() === currentPseudo.toLowerCase();
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '70%'
                        }}
                      >
                        <div style={{
                          background: isMediaOnly(m.message) ? 'transparent' : (isMe ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)'),
                          border: isMediaOnly(m.message) ? 'none' : (isMe ? '1px solid rgba(168,85,247,0.3)' : '1px solid var(--border)'),
                          borderRadius: '12px',
                          borderBottomRightRadius: isMe ? '2px' : '12px',
                          borderBottomLeftRadius: isMe ? '12px' : '2px',
                          padding: isMediaOnly(m.message) ? '0' : '10px 14px',
                          fontSize: '11.5px',
                          color: '#fff',
                          lineHeight: '1.4',
                          boxShadow: isMediaOnly(m.message) ? 'none' : undefined
                        }}>
                          {renderMessageContent(m.message)}
                        </div>
                        <div style={{ 
                          fontSize: '8.5px', 
                          color: 'var(--text-dim)', 
                          textAlign: isMe ? 'right' : 'left',
                          marginTop: '4px',
                          padding: '0 4px'
                        }}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} style={{ position: 'relative', padding: '15px 25px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(0,0,0,0.1)', flexShrink: 0 }}>
                
                {/* Floating Spam Error */}
                {spamError && (
                  <div style={{
                    position: 'absolute',
                    top: '-45px',
                    left: '25px',
                    right: '25px',
                    background: 'rgba(239, 68, 68, 0.95)',
                    border: '1px solid #ef4444',
                    color: '#fff',
                    fontSize: '11px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    zIndex: 10,
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
                    textAlign: 'center'
                  }}>
                    {spamError}
                  </div>
                )}

                {/* Floating Emoji Picker */}
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef}
                    style={{
                      position: 'absolute',
                      bottom: '75px',
                      right: '80px',
                      width: '320px',
                      background: 'rgba(15, 12, 30, 0.96)',
                      backdropFilter: 'blur(15px)',
                      border: '1px solid var(--border-bright)',
                      borderRadius: '12px',
                      padding: '15px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                      <span className="cinzel" style={{ fontSize: '11px', color: 'var(--crystal)', letterSpacing: '1px', fontWeight: 'bold' }}>Emojis & Emotes</span>
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(false)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Category tabs */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Unicode', 'Pepe', 'Animés', 'Memes', 'Jeux', 'Cute', 'Coeurs'].map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => { setActiveEmojiCategory(tab); setEmojiSearchQuery(''); }}
                          style={{
                            background: activeEmojiCategory === tab ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.02)',
                            border: activeEmojiCategory === tab ? '1px solid var(--purple-light)' : '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '9px',
                            color: activeEmojiCategory === tab ? '#fff' : 'var(--text-dim)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Search bar for custom emojis */}
                    {activeEmojiCategory !== 'Unicode' && (
                      <input 
                        type="text" 
                        placeholder="Rechercher un émote..." 
                        value={emojiSearchQuery}
                        onChange={(e) => setEmojiSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border)',
                          color: '#fff',
                          outline: 'none',
                          marginBottom: '4px'
                        }}
                      />
                    )}

                    {/* Emoji Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {activeEmojiCategory === 'Unicode' ? (
                        EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleEmojiClick(emoji)}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '6px',
                              fontSize: '20px',
                              cursor: 'pointer',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                              e.currentTarget.style.borderColor = 'var(--purple-light)';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            {emoji}
                          </button>
                        ))
                      ) : loadingEmojis ? (
                        <div style={{ gridColumn: 'span 5', textAlign: 'center', padding: '30px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                          Chargement des émotes...
                        </div>
                      ) : getFilteredEmojis().length === 0 ? (
                        <div style={{ gridColumn: 'span 5', textAlign: 'center', padding: '30px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                          Aucun émote trouvé
                        </div>
                      ) : (
                        getFilteredEmojis().slice(0, 120).map(emoji => (
                          <button
                            key={emoji.id}
                            type="button"
                            onClick={() => {
                              sendDirectMessage(emoji.image);
                              setShowEmojiPicker(false);
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                              e.currentTarget.style.borderColor = 'var(--purple-light)';
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={emoji.title}
                          >
                            <img 
                              src={emoji.image} 
                              alt={emoji.title} 
                              referrerPolicy="no-referrer"
                              style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
                            />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Floating GIF Picker */}
                {showGifPicker && (
                  <div 
                    ref={gifPickerRef}
                    style={{
                      position: 'absolute',
                      bottom: '75px',
                      right: '25px',
                      width: '320px',
                      background: 'rgba(15, 12, 30, 0.95)',
                      backdropFilter: 'blur(15px)',
                      border: '1px solid var(--border-bright)',
                      borderRadius: '12px',
                      padding: '15px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                      <span className="cinzel" style={{ fontSize: '11px', color: 'var(--crystal)', letterSpacing: '1px', fontWeight: 'bold' }}>GIFs Animés</span>
                      <button 
                        type="button" 
                        onClick={() => setShowGifPicker(false)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <input 
                      type="text" 
                      placeholder="Rechercher un GIF..." 
                      value={gifSearchQuery}
                      onChange={(e) => setGifSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {['All', 'Minecraft', 'Pirates', 'Réactions'].map(category => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveGifCategory(category)}
                          style={{
                            background: activeGifCategory === category ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                            border: activeGifCategory === category ? '1px solid var(--purple-light)' : '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '9px',
                            color: activeGifCategory === category ? '#fff' : 'var(--text-dim)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            outline: 'none'
                          }}
                        >
                          {category === 'All' ? 'Tout' : category}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                      {loadingGifs ? (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                          Chargement des GIFs...
                        </div>
                      ) : giphyGifs.length === 0 ? (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px 0', fontSize: '11px', color: 'var(--text-muted)', opacity: 0.5 }}>
                          Aucun GIF trouvé
                        </div>
                      ) : (
                        giphyGifs.map(gif => (
                          <img 
                            key={gif.id} 
                            src={gif.url} 
                            alt={gif.title || "gif option"} 
                            referrerPolicy="no-referrer"
                            onClick={() => {
                              sendDirectMessage(gif.url);
                              setShowGifPicker(false);
                            }}
                            style={{
                              width: '100%',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              border: '1px solid rgba(255,255,255,0.1)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--purple-light)';
                              e.currentTarget.style.transform = 'scale(1.03)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                <input 
                  type="text" 
                  placeholder={t.chat_placeholder}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{
                    flex: 1, padding: '12px 16px', fontSize: '11.5px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                    className="emoji-toggle-btn hover-glow-border"
                    style={{
                      width: '42px', height: '42px', borderRadius: '8px',
                      background: showEmojiPicker ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.2)',
                      border: showEmojiPicker ? '1px solid var(--purple-light)' : '1px solid var(--border)',
                      color: showEmojiPicker ? 'var(--purple-light)' : 'var(--crystal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title="Emojis"
                  >
                    <Smile size={16} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                    className="gif-toggle-btn hover-glow-border"
                    style={{
                      width: '42px', height: '42px', borderRadius: '8px',
                      background: showGifPicker ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.2)',
                      border: showGifPicker ? '1px solid var(--purple-light)' : '1px solid var(--border)',
                      color: showGifPicker ? 'var(--purple-light)' : 'var(--crystal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title="GIFs"
                  >
                    <Image size={16} />
                  </button>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ width: '42px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: '15px' }}>
              <MessageSquare size={36} color="var(--purple-light)" />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {t.language === 'en' ? 'Select a friend to start chatting' : 'Sélectionnez un ami pour commencer à discuter'}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* ── MODAL: REQUESTS ── */}
      {isRequestsModalOpen && createPortal(
        <div className="modal-overlay fade-in" style={{
          position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setIsRequestsModalOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
            borderRadius: '20px', padding: '30px', width: '420px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '20px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--crystal), transparent)' }} />
            
            <button onClick={() => setIsRequestsModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}>
              <X size={20} />
            </button>

            <h3 className="cinzel" style={{ fontSize: '16px', color: 'var(--crystal)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={18} color="var(--purple-light)" /> {t.requests.toUpperCase()}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              <div>
                <h4 className="cinzel" style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--text-dim)', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                  REÇUES ({incoming.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {incoming.length === 0 ? (
                    <div style={{ padding: '15px 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Aucune demande en attente</div>
                  ) : (
                    incoming.map((req) => (
                      <div key={req.from} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--crystal)' }}>{req.from}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleAcceptRequest(req.from)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Check size={12} />
                          </button>
                          <button onClick={() => handleDeclineRequest(req.from)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '4px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="cinzel" style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--text-dim)', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                  ENVOYÉES ({outgoing.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {outgoing.length === 0 ? (
                    <div style={{ padding: '15px 0', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Aucune demande envoyée</div>
                  ) : (
                    outgoing.map((req) => (
                      <div key={req.to} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>{req.to}</span>
                        <button onClick={() => handleCancelRequest(req.to)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}>
                          {t.language === 'en' ? 'Cancel' : 'Annuler'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: ADD FRIEND ── */}
      {isAddModalOpen && createPortal(
        <div className="modal-overlay fade-in" style={{
          position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setIsAddModalOpen(false)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
            borderRadius: '20px', padding: '30px', width: '400px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '20px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--crystal), transparent)' }} />
            
            <button onClick={() => setIsAddModalOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}>
              <X size={20} />
            </button>

            <h3 className="cinzel" style={{ fontSize: '16px', color: 'var(--crystal)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="var(--purple-light)" /> {t.add_friend.toUpperCase()}
            </h3>

            <form onSubmit={handleAddFriend} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Entrez le pseudo de l'ami que vous souhaitez ajouter (il doit posséder un compte ElderSea).
              </p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder={t.add_friend_placeholder} 
                  value={searchPseudo}
                  onChange={(e) => setSearchPseudo(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: '12px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#fff', outline: 'none'
                  }}
                  required
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '12px', borderRadius: '8px', minWidth: '90px' }}
                >
                  {t.add_friend_search}
                </button>
              </div>

              {searchStatus.msg && (
                <div style={{ 
                  fontSize: '11px', 
                  color: searchStatus.type === 'success' ? '#10b981' : searchStatus.type === 'error' ? '#ef4444' : 'var(--purple-light)',
                  fontWeight: 600,
                  padding: '8px',
                  background: searchStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : searchStatus.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(212,175,55,0.08)',
                  borderRadius: '6px',
                  border: `1px solid ${searchStatus.type === 'success' ? 'rgba(16,185,129,0.15)' : searchStatus.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(212,175,55,0.15)'}`,
                  textAlign: 'center'
                }}>
                  {searchStatus.msg}
                </div>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: CONFIRM DELETE FRIEND ── */}
      {deleteConfirmUser && createPortal(
        <div className="modal-overlay fade-in" style={{
          position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setDeleteConfirmUser(null)}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
            borderRadius: '20px', padding: '30px', width: '400px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '20px',
            textAlign: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--purple), transparent)' }} />
            
            <button onClick={() => setDeleteConfirmUser(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', zIndex: 10 }}>
              <X size={20} />
            </button>

            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', width: '48px', height: '48px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
            }}>
              <Trash2 size={24} />
            </div>

            <h3 className="cinzel" style={{ fontSize: '15px', color: 'var(--crystal)', margin: 0, letterSpacing: '1px', fontWeight: 800 }}>
              RETIRER UN AMI
            </h3>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Voulez-vous vraiment retirer <strong style={{ color: 'var(--purple-light)' }}>{deleteConfirmUser}</strong> de vos amis ?
            </p>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '10px' }}>
              <button 
                onClick={() => setDeleteConfirmUser(null)}
                style={{
                  flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  color: 'var(--crystal)', fontWeight: 700, fontSize: '11px',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
                  transition: 'all 0.2s'
                }}
              >
                Annuler
              </button>
              <button 
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: '12px', background: 'linear-gradient(135deg, var(--accent) 0%, #a81c1c 100%)',
                  border: '1px solid #ef4444', borderRadius: '8px',
                  color: 'white', fontWeight: 800, fontSize: '11px',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(239,68,68,0.2)', transition: 'all 0.2s'
                }}
              >
                Retirer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-glow-border:hover {
          border-color: #c084fc !important;
          box-shadow: 0 0 10px rgba(168,85,247,0.1);
        }
      `}} />
    </div>
  );
};

export default FriendsView;
