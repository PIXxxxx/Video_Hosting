// src/pages/VidicEditPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './VideoEditPage.css'; // используем те же стили

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

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/vidic/${id}`);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`http://localhost:8000/api/vidic/${id}/metadata`, {
        title,
        description,
        tags: tags.join(', ')
      });
      setMessage('Изменения успешно сохранены ✓');
    } catch (err: any) {
      setMessage('Ошибка при сохранении: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить это Vidic видео навсегда?')) return;
    
    try {
      await axios.delete(`http://localhost:8000/api/vidic/${id}`);
      alert('Vidic видео успешно удалено');
      navigate('/studio');
    } catch (err) {
      alert('Ошибка при удалении');
    }
  };

  if (loading) return <div className="loading">Загрузка Vidic видео...</div>;
  if (!video) return <div className="error-container">Vidic видео не найдено</div>;

  return (
    <div className="video-edit-page">
      <div className="edit-container">
        <h1>Редактирование Vidic видео</h1>

        {message && <div className="edit-message success">{message}</div>}

        <div className="edit-content">
          {/* Основная форма */}
          <div className="edit-form">
            <div className="form-group">
              <label>Название видео</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название Vidic видео"
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажите о вашем вертикальном видео..."
                rows={6}
              />
            </div>

            <div className="form-group">
              <label>Теги</label>
              <div className="tags-container">
                {tags.map((tag, index) => (
                  <span key={index} className="tag-chip">
                    {tag}
                    <button onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Добавьте тег..."
                />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="save-btn">
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>

          {/* Боковая панель с информацией и удалением */}
          <div className="edit-sidebar">
            <div className="thumbnail-section">
              <h3>Миниатюра</h3>
              {video.thumbnail && (
                <div className="thumbnail-preview">
                  <img src={video.thumbnail} alt="Vidic thumbnail" />
                </div>
              )}
              <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
                Миниатюра генерируется автоматически
              </p>
            </div>

            <div className="danger-section">
              <h3>Опасная зона</h3>
              <p>Это действие нельзя отменить</p>
              <button onClick={handleDelete} className="delete-btn">
                🗑 Удалить Vidic видео
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VidicEditPage;