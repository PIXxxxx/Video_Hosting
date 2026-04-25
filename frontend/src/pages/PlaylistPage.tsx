import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import './PlaylistPage.css';

// SVG Иконки остаются те же...
const PlaylistIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22,10H2v4h20V10z M22,6H2v2h20V6z M14,16H2v2h12V16z"/>
    <path d="M18,14v4h2v-4H18z M18,14l3,2l-3,2V14z"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
  </svg>
);

const EmptyPlaylistIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
    <path d="M12 11.55c-.56 0-1.01.45-1.01 1.01V15h-2.44c-.56 0-1.01.45-1.01 1.01s.45 1.01 1.01 1.01H11v2.43c0 .56.45 1.01 1.01 1.01s1.01-.45 1.01-1.01v-2.43h2.44c.56 0 1.01-.45 1.01-1.01s-.45-1.01-1.01-1.01H13v-2.44c0-.56-.45-1.01-1.01-1.01z" opacity="0.5"/>
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
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPlaylist = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`http://localhost:8000/api/playlist/${id}`);
      const playlistData = response.data;
      setPlaylist(playlistData);
      
      // Загружаем данные автора для аватарки
      if (playlistData.author_id) {
        try {
          const authorResponse = await axios.get(`http://localhost:8000/api/channel/${playlistData.author_id}`);
          setAuthorData(authorResponse.data);
        } catch (err) {
          console.error('Ошибка загрузки данных автора:', err);
        }
      }
    } catch (err: any) {
      console.error('Ошибка загрузки плейлиста:', err);
      setError(err.response?.data?.detail || 'Не удалось загрузить плейлист');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPlaylist();
  }, [id]);

  const getInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'A';
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)} млн`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)} тыс.`;
    return views.toString();
  };

  if (loading) {
    return (
      <div className="playlist-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Загрузка плейлиста</p>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="playlist-page">
        <div className="error-container">
          <h3>Ошибка</h3>
          <p>{error || 'Плейлист не найден'}</p>
          <button onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  const totalViews = playlist.videos.reduce((sum, v) => sum + (v.views || 0), 0);

  return (
    <div className="playlist-page">
      {/* Шапка плейлиста */}
      <div className="playlist-header">
        <div className="playlist-header-top">
          <div className="playlist-icon">
            <PlaylistIcon />
          </div>

          <div className="playlist-info">
            <div className="playlist-type">
              {playlist.is_private ? 'Приватный плейлист' : 'Плейлист'}
            </div>
            <h1>{playlist.title}</h1>
            
            <div className="playlist-meta">
              <Link to={`/channel/${playlist.author_id}`} className="playlist-author">
                {/* Аватарка автора с правильной загрузкой */}
                {authorData?.avatar_url ? (
                  <img 
                    src={authorData.avatar_url} 
                    alt={playlist.author}
                    className="author-avatar-small-img"
                    onError={(e) => {
                      // Если не загрузилась - показываем инициалы
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'author-avatar-small';
                        placeholder.textContent = getInitial(playlist.author);
                        parent.insertBefore(placeholder, parent.firstChild);
                      }
                    }}
                  />
                ) : (
                  <div className="author-avatar-small">
                    {getInitial(playlist.author)}
                  </div>
                )}
                {playlist.author}
              </Link>
              
              <div className="playlist-stats">
                <span>{playlist.videos_count} видео</span>
                <span className="dot"></span>
                <span>{formatViews(totalViews)} просмотров</span>
              </div>
            </div>

            {playlist.is_private && (
              <div className="playlist-badges">
                <span className="badge private">
                  <LockIcon />
                  Приватный
                </span>
              </div>
            )}

            <div className="playlist-actions">
              <button className="play-btn">
                <PlayIcon />
                Смотреть все
              </button>
              <button className="action-btn-secondary">
                <ShuffleIcon />
                Перемешать
              </button>
            </div>
          </div>
        </div>

        {playlist.description && (
          <div className="playlist-description">
            {playlist.description}
          </div>
        )}
      </div>

      {/* Список видео */}
      <div className="playlist-content">
        {playlist.videos.length > 0 ? (
          <>
            <div className="playlist-content-header">
              <h2>Видео в плейлисте</h2>
              <span className="video-count">{playlist.videos_count} видео</span>
            </div>
            
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
          </>
        ) : (
          <div className="empty-state">
            <EmptyPlaylistIcon />
            <h3>Плейлист пуст</h3>
            <p>Добавьте видео, чтобы они появились здесь</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaylistPage;