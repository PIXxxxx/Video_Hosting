// src/components/AddToPlaylistModal.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AddToPlaylistModal.css';   // создадим стили ниже

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
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');

  // Загружаем плейлисты пользователя
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!user) return;
      try {
        const res = await axios.get('http://localhost:8000/api/playlists/me');
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
      await axios.post(`http://localhost:8000/api/playlist/${playlistId}/add`, {
        video_id: videoId
      });

      setMessage('✅ Видео успешно добавлено в плейлист!');
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Не удалось добавить видео';
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setAdding(false);
    }
  };

  const createAndAddToPlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;

    setAdding(true);
    setMessage('');

    try {
      // 1. Создаём новый плейлист
      const createRes = await axios.post('http://localhost:8000/api/playlists/', {
        title: newPlaylistTitle.trim(),
        description: '',
        is_private: false
      });

      const newPlaylistId = createRes.data.id;

      // 2. Добавляем в него видео
      await axios.post(`http://localhost:8000/api/playlist/${newPlaylistId}/add`, {
        video_id: videoId
      });

      setMessage('✅ Новый плейлист создан и видео добавлено!');

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.detail || 'Ошибка создания плейлиста'}`);
    } finally {
      setAdding(false);
    }
  };

  if (!user) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Добавить в плейлист</h3>
          <p>Войдите в аккаунт, чтобы использовать плейлисты.</p>
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Добавить видео в плейлист</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {message && <div className="modal-message">{message}</div>}

        {loading ? (
          <p>Загрузка плейлистов...</p>
        ) : (
          <>
            {/* Список существующих плейлистов */}
            <div className="playlists-list">
              {playlists.length > 0 ? (
                playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    className="playlist-option"
                    onClick={() => addToPlaylist(playlist.id)}
                    disabled={adding}
                  >
                    📚 {playlist.title}
                    {playlist.is_private && ' 🔒'}
                    <span className="video-count">({playlist.videos_count})</span>
                  </button>
                ))
              ) : (
                <p className="no-playlists">У вас пока нет плейлистов</p>
              )}
            </div>

            {/* Кнопка создания нового плейлиста */}
            {!showCreateForm ? (
              <button 
                className="create-playlist-btn"
                onClick={() => setShowCreateForm(true)}
              >
                + Создать новый плейлист
              </button>
            ) : (
              <div className="create-playlist-form">
                <input
                  type="text"
                  placeholder="Название нового плейлиста"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  disabled={adding}
                />
                <div className="form-buttons">
                  <button 
                    onClick={createAndAddToPlaylist} 
                    disabled={adding || !newPlaylistTitle.trim()}
                  >
                    {adding ? 'Создание...' : 'Создать и добавить'}
                  </button>
                  <button onClick={() => setShowCreateForm(false)} disabled={adding}>
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <button className="cancel-btn" onClick={onClose} disabled={adding}>
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default AddToPlaylistModal;