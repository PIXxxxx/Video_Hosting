import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import './SubscriptionsPage.css';

// SVG Иконки
const SubscriptionsEmptyIcon = () => (
  <svg viewBox="0 0 24 24" className="empty-icon">
    <path d="M20 7H4V5h16v2zm0 6H4v-2h16v2zm0 6H4v-2h16v2zm-16 2h16v2H4v-2z" opacity="0.3"/>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
    <path d="M12 17l5-5-1.41-1.41L13 13.17V7h-2v6.17l-2.59-2.58L7 12l5 5z"/>
  </svg>
);

const ExploreIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/>
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--yt-text-secondary)" opacity="0.5">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
  </svg>
);

interface Video {
  id: number;
  title: string;
  author: string;
  author_id: number;
  thumbnail: string;
  upload_date: string;
  views: number;
  file_path?: string;
}

interface SubscribedAuthor {
  author_id: number;
  author_username: string;
  avatar_url?: string;
  subscribers_count: number;
}

const SubscriptionsPage: React.FC = () => {
  const [feed, setFeed] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribedAuthors, setSubscribedAuthors] = useState<SubscribedAuthor[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Загружаем ленту подписок
      const feedResponse = await axios.get('http://localhost:8000/api/me/subscriptions/feed');
      const feedData: Video[] = feedResponse.data;
      setFeed(feedData);
      
      // Собираем уникальных авторов с аватарками
      // Используем Map для уникальности вместо Set
      const uniqueAuthors = new Map<number, Video>();
      feedData.forEach((video: Video) => {
        if (!uniqueAuthors.has(video.author_id)) {
          uniqueAuthors.set(video.author_id, video);
        }
      });
      
      const authorsData: SubscribedAuthor[] = [];
      
      // Итерируем через Map
      for (const [authorId] of Array.from(uniqueAuthors)) {
        try {
          const authorResponse = await axios.get(`http://localhost:8000/api/channel/${authorId}`);
          authorsData.push({
            author_id: authorId,
            author_username: authorResponse.data.username,
            avatar_url: authorResponse.data.avatar_url,
            subscribers_count: authorResponse.data.videos_count || 0
          });
        } catch (err) {
          console.error(`Ошибка загрузки данных автора ${authorId}:`, err);
        }
      }
      
      setSubscribedAuthors(authorsData);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError('Не удалось загрузить ленту подписок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getInitial = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'A';
  };

  if (loading) {
    return (
      <div className="subscriptions-page">
        <div className="subscriptions-header">
          <h1>Подписки</h1>
        </div>
        <div className="loading-subscriptions">
          <div className="loader"></div>
          <p>Загрузка ленты</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="subscriptions-page">
        <div className="subscriptions-header">
          <h1>Подписки</h1>
        </div>
        <div className="error-subscriptions">
          <ErrorIcon />
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button onClick={fetchData}>
            <RefreshIcon />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subscriptions-page">
      <div className="subscriptions-header">
        <h1>Подписки</h1>
        {feed.length > 0 && (
          <p className="subscriptions-subtitle">
            Новые видео от каналов, на которые вы подписаны
          </p>
        )}
      </div>

      {feed.length === 0 ? (
        <div className="empty-subscriptions">
          <SubscriptionsEmptyIcon />
          <h3>Лента пуста</h3>
          <p>Подпишитесь на каналы, чтобы видеть их новые видео здесь</p>
          <Link to="/">
            <button>
              <ExploreIcon />
              Найти каналы
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Горизонтальный список подписок с аватарками */}
          {subscribedAuthors.length > 0 && (
            <div className="subscriptions-row">
              <h2>Ваши подписки</h2>
              <div className="subscriptions-list">
                {subscribedAuthors.map(author => (
                  <Link
                    key={author.author_id}
                    to={`/channel/${author.author_id}`}
                    className="subscription-item"
                  >
                    <div className="subscription-avatar">
                      {author.avatar_url ? (
                        <img 
                          src={author.avatar_url} 
                          alt={author.author_username}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector('.subscription-avatar-placeholder')) {
                              const placeholder = document.createElement('div');
                              placeholder.className = 'subscription-avatar-placeholder';
                              placeholder.textContent = getInitial(author.author_username);
                              parent.appendChild(placeholder);
                            }
                          }}
                        />
                      ) : (
                        <div className="subscription-avatar-placeholder">
                          {getInitial(author.author_username)}
                        </div>
                      )}
                    </div>
                    <span className="subscription-name">{author.author_username}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Сетка видео */}
          <div className="video-grid">
            {feed.map(video => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                views={video.views}
                upload_date={video.upload_date}
                author_id={video.author_id}
                author={video.author}
                thumbnail={video.thumbnail}
                file_path={video.file_path}
                enableHoverPreview={true}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionsPage;