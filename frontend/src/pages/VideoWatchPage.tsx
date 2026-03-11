import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import Hls from 'hls.js';
import './VideoWatchPage.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  views: number;
  upload_date: string;
  author_id: number;
  author?: string;
  is_processed: boolean;
  hls_playlist_path?: string | null;
  file_path?: string;
  
}

const VideoWatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Загрузка видео + рекомендации
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const [videoRes, relatedRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/video/${id}`),
          axios.get('http://localhost:8000/api/videos', { params: { skip: 0, limit: 20 } })
        ]);

        setVideo(videoRes.data);

        const filtered = relatedRes.data.filter((v: Video) => v.id !== Number(id));
        setRelatedVideos(filtered.slice(0, 10));
        setLoading(false);
      } catch (err) {
        setError('Не удалось загрузить видео');
        setLoading(false);
      }
    };

    if (id) fetchVideo();
  }, [id]);

  // === ИСПРАВЛЕННЫЙ ПЛЕЕР (HLS + правильная обработка ошибок) ===
useEffect(() => {
  if (!video || !videoRef.current) return;

  const videoElement = videoRef.current;

  // Очистка предыдущего
  if (hlsRef.current) {
    hlsRef.current.destroy();
    hlsRef.current = null;
  }

  // Приоритет — HLS
  if (video.hls_playlist_path) {
    const videoUrl = `http://localhost:8000/${video.hls_playlist_path.replace(/\\/g, '/')}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        // ←←← ЭТИ НАСТРОЙКИ УБИРАЮТ ЗАВИСАНИЯ НА СТАРТЕ
        maxBufferLength: 30,          // сколько секунд буферизировать
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024, // 60 МБ
        backBufferLength: 90,
        lowLatencyMode: false,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
      });

      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS манифест загружен — начинаем воспроизведение');
        videoElement.play().catch(() => {});
      });

      // ←←← ИСПРАВЛЕНИЕ: падаем на MP4 ТОЛЬКО при fatal ошибке
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('❌ Критическая HLS ошибка → переключаемся на MP4', data);
          setError('HLS не работает, включаем обычный MP4...');
          
          if (video.file_path) {
            videoElement.src = `http://localhost:8000/${video.file_path.replace(/\\/g, '/')}`;
            videoElement.load();
          }
        } else {
          console.warn('⚠️ Некритичная ошибка HLS (восстанавливается автоматически):', data.details);
          // bufferStalledError теперь просто предупреждение, видео продолжит
        }
      });
    } 
    else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = videoUrl;
    }
  } 
  // Обычное MP4
  else if (video.file_path) {
    videoElement.src = `http://localhost:8000/${video.file_path.replace(/\\/g, '/')}`;
    videoElement.load();
  }

  return () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };
}, [video]);

  if (loading) return <div className="loading-container"><div className="loader"></div><p>Загрузка видео...</p></div>;
  if (error || !video) return <div className="error-container"><p>{error || 'Видео не найдено'}</p></div>;

  return (
    <div className="video-watch-page">
      <div className="video-container">
        <div className="video-player-wrapper">
          <video
            ref={videoRef}
            controls
            style={{ width: '100%', height: '100%' }}
            poster={`http://localhost:8000/media/thumbnails/${video.id}.jpg`}
            playsInline
          />
        </div>

        <div className="video-info-section">
          <h1>{video.title}</h1>
          <p>{video.views} просмотров • {new Date(video.upload_date).toLocaleDateString()}</p>
          <p>Автор: {video.author || 'Аноним'}</p>
          {video.description && <p className="video-description">{video.description}</p>}
        </div>
      </div>

            <div className="related-videos">
        <h2>Рекомендации</h2>
        <div className="related-videos-list">
          {relatedVideos.map((relatedVideo) => (   // ← ОБЯЗАТЕЛЬНО (relatedVideo)
            <VideoCard
            key={relatedVideo.id}
            id={relatedVideo.id}
            title={relatedVideo.title}
            views={relatedVideo.views}
            upload_date={relatedVideo.upload_date}
            author_id={relatedVideo.author_id}
            author={relatedVideo.author}
            compact={true}
            enableHoverPreview={true} 
            file_path={relatedVideo.file_path}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoWatchPage;