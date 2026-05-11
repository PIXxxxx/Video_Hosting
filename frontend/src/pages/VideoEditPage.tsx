import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoEditPage.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  tags?: string | null;
  thumbnail?: string;
  custom_thumbnail_path?: string;
  is_private?: boolean;
}

// SVG иконки
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
  </svg>
);

const VideoEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/video/${id}`);
        const data = response.data;

        setVideo(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIsPrivate(data.is_private || false);

        let parsedTags: string[] = [];
        if (data.tags) {
          if (typeof data.tags === 'string') {
            parsedTags = data.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter((tag: string) => tag.length > 0);
          } else if (Array.isArray(data.tags)) {
            parsedTags = data.tags;
          }
        }
        setTags(parsedTags);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video:', error);
        setLoading(false);
      }
    };

    if (id) fetchVideo();
  }, [id]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag: string) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    const tagsString = tags.join(', ');

    try {
      await axios.put(`http://localhost:8000/api/video/${id}/metadata`, {
        title,
        description,
        tags: tagsString,
        is_private: isPrivate
      });

      showMessage('Изменения сохранены', 'success');
    } catch (error) {
      console.error(error);
      showMessage('Ошибка при сохранении', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Видео и все файлы будут удалены навсегда. Продолжить?')) return;
    
    setSaving(true);
    try {
      await axios.delete(`http://localhost:8000/api/video/${id}`);
      showMessage('Видео удалено', 'success');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      showMessage('Ошибка удаления', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile) return;

    setSaving(true);
    const formData = new FormData();
    formData.append('thumbnail', thumbnailFile);

    try {
      await axios.post(`http://localhost:8000/api/video/${id}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const thumbnailPath = `thumbnails/custom_thumb_${id}.jpg`;
      setVideo(prev => prev ? {
        ...prev,
        custom_thumbnail_path: thumbnailPath,
        thumbnail: `http://localhost:8000/media/${thumbnailPath}`
      } : null);
      
      showMessage('Обложка обновлена', 'success');
      setThumbnailFile(null);
      
      const fileInput = document.getElementById('thumbnail-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error(error);
      showMessage('Ошибка при загрузке обложки', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="edit-loading">
      <div className="edit-spinner"></div>
      <p>Загрузка...</p>
    </div>
  );

  if (!video) return (
    <div className="edit-error">
      <p>Видео не найдено</p>
    </div>
  );

  return (
    <div className="video-edit-page">
      <div className="edit-container">
        <div className="edit-header">
          <h1>Редактирование видео</h1>
        </div>
        
        {message && (
          <div className={`edit-message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="edit-content">
          {/* Левая колонка - форма */}
          <div className="edit-form">
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Введите название видео"
                disabled={saving}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Расскажите о вашем видео..."
                rows={6}
                disabled={saving}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label>Теги</label>
              <div className="tags-container">
                {tags.map((tag, index) => (
                  <span key={index} className="tag-chip">
                    {tag}
                    <button 
                      className="tag-remove"
                      onClick={() => removeTag(tag)}
                      disabled={saving}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input"
                  placeholder="Добавить тег..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={saving}
                />
              </div>
              <span className="tag-hint">Enter для добавления</span>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  disabled={saving}
                  className="form-checkbox"
                />
                <LockIcon />
                Приватное видео
              </label>
            </div>

            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="save-btn"
            >
              <SaveIcon />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          {/* Правая колонка - обложка */}
          <div className="edit-sidebar">
            <div className="thumbnail-section">
              <h3>Обложка видео</h3>
              
              <div className="thumbnail-preview">
                <img 
                  src={video.custom_thumbnail_path 
                    ? `http://localhost:8000/media/${video.custom_thumbnail_path}`
                    : `http://localhost:8000/media/thumbnails/${video.id}.jpg`
                  } 
                  alt="Обложка" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/320x180/272727/f1f1f1?text=Нет+превью';
                  }}
                />
              </div>
              
              <label htmlFor="thumbnail-input" className="upload-thumb-btn">
                <UploadIcon />
                Выбрать изображение
              </label>
              <input
                id="thumbnail-input"
                type="file"
                accept="image/*"
                onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
                disabled={saving}
                style={{ display: 'none' }}
              />
              
              {thumbnailFile && (
                <div className="thumbnail-file-name">{thumbnailFile.name}</div>
              )}
              
              <button 
                onClick={handleThumbnailUpload} 
                disabled={!thumbnailFile || saving}
                className="upload-thumb-submit"
              >
                Загрузить обложку
              </button>
            </div>

            <div className="danger-section">
              <h3>Опасная зона</h3>
              <p>После удаления видео нельзя восстановить</p>
              <button 
                onClick={handleDelete} 
                disabled={saving} 
                className="delete-btn"
              >
                <DeleteIcon />
                Удалить видео
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditPage;