import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import SubscribeButton from '../components/SubscribeButton';
import { useAuth } from '../context/AuthContext';
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

  // Загрузка канала
  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/channel/${id}`);
        setChannel(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Не удалось загрузить канал');
      } finally {
        setLoading(false);
      }
    };

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

  if (loading) return <div className="loading">Загрузка канала...</div>;
  if (error || !channel) return <div className="error-message">{error || 'Канал не найден'}</div>;

  const isOwnChannel = currentUser?.id === Number(id);

  return (
    <div className="channel-page">
      {/* Шапка канала */}
      <div className="channel-header">
        <img
          src={channel.avatar_url}
          alt={channel.username}
          className="channel-avatar"
          onError={(e) => {
            e.currentTarget.src = `https://via.placeholder.com/128?text=${channel.username[0].toUpperCase()}`;
          }}
        />

        <div className="channel-info">
          <h1>{channel.username}</h1>
          <SubscribeButton authorId={channel.id} />
          <p className="sub-count">{channel.videos_count} видео</p>
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
          // Вкладка ВИДЕО
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
          // Вкладка ПЛЕЙЛИСТЫ
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

            {/* Кнопка создания нового плейлиста */}
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
    </div>
  );
};

export default ChannelPage;