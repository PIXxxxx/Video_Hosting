import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import './VideoListPage.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  views: number;
  upload_date: string;
  author_id: number;
  author?: string;
  is_processed: boolean;

  file_path?: string;
  hls_playlist_path?: string | null;
}

const VideoListPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/videos', {
          params: {
            skip: 0,
            limit: 50 // Загружаем до 50 видео сразу
          }
        });
        setVideos(response.data);
        setLoading(false);
      } catch (err) {
        setError('Не удалось загрузить видео');
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Загрузка видео...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Попробовать снова</button>
      </div>
    );
  }

  return (
    <div className="video-list-page">
      <div className="video-list-header">
        <h1>Рекомендации</h1>
      </div>
      
      {videos.length === 0 ? (
        <div className="no-videos">
          <p>Пока нет видео</p>
          <p>Загрузите первое видео!</p>
        </div>
      ) : (
        <div className="video-grid">
            {videos.map(video => (
                <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                views={video.views}
                upload_date={video.upload_date}
                author_id={video.author_id}
                author={video.author}
                enableHoverPreview={true}           // ← ВКЛЮЧАЕМ hover
                file_path={video.file_path}
                />
            ))}
        </div>
      )}
    </div>
  );
};

export default VideoListPage;