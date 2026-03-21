import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './SubscribeButton.css';

interface SubscribeButtonProps {
  authorId: number;
  initialSubscribed?: boolean;
  initialCount?: number;
  onUpdate?: (subscribed: boolean, count: number) => void;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({
  authorId,
  initialSubscribed = false,
  initialCount = 0,
  onUpdate
}) => {
  const { isAuthenticated } = useAuth();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/subscription/status/${authorId}`);
        setSubscribed(res.data.subscribed);
        setCount(res.data.subscribers_count);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, [authorId]);

  const handleToggle = async () => {
    if (!isAuthenticated) {
      alert('Войдите, чтобы подписаться');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/subscribe/${authorId}`);
      const newSubscribed = res.data.subscribed;
      const newCount = newSubscribed ? count + 1 : count - 1;

      setSubscribed(newSubscribed);
      setCount(newCount);
      if (onUpdate) onUpdate(newSubscribed, newCount);
    } catch (err) {
      console.error(err);
      alert('Ошибка при изменении подписки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="subscribe-wrapper">
      <button
        className={`subscribe-btn ${subscribed ? 'subscribed' : ''}`}
        onClick={handleToggle}
        disabled={loading}
      >
        {loading ? '...' : subscribed ? 'Отписаться' : 'Подписаться'}
      </button>
      <span className="subscribers-count">
        {count} {count === 1 ? 'подписчик' : count < 5 ? 'подписчика' : 'подписчиков'}
      </span>
    </div>
  );
};

export default SubscribeButton;