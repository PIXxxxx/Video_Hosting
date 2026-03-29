import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Hls from 'hls.js';
import VideoCard from '../components/VideoCard';
import CommentSection from '../components/CommentSection';
import SubscribeButton from '../components/SubscribeButton';
import { useAuth } from '../context/AuthContext';
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
  thumbnail?: string;
}

const VideoWatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLikeStatus, setUserLikeStatus] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [videoRes, relatedRes, likesRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/video/${id}`),
          axios.get('http://localhost:8000/api/videos', { params: { skip: 0, limit: 20 } }),
          axios.get(`http://localhost:8000/api/video/${id}/likes`)
        ]);

        setVideo(videoRes.data);
        const filtered = relatedRes.data.filter((v: Video) => v.id !== Number(id));
        setRelatedVideos(filtered.slice(0, 10));

        setLikes(likesRes.data.likes);
        setDislikes(likesRes.data.dislikes);

        setLoading(false);
      } catch (err) {
        setError('Не удалось загрузить видео');
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (!video || !videoRef.current) return;

    const videoEl = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (video.hls_playlist_path) {
      const videoUrl = `http://localhost:8000/${video.hls_playlist_path.replace(/\\/g, '/')}`;

      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1024 * 1024,
          backBufferLength: 90,
          lowLatencyMode: false,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 500,
        });

        hlsRef.current = hls;
        hls.loadSource(videoUrl);
        hls.attachMedia(videoEl);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoEl.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError('HLS не работает, переключаемся на MP4...');
            if (video.file_path) {
              videoEl.src = `http://localhost:8000/${video.file_path.replace(/\\/g, '/')}`;
              videoEl.load();
            }
          }
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = videoUrl;
      }
    } else if (video.file_path) {
      videoEl.src = `http://localhost:8000/${video.file_path.replace(/\\/g, '/')}`;
      videoEl.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video]);

  const toggleLike = async (isLike: boolean) => {
    try {
      await axios.post(`http://localhost:8000/api/video/${id}/like`, { is_like: isLike });
      const res = await axios.get(`http://localhost:8000/api/video/${id}/likes`);
      setLikes(res.data.likes);
      setDislikes(res.data.dislikes);
      setUserLikeStatus(isLike);
    } catch (err) {
      console.error('Ошибка при голосовании:', err);
    }
  };

  if (loading) return <div className="loading-container">Загрузка...</div>;
  if (error || !video) return <div className="error-container">{error || 'Видео не найдено'}</div>;

  return (
    <div className="video-watch-page">
      <div className="main-layout">
        <div className="left-column">
          <div className="video-player-wrapper">
            <video
              ref={videoRef}
              controls
              playsInline
              poster={`http://localhost:8000/media/thumbnails/${video.id}.jpg`}
            />
          </div>

          <div className="video-info">
            <h1>{video.title}</h1>
            <div className="meta">
              <span>{video.views} просмотров</span>
              <span>•</span>
              <span>{new Date(video.upload_date).toLocaleDateString('ru-RU')}</span>
            </div>

            <div className="author-block">
              <p className="author">Автор: {video.author || 'Аноним'}</p>

              {/* Кнопка подписки под видео */}
              {video.author_id && (
                <SubscribeButton authorId={video.author_id} />
              )}
            </div>

            {video.description && (
              <p className="description">{video.description}</p>
            )}

            <div className="like-buttons">
              <button
                className={`like-btn ${userLikeStatus === true ? 'active' : ''}`}
                onClick={() => toggleLike(true)}
              >
                👍 {likes}
              </button>
              <button
                className={`like-btn ${userLikeStatus === false ? 'active' : ''}`}
                onClick={() => toggleLike(false)}
              >
                👎 {dislikes}
              </button>
            </div>

            {currentUser && currentUser.id === video.author_id && (
              <Link to={`/video/${video.id}/edit`} className="edit-link">
                ✏️ Редактировать видео
              </Link>
            )}
          </div>

          <CommentSection videoId={Number(id)} />
        </div>

        <aside className="right-column">
          <div className="related-section">
            <h2>Рекомендации</h2>
            <div className="related-list">
              {relatedVideos.map(v => (
                <VideoCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  views={v.views}
                  upload_date={v.upload_date}
                  author_id={v.author_id}
                  author={v.author}
                  compact={true}
                  enableHoverPreview={true}
                  file_path={v.file_path}
                  thumbnail={v.thumbnail}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default VideoWatchPage;