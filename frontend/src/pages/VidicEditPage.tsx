import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoEditPage.css';

// SVG иконки
const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

const VidicEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const res = await axios.get(`http://localhost:8000/api/vidic/${id}/info`, { headers });
        const data = res.data;
        
        setVideo(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        
        const videoTags = data.tags 
          ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) 
          : [];
        setTags(videoTags);
      } catch (err) {
        console.error(err);
      } finally {
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

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      await axios.put(`http://localhost:8000/api/vidic/${id}/metadata`, {
        title,
        description,
        tags: tags.join(', ')
      }, { headers });
      
      showMessage('Изменения сохранены', 'success');
    } catch (err: any) {
      showMessage('Ошибка: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить это Vidic видео навсегда?')) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      await axios.delete(`http://localhost:8000/api/vidic/${id}`, { headers });
      navigate('/studio');
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  if (loading) {
    return (
      <div className="video-edit-page">
        <div className="edit-loading">
          <div className="edit-spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="video-edit-page">
        <div className="edit-error">
          <p>Vidic видео не найдено</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-edit-page">
      <div className="edit-container">
        <div className="edit-header">
          <h1>Редактирование Vidic видео</h1>
        </div>

        {message && (
          <div className={`edit-message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="edit-content">
          {/* Форма */}
          <div className="edit-form">
            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название Vidic видео"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажите о вашем вертикальном видео..."
                rows={6}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Теги</label>
              <div className="tags-container">
                {tags.map((tag, index) => (
                  <span key={index} className="tag-chip">
                    {tag}
                    <button className="tag-remove" onClick={() => removeTag(tag)} disabled={saving}>×</button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Добавить тег..."
                  disabled={saving}
                />
              </div>
              <span className="tag-hint">Enter для добавления</span>
            </div>

            <button onClick={handleSave} disabled={saving} className="save-btn">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          {/* Сайдбар */}
          <div className="edit-sidebar">
            <div className="thumbnail-section">
              <h3>Миниатюра</h3>
              {video.thumbnail && (
                <div className="thumbnail-preview">
                  <img src={video.thumbnail} alt="Миниатюра" />
                </div>
              )}
              <p style={{ fontSize: '13px', color: 'var(--yt-text-secondary)', marginTop: '8px' }}>
                Миниатюра генерируется автоматически
              </p>
            </div>

            <div className="danger-section">
              <h3>Опасная зона</h3>
              <p>Это действие нельзя отменить</p>
              <button onClick={handleDelete} disabled={saving} className="delete-btn">
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

export default VidicEditPage;