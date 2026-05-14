// src/components/VidicCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './VidicCard.css';

interface VidicCardProps {
  id: number;
  title: string;
  views: number;
  upload_date: string;
  author_id: number;
  author?: string;
  thumbnail_path?: string | null;
}

const VidicCard: React.FC<VidicCardProps> = ({
  id,
  title,
  views,
  upload_date,
  author_id,
  author,
  thumbnail_path,
}) => {
  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const thumbnailUrl = thumbnail_path 
    ? `http://localhost:8000/media/${thumbnail_path}`
    : `http://localhost:8000/media/vidic_thumbnails/${id}.jpg`;

  return (
    <Link to={`/vidic?video=${id}`} className="vidic-card">
      <div className="vidic-card-thumbnail">
        <img 
          src={thumbnailUrl}
          alt={title}
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/720x1280/1a1a1a/ffffff?text=Vidic';
          }}
        />
      </div>
      <div className="vidic-card-info">
        <h3>{title}</h3>
        <div className="vidic-card-meta">
          <span>{formatViews(views)} просмотров</span>
          <span>•</span>
          <span>{new Date(upload_date).toLocaleDateString('ru-RU')}</span>
        </div>
        <div className="vidic-card-author">
          <span>@{author}</span>
        </div>
      </div>
    </Link>
  );
};

export default VidicCard;