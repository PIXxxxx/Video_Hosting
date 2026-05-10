// src/pages/VidicFeed.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import VidicVideoPlayer from '../components/VidicVideoPlayer';
import './VidicFeed.css';

interface VidicVideo {
  id: number;
  title: string;
  description: string;
  video_url: string;
  views: number;
  likes_count: number;
  is_liked: boolean;
  author_id: number;
  author: string;
  author_avatar: string;
  upload_date: string;
}

const VidicFeed: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetVideoId = searchParams.get('video');
  
  const [allVideos, setAllVideos] = useState<VidicVideo[]>([]);
  const [videos, setVideos] = useState<VidicVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const [likesState, setLikesState] = useState<Record<number, { count: number; liked: boolean }>>({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    const fetchVideos = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/vidic/feed?limit=50');
            console.log('📱 Загружено Vidic видео:', response.data.length);
            setAllVideos(response.data);
            
            // Инициализируем состояние лайков
            const initialLikes: Record<number, { count: number; liked: boolean }> = {};
            response.data.forEach((video: VidicVideo) => {
                initialLikes[video.id] = { 
                    count: video.likes_count || 0, 
                    liked: video.is_liked || false 
                };
            });
            setLikesState(initialLikes);
            
            // Переупорядочиваем видео: целевое видео становится первым
            if (targetVideoId) {
              const targetId = parseInt(targetVideoId);
              const targetVideo = response.data.find((v: VidicVideo) => v.id === targetId);
              const otherVideos = response.data.filter((v: VidicVideo) => v.id !== targetId);
              
              if (targetVideo) {
                // Целевое видео первым, остальные за ним
                setVideos([targetVideo, ...otherVideos]);
                setCurrentIndex(0); // Всегда начинаем с индекса 0
              } else {
                setVideos(response.data);
              }
            } else {
              setVideos(response.data);
            }
            
            setLoading(false);
        } catch (err) {
            console.error('Ошибка загрузки Vidic:', err);
            setError('Не удалось загрузить вертикальные видео');
            setLoading(false);
        }
    };
    fetchVideos();
  }, [targetVideoId]);

  // Прокрутка только при первом рендере
  useEffect(() => {
    if (!loading && feedRef.current && !hasInitialized.current && targetVideoId) {
      // Убеждаемся, что мы на правильной позиции (индекс 0)
      feedRef.current.scrollTo({ top: 0, behavior: 'auto' });
      hasInitialized.current = true;
    }
  }, [loading, targetVideoId]);

  const incrementView = async (videoId: number) => {
    try {
      await axios.post(`http://localhost:8000/api/vidic/${videoId}/view`);
    } catch (err) {
      console.error('Ошибка при отметке просмотра:', err);
    }
  };

  const handleLike = async (videoId: number) => {
    try {
      const current = likesState[videoId];
      const newLiked = !current.liked;
      const newCount = newLiked ? current.count + 1 : current.count - 1;
      
      setLikesState(prev => ({
        ...prev,
        [videoId]: { count: newCount, liked: newLiked }
      }));
      
      const response = await axios.post(`http://localhost:8000/api/vidic/${videoId}/like`);
      
      setLikesState(prev => ({
        ...prev,
        [videoId]: { 
          count: response.data.likes_count, 
          liked: response.data.liked 
        }
      }));
      
    } catch (err) {
      console.error('Ошибка при лайке:', err);
      const current = likesState[videoId];
      setLikesState(prev => ({
        ...prev,
        [videoId]: { count: current.count, liked: !current.liked }
      }));
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const viewportHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / viewportHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
      // Обновляем URL для текущего видео
      const newUrl = `/vidic?video=${videos[newIndex].id}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentIndex, videos]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="vidic-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка Vidic...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vidic-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Повторить</button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="vidic-empty">
        <div className="empty-icon">📱</div>
        <h3>Пока нет Vidic видео</h3>
        <p>Загрузите первое вертикальное видео</p>
        <a href="/upload/vidic" className="upload-link">Загрузить видео</a>
      </div>
    );
  }

  return (
    <div className="vidic-feed" ref={feedRef} onScroll={handleScroll}>
      {videos.map((video, index) => (
        <div key={video.id} className="vidic-item">
          <VidicVideoPlayer
            src={video.video_url}
            isActive={index === currentIndex}
            onView={() => incrementView(video.id)}
            onLike={() => handleLike(video.id)}
            likesCount={likesState[video.id]?.count || 0}
            isLiked={likesState[video.id]?.liked || false}
          />

          <div className="vidic-overlay">
            <div className="vidic-info">
              <div className="vidic-author">
                <img 
                  src={video.author_avatar} 
                  alt={video.author}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${video.author}&background=065fd4&color=fff&size=64`;
                  }}
                />
                <div>
                  <h4>{video.title}</h4>
                  <p>@{video.author}</p>
                </div>
              </div>
              <p className="vidic-description">{video.description}</p>
            </div>

            <div className="vidic-actions">
              <button 
                className={`action-btn like ${likesState[video.id]?.liked ? 'active' : ''}`}
                onClick={() => handleLike(video.id)}
              >
                <span className="icon">
                  {likesState[video.id]?.liked ? '❤️' : '🤍'}
                </span>
                <span className="count">{formatNumber(likesState[video.id]?.count || 0)}</span>
              </button>
              
              <button className="action-btn comment">
                <span className="icon">💬</span>
              </button>
              
              <button className="action-btn share">
                <span className="icon">↗️</span>
              </button>
              
              <a href={`/channel/${video.author_id}`} className="action-btn author">
                <img src={video.author_avatar} alt={video.author} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VidicFeed;