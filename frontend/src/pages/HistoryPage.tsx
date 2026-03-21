import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoCard from '../components/VideoCard';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8000/api/me/watch-history')
      .then(res => setHistory(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="history-page">
      <h1>История просмотров</h1>
      {loading ? <p>Загрузка...</p> : history.length === 0 ? <p>История пока пуста</p> : (
        <div className="history-list">
          {history.map(item => (
            <VideoCard key={item.id} {...item} compact={true} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;