import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import CommentSection from '../components/CommentSection';
import SubscribeButton from '../components/SubscribeButton';
import VideoPlayer from '../components/VideoPlayer';
import { useAuth } from '../context/AuthContext';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
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

interface AuthorData {
  avatar_url: string;
  username: string;
}

// SVG иконки
const LikeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11H3v10h4h1h9.43 c1.06,0,1.98-0.67,2.19-1.61l1.34-6C21.23,12.15,20.18,11,18.77,11z M7,20H4v-8h3V20z M19.98,13.17l-1.34,6 C18.54,19.65,18.03,20,17.43,20H8v-8.61l5.6-6.06C13.79,5.12,14.08,5,14.38,5c0.26,0,0.5,0.11,0.63,0.3 c0.07,0.1,0.15,0.26,0.09,0.47l-1.52,4.94L13.18,12h1.35h4.23c0.41,0,0.8,0.17,1.03,0.46C19.92,12.61,20.05,12.86,19.98,13.17z"/>
  </svg>
);

const DislikeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(180deg)' }}>
    <path d="M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11H3v10h4h1h9.43 c1.06,0,1.98-0.67,2.19-1.61l1.34-6C21.23,12.15,20.18,11,18.77,11z M7,20H4v-8h3V20z M19.98,13.17l-1.34,6 C18.54,19.65,18.03,20,17.43,20H8v-8.61l5.6-6.06C13.79,5.12,14.08,5,14.38,5c0.26,0,0.5,0.11,0.63,0.3 c0.07,0.1,0.15,0.26,0.09,0.47l-1.52,4.94L13.18,12h1.35h4.23c0.41,0,0.8,0.17,1.03,0.46C19.92,12.61,20.05,12.86,19.98,13.17z"/>
  </svg>
);

const PlaylistIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22,10H2v4h20V10z M22,6H2v2h20V6z M14,16H2v2h12V16z"/>
    <path d="M18,14v4h2v-4H18z M18,14l3,2l-3,2V14z"/>
  </svg>
);

const EditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3,17.25V21h3.75L17.81,9.94l-3.75-3.75L3,17.25z M20.71,7.04c0.39-0.39,0.39-1.02,0-1.41l-2.34-2.34 c-0.39-0.39-1.02-0.39-1.41,0l-1.83,1.83l3.75,3.75L20.71,7.04z"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
  </svg>
);

const VideoWatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, token } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userLikeStatus, setUserLikeStatus] = useState<boolean | null>(null);
  const [viewIncremented, setViewIncremented] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Создаём экземпляр axios с авторизацией
  const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [videoRes, relatedRes, likesRes] = await Promise.all([
          api.get(`/api/video/${id}`),
          api.get('/api/videos', { params: { skip: 0, limit: 20 } }),
          api.get(`/api/video/${id}/likes`)
        ]);

        const videoData = videoRes.data;
        setVideo(videoData);
        
        try {
          const authorRes = await api.get(`/api/channel/${videoData.author_id}`);
          setAuthorData(authorRes.data);
        } catch (err) {
          console.error('Ошибка загрузки данных автора:', err);
        }
        
        const filtered = relatedRes.data.filter((v: Video) => v.id !== Number(id));
        setRelatedVideos(filtered.slice(0, 10));

        // 🔥 Теперь user_like приходит в ответе /likes
        setLikes(likesRes.data.likes);
        setDislikes(likesRes.data.dislikes);
        setUserLikeStatus(likesRes.data.user_like ?? null);

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить видео');
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, token]);

  useEffect(() => {
    const incrementView = async () => {
      if (id && !loading && !viewIncremented) {
        try {
          await api.post(`/api/video/${id}/view`);
          const videoRes = await api.get(`/api/video/${id}`);
          setVideo(videoRes.data);
          setViewIncremented(true);
        } catch (err) {
          console.error('Ошибка при засчёте просмотра:', err);
        }
      }
    };

    incrementView();
  }, [id, loading, viewIncremented]);

  const toggleLike = async (isLike: boolean) => {
    if (!token) {
      alert('Войдите в аккаунт, чтобы оценивать видео');
      return;
    }

    try {
      await api.post(`/api/video/${id}/like`, { is_like: isLike });
      const res = await api.get(`/api/video/${id}/likes`);
      setLikes(res.data.likes);
      setDislikes(res.data.dislikes);
      setUserLikeStatus(res.data.user_like ?? null);
    } catch (err) {
      console.error('Ошибка при голосовании:', err);
    }
  };

  const handleAddToPlaylist = () => {
    if (!currentUser) {
      alert('Войдите в аккаунт, чтобы добавлять видео в плейлисты');
      return;
    }
    setShowPlaylistModal(true);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('Ссылка скопирована в буфер обмена!');
    }).catch(() => {
      prompt('Ссылка на видео:', url);
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)} млн`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)} тыс.`;
    return views.toString();
  };

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'A';
  };

  if (loading) return <div className="loading-container">Загрузка</div>;
  if (error || !video) return <div className="error-container">{error || 'Видео не найдено'}</div>;

  return (
    <div className="video-watch-page">
      <div className="main-layout">
        <div className="left-column">
          
          {/* Плеер */}
          <div className="video-player-wrapper">
            {video.hls_playlist_path ? (
              <VideoPlayer 
                hlsSrc={`http://localhost:8000/${video.hls_playlist_path.replace(/\\/g, '/')}`}
                mp4Src={video.file_path 
                  ? `http://localhost:8000/${video.file_path.replace(/\\/g, '/')}` 
                  : undefined}
                poster={`http://localhost:8000/media/thumbnails/${video.id}.jpg`}
                videoId={Number(id)}
              />
            ) : video.file_path ? (
              <VideoPlayer 
                mp4Src={`http://localhost:8000/${video.file_path.replace(/\\/g, '/')}`}
                poster={`http://localhost:8000/media/thumbnails/${video.id}.jpg`}
                videoId={Number(id)}
              />
            ) : (
              <div className="processing-message">Видео обрабатывается</div>
            )}
          </div>

          {/* Информация о видео */}
          <div className="video-info-section">
            {/* Заголовок */}
            <h1 className="video-title">{video.title}</h1>
            
            {/* Автор + Подписка */}
            <div className="author-row">
              <div className="author-info">
                <Link to={`/channel/${video.author_id}`} className="author-avatar-link">
                  <div className="author-avatar">
                    {authorData?.avatar_url ? (
                      <img src={authorData.avatar_url} alt={video.author || 'Автор'} />
                    ) : (
                      <div className="default-avatar">
                        {getInitials(video.author || 'А')}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="author-details">
                  <Link to={`/channel/${video.author_id}`} className="author-name">
                    {video.author || 'Аноним'}
                  </Link>
                  <span className="author-subs">Автор</span>
                </div>
              </div>
              
              {video.author_id && currentUser?.id !== video.author_id && (
                <SubscribeButton authorId={video.author_id} />
              )}
            </div>

            {/* Действия */}
            <div className="video-actions-row">
              <div className="like-container">
                <button
                  className={`like-btn ${userLikeStatus === true ? 'active' : ''}`}
                  onClick={() => toggleLike(true)}
                  title="Нравится"
                >
                  <LikeIcon />
                  <span>{likes > 0 ? likes : ''}</span>
                </button>
                <div className="like-divider"></div>
                <button
                  className={`like-btn dislike-btn ${userLikeStatus === false ? 'active' : ''}`}
                  onClick={() => toggleLike(false)}
                  title="Не нравится"
                >
                  <DislikeIcon />
                </button>
              </div>

              <button className="action-btn" onClick={handleShare} title="Поделиться">
                <ShareIcon />
              </button>

              <button className="action-btn" onClick={handleAddToPlaylist} title="Сохранить">
                <PlaylistIcon />
              </button>

              {currentUser && currentUser.id === video.author_id && (
                <Link to={`/video/${video.id}/edit`} className="action-btn" title="Редактировать">
                  <EditIcon />
                </Link>
              )}
            </div>

            {/* Статистика */}
            <div className="video-stats-row">
              <span className="video-stats">
                {formatViews(video.views)} просмотров • {new Date(video.upload_date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Описание */}
            {video.description && (
              <div 
                className="description-box"
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              >
                <p className={`description-text ${!descriptionExpanded ? 'clamped' : ''}`}>
                  {video.description}
                </p>
                {!descriptionExpanded && video.description.length > 150 && (
                  <button className="show-more-btn">Ещё</button>
                )}
              </div>
            )}
          </div>

          {/* Комментарии */}
          <CommentSection videoId={Number(id)} />
        </div>

        {/* Рекомендации */}
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
                  file_path={v.file_path}
                  thumbnail={v.thumbnail}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Модалка */}
      {showPlaylistModal && (
        <div className="modal-overlay" onClick={() => setShowPlaylistModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <AddToPlaylistModal
              videoId={Number(id)}
              onClose={() => setShowPlaylistModal(false)}
              onSuccess={() => setShowPlaylistModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoWatchPage;