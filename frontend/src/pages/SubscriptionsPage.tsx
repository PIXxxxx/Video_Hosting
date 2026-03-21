import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoCard from '../components/VideoCard';

const SubscriptionsPage: React.FC = () => {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8000/api/me/subscriptions/feed')
      .then(res => setFeed(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="subscriptions-page">
      <h1>Подписки</h1>
      {loading ? <p>Загрузка...</p> : feed.length === 0 ? <p>Нет новых видео от авторов, на которых вы подписаны</p> : (
        <div className="video-grid">
          {feed.map(v => <VideoCard key={v.id} {...v} compact={true} />)}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;