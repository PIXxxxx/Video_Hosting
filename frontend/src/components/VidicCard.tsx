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
  thumbnail?: string;
}

const VidicCard: React.FC<VidicCardProps> = ({
  id,
  title,
  views,
  upload_date,
  author_id,
  author,
  thumbnail,
}) => {
  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <Link to={`/vidic?video=${id}`} className="vidic-card">
      <div className="vidic-card-thumbnail">
        <img 
          src={thumbnail || `https://via.placeholder.com/720x1280/1a1a1a/ffffff?text=Vidic`} 
          alt={title}
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/720x1280/1a1a1a/ffffff?text=Vidic';
          }}
        />
        <div className="vidic-card-badge">📱</div>
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