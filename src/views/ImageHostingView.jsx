import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/useStore';
import { translations } from '../translations';
import { UploadCloud, Copy, Check, Trash2, ArrowLeft, Edit2, Search, Image as ImageIcon, X } from 'lucide-react';

const ImageHostingView = ({ setActiveTab, setFullscreen }) => {
  const { language } = useSettingsStore();
  const t = translations[language] || translations['fr'];
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // History of hosted images stored in localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('eldersea-hosted-images');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('eldersea-hosted-images', JSON.stringify(history));
  }, [history]);

  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const addFiles = (files) => {
    // Automatically clear successfully uploaded files from the queue when adding new ones
    const pendingFiles = selectedFiles.filter(f => f.status !== 'success');

    if (pendingFiles.length + files.length > 10) {
      alert(t.language === 'en' ? "You can upload up to 10 images at once." : "Vous ne pouvez pas héberger plus de 10 images à la fois.");
      return;
    }

    // Revoke object URLs of success files being cleared to avoid memory leaks
    selectedFiles.forEach(f => {
      if (f.status === 'success' && f.localUrl) {
        URL.revokeObjectURL(f.localUrl);
      }
    });

    const validated = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(t.language === 'en' ? `File ${file.name} is larger than 10MB.` : `Le fichier ${file.name} dépasse la limite de 10 Mo.`);
        continue;
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        alert(t.language === 'en' ? `File ${file.name} is not a valid image (PNG/JPG only).` : `Le fichier ${file.name} n'est pas une image valide (PNG/JPG uniquement).`);
        continue;
      }

      const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

      validated.push({
        file,
        name: file.name,
        customName: defaultName,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        localUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
        url: ''
      });
    }

    setSelectedFiles([...pendingFiles, ...validated]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      addFiles(files);
      e.target.value = ''; // Reset input value so onChange will always trigger
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const removeFile = (idx) => {
    if (uploading) return;
    const file = selectedFiles[idx];
    if (file.localUrl) {
      URL.revokeObjectURL(file.localUrl);
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (uploading || selectedFiles.length === 0) return;
    setUploading(true);

    setSelectedFiles(prev => prev.map(f => f.status === 'pending' || f.status === 'error' ? { ...f, status: 'uploading', progress: 20 } : f));

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      if (item.status !== 'pending' && item.status !== 'error') continue;

      setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 40 } : f));

      try {
        const base64Data = await fileToBase64(item.file);
        setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 70 } : f));

        const res = await window.ipcRenderer.invoke('upload-image-to-web', {
          base64Data,
          filename: item.name,
          mimeType: item.file.type
        });

        if (res.success) {
          const newItem = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            url: res.url,
            name: item.customName || item.name.split('.')[0],
            timestamp: new Date().toLocaleDateString()
          };
          setHistory(prev => [newItem, ...prev]);

          setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'success', url: res.url, progress: 100 } : f));
        } else {
          setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', progress: 0 } : f));
        }
      } catch (err) {
        setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', progress: 0 } : f));
      }
    }

    setUploading(false);
  };

  const copyToClipboard = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteFromHistory = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const startEditing = (id, currentName) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const saveEdit = (id) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, name: editingName } : item));
    setEditingId(null);
  };

  const clearList = () => {
    selectedFiles.forEach(f => {
      if (f.localUrl) URL.revokeObjectURL(f.localUrl);
    });
    setSelectedFiles([]);
  };

  const filteredHistory = history.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="image-hosting-view fade-in" style={{ padding: '40px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-secondary cinzel" onClick={() => setActiveTab('screenshots')} title="Retour aux captures" style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> <span>RETOUR</span>
          </button>
          <h2 className="cinzel" style={{ fontSize: '20px', letterSpacing: '3px', color: 'var(--crystal)', margin: 0 }}>
            {t.host_title}
          </h2>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '30px', flex: 1, minHeight: 0 }}>
        {/* ── LEFT COLUMN: UPLOAD ZONE ── */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h3 className="cinzel" style={{ fontSize: '13px', color: 'var(--purple-light)', marginBottom: '20px', letterSpacing: '2px' }}>
            {t.language === 'en' ? 'NEW UPLOAD' : 'NOUVEL ENVOI'}
          </h3>

          {selectedFiles.length < 10 && (
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('full-page-upload-input').click()}
              style={{
                border: '2px dashed rgba(212,175,55,0.2)',
                borderRadius: '10px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                marginBottom: '20px',
                flexShrink: 0
              }}
              className="drag-drop-area"
            >
              <input 
                type="file" 
                id="full-page-upload-input" 
                multiple 
                accept="image/png, image/jpeg, image/jpg" 
                onChange={handleFileChange} 
                style={{ display: 'none' }}
              />
              <UploadCloud size={36} color="var(--purple-light)" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--crystal)', lineHeight: '1.6' }}>
                {t.host_desc}
              </div>
            </div>
          )}

          {/* Uploading Queue */}
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
            {selectedFiles.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: '10px' }}>
                <ImageIcon size={32} color="var(--text-dim)" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t.language === 'en' ? 'No images selected' : 'Aucune image sélectionnée'}
                </span>
              </div>
            ) : (
              selectedFiles.map((f, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <img 
                    src={f.localUrl} 
                    alt="Preview" 
                    onClick={() => setFullscreen(f.localUrl)}
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', background: '#000', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={f.customName}
                        onChange={(e) => setSelectedFiles(prev => prev.map((item, i) => i === idx ? { ...item, customName: e.target.value } : item))}
                        disabled={uploading || f.status === 'success'}
                        placeholder="Nom de l'image"
                        style={{
                          flex: 1,
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#fff',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      />
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', flexShrink: 0 }}>{f.size}</span>
                    </div>

                    {f.status === 'uploading' && (
                      <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${f.progress}%`, height: '100%', background: 'var(--purple)', transition: 'width 0.2s ease' }} />
                      </div>
                    )}

                    {f.status === 'success' && (
                      <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={10} /> {t.host_success}
                      </span>
                    )}

                    {f.status === 'error' && (
                      <span style={{ fontSize: '10px', color: '#ef4444' }}>
                        Error
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => removeFile(idx)} 
                    disabled={uploading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.3 : 0.7,
                      padding: '4px'
                    }}
                    title="Retirer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '20px', flexShrink: 0 }}>
              <button 
                className="btn-secondary" 
                onClick={clearList} 
                disabled={uploading}
                style={{ padding: '10px 20px', fontSize: '11px', borderRadius: '4px', cursor: uploading ? 'not-allowed' : 'pointer' }}
              >
                {t.host_clear}
              </button>

              <button 
                className="btn-primary" 
                onClick={handleUpload} 
                disabled={uploading || !selectedFiles.some(f => f.status === 'pending')}
                style={{ padding: '10px 24px', fontSize: '11px', borderRadius: '4px', cursor: (uploading || !selectedFiles.some(f => f.status === 'pending')) ? 'not-allowed' : 'pointer' }}
              >
                {uploading ? t.host_uploading.toUpperCase() : t.host_start}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: HISTORY LIST ── */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
            <h3 className="cinzel" style={{ fontSize: '13px', color: 'var(--purple-light)', letterSpacing: '2px', margin: 0 }}>
              {t.language === 'en' ? 'HOSTED HISTORY' : 'HISTORIQUE DES ENVOIS'}
            </h3>
            
            {/* Search filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '5px 10px 5px 28px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  outline: 'none',
                  width: '160px'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
            {filteredHistory.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, gap: '10px' }}>
                <ImageIcon size={32} color="var(--text-dim)" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {history.length === 0 ? (t.language === 'en' ? 'No hosted history yet' : 'Aucun historique pour le moment') : (t.language === 'en' ? 'No search matches' : 'Aucune correspondance')}
                </span>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <img 
                    src={item.url} 
                    alt="Hosted Preview" 
                    onClick={() => setFullscreen(item.url)}
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', background: '#000', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }} 
                  />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {editingId === item.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={editingName} 
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid var(--purple-light)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            color: '#fff',
                            fontSize: '11px',
                            outline: 'none'
                          }}
                          autoFocus
                        />
                        <button onClick={() => saveEdit(item.id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                          SAVE
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--crystal)', fontSize: '11.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <button 
                          onClick={() => startEditing(item.id, item.name)} 
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', opacity: 0.6 }}
                          title="Renommer"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                    
                    <span 
                      style={{ fontSize: '10.5px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', fontFamily: 'monospace' }}
                      title={item.url}
                    >
                      {item.url}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{item.timestamp}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => copyToClipboard(item.url, item.id)} 
                      style={{
                        background: copiedId === item.id ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid',
                        borderColor: copiedId === item.id ? '#10b981' : 'var(--border)',
                        color: copiedId === item.id ? '#10b981' : 'var(--crystal)',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                    >
                      {copiedId === item.id ? <Check size={10} /> : <Copy size={10} />}
                      {copiedId === item.id ? t.host_copied : (t.language === 'en' ? 'Copy' : 'Copier')}
                    </button>
                    <button 
                      onClick={() => deleteFromHistory(item.id)} 
                      style={{
                        background: 'rgba(239,68,68,0.05)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        color: '#ef4444',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="Supprimer de l'historique"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .drag-drop-area { transition: all 0.25s ease-in-out; }
        .drag-drop-area:hover {
          border-color: #c084fc !important;
          background: rgba(168,85,247,0.04) !important;
          box-shadow: 0 0 20px rgba(168,85,247,0.1);
        }
      `}} />
    </div>
  );
};

export default ImageHostingView;
