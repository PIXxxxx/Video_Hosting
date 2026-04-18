// src/components/VideoCard.tsx
import React, { useRef } from 'react';
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

  const previewSrc = file_path 
    ? `http://localhost:8000/${file_path.replace(/\\/g, '/')}` 
    : null;

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
    : `http://localhost:8000/media/thumbnails/${id}.jpg?v=${Date.now()}`;

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
          onError={(e) => {
            console.log(`Ошибка загрузки превью для видео ${id}`);
            e.currentTarget.src = 'https://via.placeholder.com/320x180/222/fff?text=Нет+превью';
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

        <div className="play-overlay">▶</div>
      </div>

      <div className="video-info">
        <h3>{title}</h3>
        <p>
          {/* Исправлено: используем span + onClick вместо вложенного Link */}
          <span 
            className="author-link"
            onClick={(e) => {
              e.stopPropagation();           // предотвращаем переход по видео
              window.location.href = `/channel/${author_id}`; // ручной переход
            }}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            {author || 'Аноним'}
          </span>
        </p>
        <p>{views} просмотров • {new Date(upload_date).toLocaleDateString()}</p>
      </div>
    </Link>
  );
};

export default VideoCard;