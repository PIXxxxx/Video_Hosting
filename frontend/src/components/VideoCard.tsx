// src/components/VideoCard.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './VideoCard.css';

interface VideoCardProps {
  id: number;
  title: string;
  views: number;
  upload_date: string;
  author_id: number;
  author?: string;
  compact?: boolean;
  enableHoverPreview?: boolean;
  file_path?: string;
  thumbnail?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({
  id,
  title,
  views,
  upload_date,
  author_id,
  author,
  compact = false,
  enableHoverPreview = true,
  file_path,
  thumbnail,
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const previewSrc = file_path 
    ? `http://localhost:8000/${file_path.replace(/\\/g, '/')}` 
    : null;

  // Получаем аватарку автора через API
  useEffect(() => {
    const fetchAuthorAvatar = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/channel/${author_id}`);
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatar_url || '');
        }
      } catch (error) {
        console.error('Ошибка загрузки аватарки:', error);
      }
    };

    if (author_id) {
      fetchAuthorAvatar();
    }
  }, [author_id]);

  const handleMouseEnter = () => {
    if (!enableHoverPreview || !videoRef.current || !imgRef.current || !previewSrc) return;
    imgRef.current.style.opacity = '0';
    videoRef.current.style.opacity = '1';
    videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (!videoRef.current || !imgRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    videoRef.current.style.opacity = '0';
    imgRef.current.style.opacity = '1';
  };

  const thumbnailSrc = thumbnail 
    ? (thumbnail.startsWith('http') ? thumbnail : `http://localhost:8000/${thumbnail}`)
    : `http://localhost:8000/media/thumbnails/${id}.jpg`;

  // Получаем инициалы для дефолтной аватарки
  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'A';
  };

  return (
    <Link 
      to={`/video/${id}`} 
      className={`video-card ${compact ? 'compact' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="thumbnail-container">
        <img
          ref={imgRef}
          src={thumbnailSrc}
          alt={title}
          className="thumbnail"
          loading="lazy"
          onError={(e) => {
            console.log(`Ошибка загрузки превью для видео ${id}`);
            e.currentTarget.src = 'https://via.placeholder.com/320x180/272727/f1f1f1?text=Нет+превью';
            e.currentTarget.onerror = null;
          }}
        />

        {previewSrc && (
          <video
            ref={videoRef}
            className="thumbnail-video"
            src={previewSrc}
            muted
            loop
            playsInline
            preload="none"
          />
        )}
      </div>

      <div className="video-info">
        {/* Аватарка автора */}
        <div className="author-avatar">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={author || 'Автор'}
              onError={(e) => {
                // Если аватарка не загрузилась, показываем инициалы
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const defaultAvatar = document.createElement('div');
                  defaultAvatar.className = 'default-avatar';
                  defaultAvatar.textContent = getInitials(author || 'Аноним');
                  parent.appendChild(defaultAvatar);
                }
              }}
            />
          ) : (
            <div className="default-avatar">
              {getInitials(author || 'Аноним')}
            </div>
          )}
        </div>

        <div className="video-details">
          <h3>{title}</h3>
          
          <div className="video-meta">
            <span 
              className="author-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/channel/${author_id}`;
              }}
            >
              {author || 'Аноним'}
            </span>
          </div>
          
          <p>
            {views.toLocaleString()} просмотров • {new Date(upload_date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;