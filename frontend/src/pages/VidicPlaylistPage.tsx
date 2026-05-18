import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VidicCard from '../components/VidicCard';
import './PlaylistPage.css';

const PlaylistIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
    <path d="M22,10H2v4h20V10z M22,6H2v2h20V6z M14,16H2v2h12V16z"/>
    <path d="M18,14v4h2v-4H18z M18,14l3,2l-3,2V14z"/>
  </svg>
);

interface VidicVideo {
  id: number;
  title: string;
  description?: string;
  video_url: string;
  views: number;
  thumbnail: string;
  upload_date: string;
}

const VidicPlaylistPage: React.FC = () => {
  const [videos, setVideos] = useState<VidicVideo[]>([]);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const res = await axios.get('http://localhost:8000/api/me/liked-vidic-playlist', { headers });
        setVideos(res.data.videos || []);
        setPlaylistTitle(res.data.playlist?.title || 'Понравившиеся Vidic');
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, []);

  if (loading) return <div className="loading-container"><p>Загрузка...</p></div>;

  return (
    <div className="playlist-page">
      <div className="playlist-header">
        <div className="playlist-header-top">
          <div className="playlist-icon"><PlaylistIcon /></div>
          <div className="playlist-info">
            <h1>{playlistTitle}</h1>
            <p>{videos.length} видео</p>
          </div>
        </div>
      </div>
      <div className="playlist-content">
        {videos.length === 0 ? (
          <div className="empty-state"><p>Пока нет понравившихся Vidic</p></div>
        ) : (
          <div className="vidic-grid">
            {videos.map(v => (
              <VidicCard
                key={v.id}
                id={v.id}
                title={v.title}
                views={v.views}
                upload_date={v.upload_date}
                author_id={0}
                author=""
                thumbnail_path={v.thumbnail}
                />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VidicPlaylistPage;