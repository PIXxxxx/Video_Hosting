import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import VidicCard from '../components/VidicCard';
import SubscribeButton from '../components/SubscribeButton';
import { useAuth } from '../context/AuthContext';
import ImageCropModal from '../components/ImageCropModal';
import './ChannelPage.css';

interface ChannelVideo {
  id: number;
  title: string;
  description?: string;
  views: number;
  upload_date: string;
  author: string;
  author_id: number;
  thumbnail?: string;
  file_path?: string;
  hls_playlist_path?: string | null;
  is_processed: boolean;
}

interface ChannelData {
  id: number;
  username: string;
  avatar_url: string;
  banner_url?: string;
  videos_count: number;
  videos: ChannelVideo[];
}

interface Playlist {
  id: number;
  title: string;
  description?: string;
  is_private: boolean;
  videos_count: number;
}

interface VidicVideo {
  id: number;
  title: string;
  description?: string;
  views: number;
  upload_date: string;
  author: string;
  author_id: number;
  thumbnail_path?: string | null;
  video_url: string;
}

// SVG иконки
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const PlaylistIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 10H2v4h20v-4zM22 6H2v2h20V6zM14 16H2v2h12v-2z"/>
    <path d="M18 14v4h2v-4h-2zM18 14l3 2-3 2v-2z"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75L20.71 7.04z"/>
  </svg>
);

const VidicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="3" fill="#ff0000"/>
  </svg>
);

const ChannelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, token } = useAuth();

  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [vidicVideos, setVidicVideos] = useState<VidicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVidic, setLoadingVidic] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'videos' | 'playlists' | 'vidic'>('videos');

  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [showBannerCrop, setShowBannerCrop] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const fetchChannel = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/channel/${id}`);
      setChannel(res.data);
    } catch (err: any) {
      console.error('Ошибка загрузки канала:', err);
      setError(err.response?.data?.detail || 'Не удалось загрузить канал');
    } finally {
      setLoading(false);
    }
  };

  const fetchVidicVideos = async () => {
    setLoadingVidic(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/channel/${id}/vidic`);
      setVidicVideos(response.data);
    } catch (err) {
      console.error('Ошибка загрузки Vidic видео:', err);
      setVidicVideos([]);
    } finally {
      setLoadingVidic(false);
    }
  };

  useEffect(() => {
    if (id) fetchChannel();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'vidic' && id) {
      fetchVidicVideos();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== 'playlists' || !token || !currentUser || Number(id) !== currentUser.id) {
      return;
    }

    const fetchPlaylists = async () => {
      try {
        const res = await api.get('/api/playlists/me');
        setPlaylists(res.data);
      } catch (err) {
        console.error('Ошибка загрузки плейлистов:', err);
      }
    };

    fetchPlaylists();
  }, [activeTab, token, currentUser, id]);

  const isOwnChannel = currentUser?.id === Number(id);

  const handleFileSelect = (type: 'avatar' | 'banner') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImageSrc(event.target?.result as string);
      if (type === 'avatar') setShowAvatarCrop(true);
      else setShowBannerCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (file: File, type: 'avatar' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = type === 'avatar' ? '/api/me/avatar' : '/api/me/banner';
      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchChannel();
      alert(type === 'avatar' ? 'Аватарка успешно обновлена!' : 'Шапка канала успешно обновлена!');
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при загрузке: ' + (err.response?.data?.detail || err.message));
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)} млн`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)} тыс.`;
    return views.toString();
  };

  if (loading) return <div className="loading">Загрузка канала...</div>;
  if (error || !channel) return <div className="error-message">{error || 'Канал не найден'}</div>;

  const bannerUrl = channel.banner_url 
    ? (channel.banner_url.startsWith('http') 
        ? channel.banner_url 
        : `http://localhost:8000/${channel.banner_url}`)
    : null;

  return (
    <div className="channel-page">
      {/* Шапка канала */}
      <div 
        className="channel-header"
        style={{
          backgroundImage: bannerUrl 
            ? `url(${bannerUrl})` 
            : 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="banner-overlay" />

        <div className="channel-header-content">
          <div className="avatar-container">
            <img
              src={channel.avatar_url}
              alt={channel.username}
              className="channel-avatar"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.username)}&background=065fd4&color=fff&size=128`;
              }}
            />
            
            {isOwnChannel && (
              <label className="edit-avatar-btn">
                <EditIcon />
                <input type="file" accept="image/*" onChange={handleFileSelect('avatar')} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div className="channel-info">
            <h1>{channel.username}</h1>
            <div className="channel-meta">
              <SubscribeButton authorId={channel.id} />
              <span className="channel-stats">{channel.videos_count} видео</span>
            </div>
          </div>

          {isOwnChannel && (
            <label className="edit-banner-btn">
              <EditIcon />
              Изменить шапку
              <input type="file" accept="image/*" onChange={handleFileSelect('banner')} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      {/* Вкладки */}
      <div className="channel-tabs">
        <button className={`tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>
          Видео
        </button>

        {isOwnChannel && (
          <button className={`tab ${activeTab === 'playlists' ? 'active' : ''}`} onClick={() => setActiveTab('playlists')}>
            Плейлисты
          </button>
        )}

        {isOwnChannel && (
          <button className={`tab ${activeTab === 'vidic' ? 'active' : ''}`} onClick={() => setActiveTab('vidic')}>
            Vidic
          </button>
        )}
      </div>

      {/* Контент */}
      <section className="channel-content">
        {/* Видео */}
        {activeTab === 'videos' && (
          channel.videos.length === 0 ? (
            <div className="empty-state">
              <p>На канале пока нет видео</p>
            </div>
          ) : (
            <div className="video-grid">
              {channel.videos.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  title={video.title}
                  views={video.views}
                  upload_date={video.upload_date}
                  author_id={video.author_id}
                  author={video.author}
                  file_path={video.file_path}
                  enableHoverPreview={true}
                  thumbnail={video.thumbnail}
                />
              ))}
            </div>
          )
        )}

        {/* Плейлисты */}
        {activeTab === 'playlists' && (
          <>
            {playlists.length === 0 ? (
              <div className="empty-state">
                <PlaylistIcon />
                <h3>У вас пока нет плейлистов</h3>
                <p>Создайте плейлист, чтобы сохранять видео</p>
              </div>
            ) : (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <Link key={playlist.id} to={`/playlist/${playlist.id}`} className="playlist-card">
                    <div className="playlist-thumbnail">
                      <PlaylistIcon />
                      <span className="playlist-count">{playlist.videos_count}</span>
                    </div>
                    <div className="playlist-info">
                      <h3>{playlist.title}</h3>
                      <p>{playlist.videos_count} видео</p>
                      {playlist.is_private && (
                        <span className="private-badge">
                          <LockIcon />
                          Приватный
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Vidic */}
        {activeTab === 'vidic' && (
          <div className="vidic-tab-content">
            {loadingVidic ? (
              <div className="loading">Загрузка...</div>
            ) : vidicVideos.length === 0 ? (
              <div className="empty-state">
                <VidicIcon />
                <h3>Пока нет вертикальных видео</h3>
                {isOwnChannel && (
                  <Link to="/upload/vidic" className="upload-vidic-btn">
                    Загрузить первое Vidic видео
                  </Link>
                )}
              </div>
            ) : (
              <div className="vidic-grid">
                {vidicVideos.map((video) => (
                  <VidicCard
                    key={video.id}
                    id={video.id}
                    title={video.title}
                    views={video.views}
                    upload_date={video.upload_date}
                    author_id={video.author_id}
                    author={video.author}
                    thumbnail_path={video.thumbnail_path}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Модалки обрезки */}
      <ImageCropModal
        isOpen={showAvatarCrop}
        onClose={() => setShowAvatarCrop(false)}
        imageSrc={tempImageSrc}
        aspect={1}
        title="Обрежьте аватарку"
        onCropComplete={(file) => handleCropComplete(file, 'avatar')}
      />

      <ImageCropModal
        isOpen={showBannerCrop}
        onClose={() => setShowBannerCrop(false)}
        imageSrc={tempImageSrc}
        aspect={16 / 9}
        title="Обрежьте шапку канала"
        onCropComplete={(file) => handleCropComplete(file, 'banner')}
      />
    </div>
  );
};

export default ChannelPage;