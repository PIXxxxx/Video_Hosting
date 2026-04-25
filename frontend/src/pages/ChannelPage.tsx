import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
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

const ChannelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, token } = useAuth();

  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'videos' | 'playlists'>('videos');

  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [showBannerCrop, setShowBannerCrop] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  // Загрузка данных канала
  const fetchChannel = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/channel/${id}`);
      console.log('📥 Данные канала:', res.data);
      setChannel(res.data);
    } catch (err: any) {
      console.error('Ошибка загрузки канала:', err);
      setError(err.response?.data?.detail || 'Не удалось загрузить канал');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchChannel();
  }, [id]);

  // Загрузка плейлистов (только для своего канала)
  useEffect(() => {
    if (activeTab !== 'playlists' || !token || !currentUser || Number(id) !== currentUser.id) {
      return;
    }

    const fetchPlaylists = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/playlists/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPlaylists(res.data);
      } catch (err) {
        console.error('Ошибка загрузки плейлистов:', err);
      }
    };

    fetchPlaylists();
  }, [activeTab, token, currentUser, id]);

  const isOwnChannel = currentUser?.id === Number(id);

  // Выбор файла для обрезки
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

  // Сохранение обрезанного изображения
  const handleCropComplete = async (file: File, type: 'avatar' | 'banner') => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = type === 'avatar' ? '/api/me/avatar' : '/api/me/banner';
      await axios.post(`http://localhost:8000${endpoint}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchChannel(); // обновляем данные канала
      alert(type === 'avatar' ? 'Аватарка успешно обновлена!' : 'Шапка канала успешно обновлена!');
    } catch (err: any) {
      console.error(err);
      alert('Ошибка при загрузке: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) return <div className="loading">Загрузка канала...</div>;
  if (error || !channel) return <div className="error-message">{error || 'Канал не найден'}</div>;

  // Полный URL для баннера
  const bannerUrl = channel.banner_url 
    ? (channel.banner_url.startsWith('http') 
        ? channel.banner_url 
        : `http://localhost:8000/media/${channel.banner_url}`)
    : null;

  return (
    <div className="channel-page">
      {/* === ШАПКА КАНАЛА === */}
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
                ✏️
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect('avatar')}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div className="channel-info">
            <h1>{channel.username}</h1>
            <SubscribeButton authorId={channel.id} />
            <p className="sub-count">{channel.videos_count} видео</p>
          </div>

          {isOwnChannel && (
            <label className="edit-banner-btn">
              Изменить шапку
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect('banner')}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      {/* === ВКЛАДКИ === */}
      <div className="channel-tabs">
        <button
          className={`tab ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Видео ({channel.videos_count})
        </button>

        {isOwnChannel && (
          <button
            className={`tab ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            Плейлисты ({playlists.length})
          </button>
        )}
      </div>

      {/* === КОНТЕНТ ВКЛАДОК === */}
      <section className="channel-content">
        {activeTab === 'videos' ? (
          channel.videos.length === 0 ? (
            <p>На канале пока нет видео</p>
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
        ) : (
          // === ВКЛАДКА ПЛЕЙЛИСТОВ (полностью восстановлена) ===
          <>
            {playlists.length === 0 ? (
              <p>У вас пока нет плейлистов.</p>
            ) : (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <Link
                    key={playlist.id}
                    to={`/playlist/${playlist.id}`}
                    className="playlist-card"
                  >
                    <div className="playlist-thumbnail-placeholder">📚</div>
                    <h3>{playlist.title}</h3>
                    <p>{playlist.videos_count} видео</p>
                    {playlist.is_private && <span className="private-badge">🔒 Приватный</span>}
                  </Link>
                ))}
              </div>
            )}

            {isOwnChannel && (
              <button 
                className="create-playlist-btn"
                onClick={() => alert('Форма создания плейлиста будет здесь')}
                style={{ marginTop: '20px' }}
              >
                + Создать новый плейлист
              </button>
            )}
          </>
        )}
      </section>

      {/* === МОДАЛКИ ОБРЕЗКИ === */}
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
        title="Обрежьте шапку канала (рекомендуется 2560×1440)"
        onCropComplete={(file) => handleCropComplete(file, 'banner')}
      />
    </div>
  );
};

export default ChannelPage;