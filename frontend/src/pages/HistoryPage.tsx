import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import './HistoryPage.css';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/me/watch-history');
      setHistory(res.data);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Закрыть меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeFromHistory = async (videoId: number) => {
    if (!window.confirm('Удалить это видео из истории?')) return;

    try {
      await axios.delete(`http://localhost:8000/api/me/watch-history/${videoId}`);
      setHistory(prev => prev.filter(item => item.id !== videoId));
    } catch (err) {
      alert('Не удалось удалить видео из истории');
    }
    setMenuOpenId(null);
  };

  const openPlaylistModal = (videoId: number) => {
    setSelectedVideoId(videoId);
    setShowPlaylistModal(true);
    setMenuOpenId(null);
  };

  const clearAllHistory = async () => {
    if (!window.confirm('Очистить всю историю просмотров? Это действие нельзя отменить.')) return;

    try {
      await axios.delete('http://localhost:8000/api/me/watch-history');
      setHistory([]);
      alert('История успешно очищена');
    } catch (err) {
      alert('Не удалось очистить историю');
    }
  };

  if (loading) return <div className="loading">Загрузка истории...</div>;

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>История просмотров</h1>
        <button 
          className="clear-btn" 
          onClick={clearAllHistory}
          disabled={history.length === 0}
        >
          Очистить историю
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 13c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" fill="currentColor"/>
          </svg>
          <p>История просмотров пуста</p>
          <small>Здесь будут отображаться видео, которые вы посмотрели</small>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="video-wrapper">
                <VideoCard
                  id={item.id}
                  title={item.title}
                  views={item.views}
                  upload_date={item.upload_date}
                  author_id={item.author_id}
                  author={item.author || 'Аноним'}
                  thumbnail={item.thumbnail}
                  file_path={item.file_path}
                  compact={true}
                  enableHoverPreview={true}
                />
              </div>

              <div className="menu-container">
                <button 
                  className="menu-button"
                  onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>

                {menuOpenId === item.id && (
                  <div className="menu-dropdown" ref={menuRef}>
                    <button onClick={() => removeFromHistory(item.id)} className="menu-item">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Удалить из истории
                    </button>
                    <button onClick={() => openPlaylistModal(item.id)} className="menu-item">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
                      </svg>
                      Добавить в плейлист
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showPlaylistModal && selectedVideoId && (
        <AddToPlaylistModal
          videoId={selectedVideoId}
          onClose={() => {
            setShowPlaylistModal(false);
            setSelectedVideoId(null);
          }}
        />
      )}
    </div>
  );
};

export default HistoryPage;