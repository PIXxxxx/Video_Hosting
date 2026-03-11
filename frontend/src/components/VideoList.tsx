import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Video {
  id: number;
  title: string;
  author: string;
  views: number;
  upload_date: string;
}

const VideoList: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/videos/');
      setVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Все видео</h2>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {videos.map(video => (
          <div key={video.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>{video.title}</h3>
            <p>Автор: {video.author}</p>
            <p>Просмотров: {video.views}</p>
            <a href={`/video/${video.id}`}>Смотреть</a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoList;