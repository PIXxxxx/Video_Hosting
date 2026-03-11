import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';  // предполагаю, что путь правильный
import './ChannelPage.css';

interface ChannelVideo {
  id: number;
  title: string;
  description: string;
  views: number;
  upload_date: string;
  author: string;
  author_id: number;
  thumbnail: string;
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

const ChannelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChannel = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/channel/${id}`);
        setChannel(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchChannel();
  }, [id]);

  if (loading) return <div className="loading">Загрузка канала...</div>;
  if (error || !channel) return <div className="error-message">{error || 'Канал не найден'}</div>;

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
          <p className="sub-count">
            {channel.videos_count} видео • {channel.videos_count} просмотров (пока заглушка)
          </p>
          {/* Позже можно добавить кнопку "Подписаться" */}
        </div>
      </div>

      {/* Список видео */}
      <section className="channel-videos">
        <h2>Видео</h2>

        {channel.videos.length === 0 ? (
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ChannelPage;