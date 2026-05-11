// src/pages/VidicFeed.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import VidicVideoPlayer from '../components/VidicVideoPlayer';
import { useAuth } from '../context/AuthContext';
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

interface VidicComment {
  id: number;
  text: string;
  username: string;
  user_id: number;
  user_avatar?: string;
  created_at: string;
}

const VidicFeed: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetVideoId = searchParams.get('video');
  const { user: currentUser, token } = useAuth();
  
  const [videos, setVideos] = useState<VidicVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const [likesState, setLikesState] = useState<Record<number, { count: number; liked: boolean }>>({});
  const hasInitialized = useRef(false);
  const [showComments, setShowComments] = useState(false);
  const [subscribedAuthors, setSubscribedAuthors] = useState<Record<number, boolean>>({});
  const [comments, setComments] = useState<VidicComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorAvatars, setAuthorAvatars] = useState<Record<number, string>>({});
  const [commentAvatars, setCommentAvatars] = useState<Record<number, string>>({});

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  // Загрузка аватарки
  const fetchAvatar = async (userId: number, type: 'author' | 'comment') => {
    const cache = type === 'author' ? authorAvatars : commentAvatars;
    const setCache = type === 'author' ? setAuthorAvatars : setCommentAvatars;
    
    if (cache[userId]) return;
    try {
      const response = await api.get(`/api/channel/${userId}`);
      if (response.data?.avatar_url) {
        setCache(prev => ({ ...prev, [userId]: response.data.avatar_url }));
      }
    } catch (err) {}
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await api.get('/api/vidic/feed?limit=50');
        const initialLikes: Record<number, { count: number; liked: boolean }> = {};
        response.data.forEach((video: VidicVideo) => {
          initialLikes[video.id] = { count: video.likes_count || 0, liked: video.is_liked || false };
        });
        setLikesState(initialLikes);
        
        if (targetVideoId) {
          const targetId = parseInt(targetVideoId);
          const targetVideo = response.data.find((v: VidicVideo) => v.id === targetId);
          const otherVideos = response.data.filter((v: VidicVideo) => v.id !== targetId);
          if (targetVideo) setVideos([targetVideo, ...otherVideos]);
          else setVideos(response.data);
        } else {
          setVideos(response.data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setLoading(false);
      }
    };
    fetchVideos();
  }, [targetVideoId, token]);

  // Загружаем аватарки авторов
  useEffect(() => {
    videos.forEach(video => {
      if (video.author_id) fetchAvatar(video.author_id, 'author');
    });
  }, [videos]);

  // Загружаем аватарки комментаторов
  useEffect(() => {
    comments.forEach(comment => {
      if (comment.user_id) fetchAvatar(comment.user_id, 'comment');
    });
  }, [comments]);

  useEffect(() => {
    if (!loading && feedRef.current && !hasInitialized.current && targetVideoId) {
      feedRef.current.scrollTo({ top: 0, behavior: 'auto' });
      hasInitialized.current = true;
    }
  }, [loading, targetVideoId]);

  useEffect(() => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo || !token) return;
    
    api.get(`/api/subscription/status/${currentVideo.author_id}`)
      .then(res => setSubscribedAuthors(prev => ({ ...prev, [currentVideo.author_id]: res.data.subscribed })))
      .catch(() => {});
  }, [currentIndex, videos, token]);

  const loadComments = async () => {
    const currentVideo = videos[currentIndex];
    if (!currentVideo) return;
    try {
      const res = await api.get(`/api/vidic/${currentVideo.id}/comments`);
      setComments(res.data || []);
    } catch (err) { console.error('Ошибка загрузки комментариев:', err); }
  };

  const handleComment = () => {
    setShowComments(!showComments);
    if (!showComments) loadComments();
  };

  const sendComment = async () => {
    if (!newComment.trim() || !token) return;
    const currentVideo = videos[currentIndex];
    try {
      await api.post(`/api/vidic/${currentVideo.id}/comments`, { text: newComment });
      setNewComment('');
      loadComments();
    } catch (err) { console.error('Ошибка отправки:', err); }
  };

  const incrementView = async (videoId: number) => {
    try { await api.post(`/api/vidic/${videoId}/view`); } catch (err) {}
  };

  const handleLike = async (videoId: number) => {
    if (!token) { alert('Войдите, чтобы ставить лайки'); return; }
    try {
      const current = likesState[videoId];
      setLikesState(prev => ({ ...prev, [videoId]: { count: current.liked ? current.count - 1 : current.count + 1, liked: !current.liked } }));
      const response = await api.post(`/api/vidic/${videoId}/like`);
      setLikesState(prev => ({ ...prev, [videoId]: { count: response.data.likes_count, liked: response.data.liked } }));
    } catch (err) {
      const current = likesState[videoId];
      setLikesState(prev => ({ ...prev, [videoId]: { count: current.count, liked: !current.liked } }));
    }
  };

  const handleShare = () => {
    const currentVideo = videos[currentIndex];
    const url = `${window.location.origin}/vidic?video=${currentVideo.id}`;
    navigator.clipboard.writeText(url).then(() => alert('Ссылка скопирована!')).catch(() => prompt('Ссылка:', url));
  };

  const handleSubscribe = async (authorId: number) => {
    if (!token) { alert('Войдите, чтобы подписаться'); return; }
    try {
      const res = await api.post(`/api/subscribe/${authorId}`);
      setSubscribedAuthors(prev => ({ ...prev, [authorId]: res.data.subscribed }));
    } catch (err) { console.error('Ошибка подписки:', err); }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const viewportHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / viewportHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
      window.history.replaceState({}, '', `/vidic?video=${videos[newIndex].id}`);
      setShowComments(false);
    }
  }, [currentIndex, videos]);

  const formatTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} дн`;
  };

  const getInitials = (name: string) => name?.charAt(0).toUpperCase() || 'A';

  if (loading) return (
    <div className="vidic-loading"><div className="loading-spinner"></div><p>Загрузка...</p></div>
  );

  if (videos.length === 0) return (
    <div className="vidic-empty"><div className="empty-icon">📱</div><h3>Пока нет Vidic видео</h3><a href="/upload/vidic" className="upload-link">Загрузить видео</a></div>
  );

  const currentVideo = videos[currentIndex];

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
            onComment={handleComment}
            onShare={handleShare}
          />

          <div className="vidic-info-overlay">
            <div className="vidic-author-info">
              <div className="vidic-author-avatar-wrapper">
                {authorAvatars[video.author_id] ? (
                  <img src={authorAvatars[video.author_id]} alt={video.author} className="vidic-author-avatar"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                ) : null}
                <div className={`vidic-default-avatar ${authorAvatars[video.author_id] ? 'hidden' : ''}`}>
                  {getInitials(video.author || 'А')}
                </div>
              </div>
              <span className="vidic-author-name">@{video.author}</span>
              {currentUser?.id !== video.author_id && (
                <button className={`vidic-subscribe-btn ${subscribedAuthors[video.author_id] ? 'subscribed' : ''}`}
                  onClick={() => handleSubscribe(video.author_id)}>
                  {subscribedAuthors[video.author_id] ? '✓ Вы подписаны' : 'Подписаться'}
                </button>
              )}
            </div>
            <h4 className="vidic-title">{video.title}</h4>
            <p className="vidic-description-text">{video.description}</p>
          </div>

          {showComments && index === currentIndex && (
            <div className="vidic-comments-panel" onClick={e => e.stopPropagation()}>
              <div className="vidic-comments-header">
                <h3>Комментарии ({comments.length})</h3>
                <button onClick={() => setShowComments(false)}>✕</button>
              </div>
              <div className="vidic-comments-list">
                {comments.length === 0 ? (
                  <p className="vidic-no-comments">Пока нет комментариев</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="vidic-comment-item">
                      <div className="vidic-comment-header">
                        <div className="vidic-comment-avatar-wrapper">
                          {commentAvatars[comment.user_id] ? (
                            <img src={commentAvatars[comment.user_id]} alt={comment.username} className="vidic-comment-avatar"
                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                          ) : null}
                          <div className={`vidic-comment-default-avatar ${commentAvatars[comment.user_id] ? 'hidden' : ''}`}>
                            {getInitials(comment.username)}
                          </div>
                        </div>
                        <span className="vidic-comment-username">@{comment.username}</span>
                        <span className="vidic-comment-time">{formatTimeAgo(comment.created_at)}</span>
                      </div>
                      <p className="vidic-comment-text">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>
              {token && (
                <div className="vidic-comment-form">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="Добавить комментарий..." className="vidic-comment-input"
                    onKeyDown={e => e.key === 'Enter' && sendComment()} />
                  <button className="vidic-comment-send" onClick={sendComment}>➤</button>
                </div>
              )}
              {!token && <p className="vidic-auth-hint">Войдите, чтобы оставить комментарий</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VidicFeed;