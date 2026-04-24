import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';

const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://localhost:8000/api/playlist/${id}`)
      .then(res => setPlaylist(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Загрузка плейлиста...</p>;
  if (!playlist) return <p>Плейлист не найден</p>;

  return (
    <div className="playlist-page">
      <div className="playlist-header">
        <h1>{playlist.title}</h1>
        {playlist.is_private && <span>🔒 Приватный</span>}
        <p>{playlist.description}</p>
        <p>Автор: <Link to={`/channel/${playlist.author_id}`}>{playlist.author}</Link></p>
      </div>

      <div className="video-grid">
        {playlist.videos.map((v: any) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            views={v.views}
            upload_date={new Date().toISOString()} // можно добавить в бэк
            author_id={playlist.author_id}
            author={v.author}
            thumbnail={v.thumbnail}
            enableHoverPreview={true}
          />
        ))}
      </div>

      {playlist.videos.length === 0 && <p>В плейлисте пока нет видео</p>}
    </div>
  );
};

export default PlaylistPage;