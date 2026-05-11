// src/components/AddToPlaylistModal.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AddToPlaylistModal.css';

interface AddToPlaylistModalProps {
  videoId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Playlist {
  id: number;
  title: string;
  is_private: boolean;
  videos_count: number;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  videoId,
  onClose,
  onSuccess
}) => {
  const { user, token } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistPrivate, setNewPlaylistPrivate] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  useEffect(() => {
    if (!user) return;
    const fetchPlaylists = async () => {
      try {
        const res = await api.get('/api/playlists/me');
        setPlaylists(res.data);
      } catch (err) {
        console.error('Ошибка загрузки плейлистов:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, [user]);

  const addToPlaylist = async (playlistId: number) => {
    setAdding(true);
    setMessage('');
    try {
      await api.post(`/api/playlist/${playlistId}/add`, { video_id: videoId });
      setMessage('✅ Видео добавлено в плейлист!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.detail || 'Не удалось добавить видео'}`);
    } finally {
      setAdding(false);
    }
  };

  const createAndAddToPlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    setAdding(true);
    setMessage('');
    try {
      const createRes = await api.post('/api/playlists/', {
        title: newPlaylistTitle.trim(),
        description: newPlaylistDesc,
        is_private: newPlaylistPrivate
      });
      await api.post(`/api/playlist/${createRes.data.id}/add`, { video_id: videoId });
      setMessage('✅ Плейлист создан и видео добавлено!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.detail || 'Ошибка'}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="playlist-modal-overlay" onClick={onClose}>
      <div className="playlist-modal" onClick={e => e.stopPropagation()}>
        <div className="playlist-modal-header">
          <h3>Добавить в плейлист</h3>
          <button className="playlist-modal-close" onClick={onClose}>✕</button>
        </div>

        {message && (
          <div className={`playlist-message ${message.startsWith('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="playlist-loading">Загрузка...</div>
        ) : (
          <>
            <div className="playlist-list">
              {playlists.length > 0 ? (
                playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    className="playlist-option-btn"
                    onClick={() => addToPlaylist(playlist.id)}
                    disabled={adding}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 10H2v4h20v-4zM22 6H2v2h20V6zM14 16H2v2h12v-2z"/>
                      <path d="M18 14v4h2v-4h-2zM18 14l3 2-3 2v-2z"/>
                    </svg>
                    <div className="playlist-option-info">
                      <span className="playlist-option-title">{playlist.title}</span>
                      <span className="playlist-option-meta">
                        {playlist.is_private && '🔒 '}{playlist.videos_count} видео
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="playlist-empty">У вас пока нет плейлистов</p>
              )}
            </div>

            {!showCreateForm ? (
              <button 
                className="playlist-create-toggle"
                onClick={() => setShowCreateForm(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Создать новый плейлист
              </button>
            ) : (
              <div className="playlist-create-form">
                <input
                  type="text"
                  className="playlist-form-input"
                  placeholder="Название плейлиста"
                  value={newPlaylistTitle}
                  onChange={e => setNewPlaylistTitle(e.target.value)}
                  disabled={adding}
                />
                <textarea
                  className="playlist-form-textarea"
                  placeholder="Описание (необязательно)"
                  value={newPlaylistDesc}
                  onChange={e => setNewPlaylistDesc(e.target.value)}
                  disabled={adding}
                />
                <label className="playlist-form-checkbox">
                  <input
                    type="checkbox"
                    checked={newPlaylistPrivate}
                    onChange={e => setNewPlaylistPrivate(e.target.checked)}
                    disabled={adding}
                  />
                  Приватный плейлист
                </label>
                <div className="playlist-form-actions">
                  <button 
                    className="playlist-form-submit"
                    onClick={createAndAddToPlaylist}
                    disabled={adding || !newPlaylistTitle.trim()}
                  >
                    {adding ? 'Создание...' : 'Создать и добавить'}
                  </button>
                  <button 
                    className="playlist-form-cancel"
                    onClick={() => setShowCreateForm(false)}
                    disabled={adding}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;