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
  enableHoverPreview?: boolean;     // ← теперь можно включать везде
  file_path?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({
  id, title, views, upload_date, author, author_id, compact = false,
  enableHoverPreview = true,        // ← по умолчанию ВКЛЮЧЕНО везде
  file_path
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
          src={`http://localhost:8000/media/thumbnails/${id}.jpg`}
          alt={title}
          className="thumbnail"
          onError={(e) => { 
            e.currentTarget.src = 'https://via.placeholder.com/320x180/222/fff?text=Нет+превью'; 
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
            style={{ objectFit: 'contain', background: '#000' }}
          />
        )}

        <div className="play-overlay">▶</div>
      </div>

      <div className="video-info">
        <h3>{title}</h3>
        <p>
        <Link to={`/channel/${author_id}`} className="author-link">
            {author || 'Аноним'}
        </Link>
        </p>
        <p>{views} просмотров • {new Date(upload_date).toLocaleDateString()}</p>
      </div>
    </Link>
    
  );
};

export default VideoCard;