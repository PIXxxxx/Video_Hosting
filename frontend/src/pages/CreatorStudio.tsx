// src/pages/CreatorStudio.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import VideoCard from '../components/VideoCard';
import VidicCard from '../components/VidicCard';
import { useAuth } from '../context/AuthContext';
import './CreatorStudio.css';

// SVG иконки
const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
  </svg>
);

const VidicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75L20.71 7.04z"/>
  </svg>
);

const SelectAllIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
  </svg>
);

const CreatorStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'videos' | 'vidic'>('videos');
  const [videos, setVideos] = useState<any[]>([]);
  const [vidicVideos, setVidicVideos] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const fetchVideos = async () => {
    try {
      const res = await api.get('/api/users/me/videos');
      setVideos(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchVidicVideos = async () => {
    try {
      const res = await api.get('/api/me/vidic');
      setVidicVideos(res.data);
    } catch (err) {
      console.error('Ошибка загрузки Vidic видео:', err);
      setVidicVideos([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchVideos(), fetchVidicVideos()]);
      setLoading(false);
    };
    load();
  }, [token]);

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const currentList = activeTab === 'videos' ? videos : vidicVideos;
    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map((v: any) => v.id)));
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Удалить ${selectedIds.size} видео навсегда?`)) return;

    const idsToDelete = Array.from(selectedIds);
    
    for (const id of idsToDelete) {
      try {
        const endpoint = activeTab === 'videos' ? `/api/video/${id}` : `/api/vidic/${id}`;
        await api.delete(endpoint);
      } catch (err) {
        console.error(`Ошибка удаления ${id}:`, err);
      }
    }

    setSelectedIds(new Set());
    activeTab === 'videos' ? fetchVideos() : fetchVidicVideos();
  };

  const currentList = activeTab === 'videos' ? videos : vidicVideos;

  if (loading) {
    return (
      <div className="studio-page">
        <div className="studio-loading">
          <div className="studio-spinner"></div>
          <p>Загрузка студии...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-page">
      {/* Заголовок */}
      <div className="studio-header">
        <div className="studio-header-left">
          <h1>Творческая студия</h1>
          <span className="studio-count">
            {activeTab === 'videos' ? videos.length : vidicVideos.length} видео
          </span>
        </div>
        
        <div className="studio-header-right">
          {selectedIds.size > 0 && (
            <>
              <span className="selected-count">Выбрано: {selectedIds.size}</span>
              <button className="studio-btn studio-btn-danger" onClick={deleteSelected}>
                <DeleteIcon />
                Удалить
              </button>
            </>
          )}
          <Link to="/upload" className="studio-btn studio-btn-primary">
            <VideoIcon />
            Загрузить
          </Link>
        </div>
      </div>

      {/* Вкладки */}
      <div className="studio-tabs">
        <button 
          className={`studio-tab ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => { setActiveTab('videos'); setSelectedIds(new Set()); }}
        >
          <VideoIcon />
          Видео
        </button>
        <button 
          className={`studio-tab ${activeTab === 'vidic' ? 'active' : ''}`}
          onClick={() => { setActiveTab('vidic'); setSelectedIds(new Set()); }}
        >
          <VidicIcon />
          Vidic
        </button>
      </div>

      {/* Панель действий */}
      <div className="studio-toolbar">
        <button className="studio-select-all" onClick={selectAll}>
          <SelectAllIcon />
          {selectedIds.size === currentList.length && currentList.length > 0 ? 'Снять выделение' : 'Выбрать все'}
        </button>
      </div>

      {/* Контент */}
      <div className="studio-content">
        {currentList.length === 0 ? (
          <div className="studio-empty">
            <VideoIcon />
            <h3>Нет видео</h3>
            <p>Загрузите своё первое видео</p>
            <Link to="/upload" className="studio-btn studio-btn-primary">
              Загрузить видео
            </Link>
          </div>
        ) : activeTab === 'videos' ? (
          <div className="studio-video-grid">
            {videos.map(video => (
              <div key={video.id} className={`studio-video-item ${selectedIds.has(video.id) ? 'selected' : ''}`}>
                <div className="studio-video-checkbox" onClick={() => toggleSelect(video.id)}>
                  <div className={`checkbox ${selectedIds.has(video.id) ? 'checked' : ''}`}>
                    {selectedIds.has(video.id) && <SelectAllIcon />}
                  </div>
                </div>
                <div className="studio-video-card">
                  <VideoCard
                    id={video.id}
                    title={video.title}
                    views={video.views}
                    upload_date={video.upload_date}
                    author_id={video.author_id}
                    author={video.author}
                    thumbnail={video.thumbnail}
                    file_path={video.file_path}
                  />
                </div>
                <div className="studio-video-actions">
                  <Link to={`/video/${video.id}/edit`} className="studio-edit-btn">
                    <EditIcon />
                    Изменить
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="studio-vidic-grid">
            {vidicVideos.map(video => (
              <div key={video.id} className={`studio-video-item ${selectedIds.has(video.id) ? 'selected' : ''}`}>
                <div className="studio-video-checkbox" onClick={() => toggleSelect(video.id)}>
                  <div className={`checkbox ${selectedIds.has(video.id) ? 'checked' : ''}`}>
                    {selectedIds.has(video.id) && <SelectAllIcon />}
                  </div>
                </div>
                <div className="studio-video-card">
                  <VidicCard {...video} />
                </div>
                <div className="studio-video-actions">
                  <Link to={`/vidic/${video.id}/edit`} className="studio-edit-btn">
                    <EditIcon />
                    Изменить
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorStudio;