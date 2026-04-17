import React, { useEffect, useState } from 'react';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import './VideoListPage.css';

interface Video {
  id: number;
  title: string;
  author?: string;
  author_id: number;
  views: number;
  upload_date: string;
  thumbnail?: string;
  file_path?: string;        // ← Добавили это поле
  hls_playlist_path?: string | null;
}

const VideoList: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [personalRecommendations, setPersonalRecommendations] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    fetchMainVideos();
    
    if (token) {
      fetchPersonalRecommendations();
    }
  }, []);

  const fetchMainVideos = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/videos', {
        params: { skip: 0, limit: 30 }
      });
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalRecommendations = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/recommendations/personal', {
        params: { limit: 12 }
      });
      setPersonalRecommendations(response.data);
    } catch (error) {
      console.error('Error fetching personal recommendations:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Загрузка рекомендаций...</p>
      </div>
    );
  }

  return (
    <div className="video-list-page">
      <div className="video-list-header">
        <h1>Рекомендации</h1>
      </div>

      {/* Персональные рекомендации */}
      {isAuthenticated && personalRecommendations.length > 0 && (
        <>
          <h2 className="section-title">Для вас</h2>
          <div className="video-grid">
            {personalRecommendations.map(video => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                views={video.views}
                upload_date={video.upload_date}
                author_id={video.author_id}
                author={video.author}
                enableHoverPreview={true}
                file_path={video.file_path}           // ← Теперь есть в интерфейсе
                thumbnail={video.thumbnail}
              />
            ))}
          </div>
        </>
      )}

      {/* Общие видео */}
      <h2 className="section-title">
        {isAuthenticated ? "Популярное" : "Все видео"}
      </h2>
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
            enableHoverPreview={true}
            file_path={video.file_path}
            thumbnail={video.thumbnail}
          />
        ))}
      </div>

      {videos.length === 0 && (
        <div className="no-videos">
          <p>Пока нет видео</p>
        </div>
      )}
    </div>
  );
};

export default VideoList;