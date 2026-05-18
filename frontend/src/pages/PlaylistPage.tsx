import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';
import './PlaylistPage.css';

// SVG иконки
const PlaylistIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
    <path d="M22,10H2v4h20V10z M22,6H2v2h20V6z M14,16H2v2h12V16z"/>
    <path d="M18,14v4h2v-4H18z M18,14l3,2l-3,2V14z"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75L20.71 7.04z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

interface PlaylistVideo {
  id: number;
  title: string;
  author: string;
  thumbnail: string;
  views: number;
  is_processed: boolean;
}

interface PlaylistData {
  id: number;
  title: string;
  description?: string;
  is_private: boolean;
  author_id: number;
  author: string;
  videos_count: number;
  videos: PlaylistVideo[];
}

interface AuthorData {
  avatar_url: string;
  username: string;
}

const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, token } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Состояния для редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUser?.id === playlist?.author_id;

  const fetchPlaylist = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`http://localhost:8000/api/playlist/${id}`);
      const playlistData = response.data;
      setPlaylist(playlistData);
      setEditTitle(playlistData.title);
      setEditDescription(playlistData.description || '');
      setEditPrivate(playlistData.is_private);
      
      if (playlistData.author_id) {
        try {
          const authorResponse = await axios.get(`http://localhost:8000/api/channel/${playlistData.author_id}`);
          setAuthorData(authorResponse.data);
        } catch (err) {
          console.error('Ошибка загрузки автора:', err);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Не удалось загрузить плейлист');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPlaylist();
  }, [id]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await axios.put(`http://localhost:8000/api/playlist/${id}`, {
        title: editTitle,
        description: editDescription,
        is_private: editPrivate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditing(false);
      fetchPlaylist();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить плейлист?')) return;
    try {
      await axios.delete(`http://localhost:8000/api/playlist/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/');
    } catch (err) {
      alert('Не удалось удалить');
    }
  };

  const getInitial = (name: string) => name?.charAt(0).toUpperCase() || 'A';

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)} млн`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)} тыс.`;
    return views.toString();
  };

  if (loading) {
    return (
      <div className="playlist-page">
        <div className="loading-container"><div className="loader"></div><p>Загрузка...</p></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="playlist-page">
        <div className="error-container">
          <p>{error || 'Плейлист не найден'}</p>
          <button onClick={() => navigate('/')}>На главную</button>
        </div>
      </div>
    );
  }

  const totalViews = playlist.videos.reduce((sum, v) => sum + (v.views || 0), 0);

  return (
    <div className="playlist-page">
      <div className="playlist-header">
        <div className="playlist-header-top">
          <div className="playlist-icon"><PlaylistIcon /></div>

          <div className="playlist-info">
            {isEditing ? (
              // Режим редактирования
              <div className="edit-form">
                <input
                  className="edit-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Название"
                />
                <textarea
                  className="edit-textarea"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Описание"
                  rows={3}
                />
                <label className="edit-checkbox">
                  <input
                    type="checkbox"
                    checked={editPrivate}
                    onChange={e => setEditPrivate(e.target.checked)}
                  />
                  Приватный
                </label>
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button className="cancel-btn" onClick={() => setIsEditing(false)}>Отмена</button>
                </div>
              </div>
            ) : (
              // Режим просмотра
              <>
                <p className="playlist-type">{playlist.is_private ? 'Приватный плейлист' : 'Плейлист'}</p>
                <h1>{playlist.title}</h1>
                
                <div className="playlist-meta">
                  <Link to={`/channel/${playlist.author_id}`} className="playlist-author">
                    {authorData?.avatar_url ? (
                      <img src={authorData.avatar_url} alt={playlist.author} className="author-avatar-small-img" />
                    ) : (
                      <div className="author-avatar-small">{getInitial(playlist.author)}</div>
                    )}
                    {playlist.author}
                  </Link>
                  <span className="playlist-stats">{playlist.videos_count} видео • {formatViews(totalViews)} просмотров</span>
                </div>

                {isOwner && playlist.title !== "Понравившиеся" && playlist.title !== "Понравившиеся Vidic" && (
                  <div className="playlist-owner-actions">
                    <button className="btn-edit" onClick={() => setIsEditing(true)}>
                      <EditIcon /> Изменить
                    </button>
                    <button className="btn-delete" onClick={handleDelete}>
                      <DeleteIcon /> Удалить
                    </button>
                  </div>
                )}

                {/* Кнопка "Изменить" без "Удалить" для системных */}
                {isOwner && (playlist.title === "Понравившиеся" || playlist.title === "Понравившиеся Vidic") && (
                  <div className="playlist-owner-actions">
                    <button className="btn-edit" onClick={() => setIsEditing(true)}>
                      <EditIcon /> Изменить
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {playlist.description && !isEditing && (
          <div className="playlist-description">{playlist.description}</div>
        )}
      </div>

      <div className="playlist-content">
        {playlist.videos.length > 0 ? (
          <div className="video-grid">
            {playlist.videos.map(video => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                views={video.views}
                upload_date={new Date().toISOString()}
                author_id={playlist.author_id}
                author={video.author || playlist.author}
                thumbnail={video.thumbnail}
                enableHoverPreview={true}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <PlaylistIcon />
            <h3>Плейлист пуст</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistPage;