import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';
import './VideoListPage.css';

// SVG иконки
const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" className="error-icon">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

const NoVideosIcon = () => (
  <svg viewBox="0 0 24 24" className="no-videos-icon">
    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
  </svg>
);

interface Video {
  id: number;
  title: string;
  views: number;
  upload_date: string;
  author_id: number;
  author?: string;
  is_processed: boolean;
  file_path?: string;
  thumbnail?: string;
}

const PAGE_SIZE = 15;

interface Video {
  id: number;
  title: string;
  views: number;
  upload_date: string;
  author_id: number;
  author?: string;
  is_processed: boolean;
  file_path?: string;
  thumbnail?: string;
}

const VideoListPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const { isAuthenticated } = useAuth();
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('access_token');

  const fetchVideos = useCallback(async (pageNum: number, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    setError('');
    
    try {
      const currentToken = getToken();
      const headers: Record<string, string> = {};
      if (currentToken) headers.Authorization = `Bearer ${currentToken}`;
      
      let response;
      
      if (currentToken) {
        response = await axios.get('http://localhost:8000/api/recommendations/personal', {
          params: { limit: PAGE_SIZE, skip: pageNum * PAGE_SIZE },
          headers
        });
      } else {
        response = await axios.get('http://localhost:8000/api/videos', {
          params: { skip: pageNum * PAGE_SIZE, limit: PAGE_SIZE }
        });
      }
      
      const newVideos = response.data;
      console.log(`📥 Страница ${pageNum}: ${newVideos.length} видео (всего: ${append ? videos.length + newVideos.length : newVideos.length})`);
      
      if (append) {
        setVideos(prev => [...prev, ...newVideos]);
      } else {
        setVideos(newVideos);
      }
      
      setHasMore(newVideos.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      if (!append) setError('Не удалось загрузить видео');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [videos.length]);

  // Первая загрузка
  useEffect(() => {
    pageRef.current = 0;
    setVideos([]);
    setHasMore(true);
    fetchVideos(0, false);
  }, [isAuthenticated]);

  // Кнопка "Загрузить ещё"
  const handleLoadMore = () => {
    pageRef.current += 1;
    fetchVideos(pageRef.current, true);
  };

  if (loading) {
    return (
      <div className="video-list-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Загрузка рекомендаций</p>
        </div>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className="video-list-page">
        <div className="error-container">
          <ErrorIcon />
          <p className="error-message">{error}</p>
          <button onClick={() => { pageRef.current = 0; fetchVideos(0, false); }}>
            <RefreshIcon /> Обновить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-list-page">
      <div className="video-list-header">
        <h1>{isAuthenticated ? 'Рекомендации' : 'Популярные видео'}</h1>
      </div>
      
      {videos.length === 0 ? (
        <div className="no-videos">
          <NoVideosIcon />
          <h3>Пока нет видео</h3>
          <Link to="/upload"><button><UploadIcon /> Загрузить видео</button></Link>
        </div>
      ) : (
        <>
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
          
          <div className="load-more-container">
            {loadingMore ? (
              <div className="loading-more">
                <div className="loader"></div>
                <p>Загрузка...</p>
              </div>
            ) : hasMore ? (
              <button className="load-more-btn" onClick={handleLoadMore}>
                Загрузить ещё
              </button>
            ) : (
              <p className="no-more">Все видео загружены</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoListPage;