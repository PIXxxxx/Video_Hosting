// src/pages/CreatorStudio.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import VidicCard from '../components/VidicCard';
import './CreatorStudio.css';

const CreatorStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'videos' | 'vidic'>('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [vidicVideos, setVidicVideos] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Загрузка обычных видео
  const fetchVideos = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/users/me/videos');
      setVideos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Загрузка Vidic видео
  const fetchVidicVideos = async () => {
    try {
        const res = await axios.get('http://localhost:8000/api/me/vidic');
        setVidicVideos(res.data);
    } catch (err) {
        console.error('Ошибка загрузки Vidic видео:', err);
        setVidicVideos([]);
    }
    };

  useEffect(() => {
    fetchVideos();
    fetchVidicVideos();
    setLoading(false);
  }, []);

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const deleteSelected = async () => {
  if (!selectedIds.size) return;
  
  if (!window.confirm(`Удалить ${selectedIds.size} выбранных видео навсегда?`)) {
    return;
  }

  try {
    // Преобразуем Set в Array — решает проблему совместимости
    const idsToDelete = Array.from(selectedIds);
    
    for (const id of idsToDelete) {
      try {
        if (activeTab === 'videos') {
          await axios.delete(`http://localhost:8000/api/video/${id}`);
        } else {
          await axios.delete(`http://localhost:8000/api/vidic/${id}`);
        }
      } catch (err) {
        console.error(`Ошибка удаления видео ${id}:`, err);
      }
    }

    setSelectedIds(new Set());
    
    // Обновляем список
    if (activeTab === 'videos') {
      fetchVideos();
    } else {
      fetchVidicVideos();
    }

    alert(`Успешно удалено ${idsToDelete.length} видео`);
  } catch (err) {
    console.error(err);
    alert('Произошла ошибка при удалении');
  }
};

  return (
    <div className="studio-page">
      <div className="studio-header">
        <h1>Творческая студия</h1>
        {selectedIds.size > 0 && (
          <button className="delete-selected-btn" onClick={deleteSelected}>
            Удалить выбранные ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="studio-tabs">
        <button className={activeTab === 'videos' ? 'active' : ''} onClick={() => setActiveTab('videos')}>
          Видео
        </button>
        <button className={activeTab === 'vidic' ? 'active' : ''} onClick={() => setActiveTab('vidic')}>
          Vidic
        </button>
      </div>

      <div className="studio-content">
        {activeTab === 'videos' ? (
          <div className="video-grid">
            {videos.map(video => (
              <div key={video.id} className="studio-video-item">
                <input
                  type="checkbox"
                  checked={selectedIds.has(video.id)}
                  onChange={() => toggleSelect(video.id)}
                />
                <VideoCard
                  id={video.id}
                  title={video.title}
                  views={video.views}
                  upload_date={video.upload_date}
                  author_id={video.author_id}
                  author={video.author}
                  thumbnail={video.thumbnail}
                  compact={true}
                />
                <Link to={`/video/${video.id}/edit`} className="edit-link">Редактировать</Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="vidic-grid">
            {vidicVideos.map(video => (
              <div key={video.id} className="studio-video-item">
                <input
                  type="checkbox"
                  checked={selectedIds.has(video.id)}
                  onChange={() => toggleSelect(video.id)}
                />
                <VidicCard {...video} />
                <Link to={`/vidic/${video.id}/edit`} className="edit-link">Редактировать</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorStudio;