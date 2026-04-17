import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './VideoEditPage.module.css';

interface Video {
  id: number;
  title: string;
  description?: string;
  tags?: string | null;
  thumbnail?: string;
  custom_thumbnail_path?: string;
  is_private?: boolean;
}

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

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/video/${id}`);
        const data = response.data;

        console.log('Полученные данные видео:', data); // Отладка
        console.log('Теги из БД:', data.tags); // Отладка

        setVideo(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIsPrivate(data.is_private || false);

        // Улучшенный парсинг тегов
        let parsedTags: string[] = [];
        
        if (data.tags) {
          if (typeof data.tags === 'string') {
            // Если строка с запятыми
            parsedTags = data.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter((tag: string) => tag.length > 0);
          } else if (Array.isArray(data.tags)) {
            // Если вдруг приходит массивом
            parsedTags = data.tags;
          }
        }
        
        console.log('Распарсенные теги:', parsedTags); // Отладка
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

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    // Преобразуем теги в строку для сохранения
    const tagsString = tags.join(', ');
    console.log('Сохраняем теги:', tagsString); // Отладка

    try {
      await axios.put(`http://localhost:8000/api/video/${id}/metadata`, {
        title,
        description,
        tags: tagsString,
        is_private: isPrivate
      });

      setMessage('✅ Изменения сохранены');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setMessage('❌ Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('❗ ВНИМАНИЕ! Видео и все файлы будут удалены НАВСЕГДА. Продолжить?')) return;
    
    setSaving(true);
    try {
      await axios.delete(`http://localhost:8000/api/video/${id}`);
      setMessage('✅ Видео удалено');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      setMessage('❌ Ошибка удаления');
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailUpload = async () => {
    if (!thumbnailFile) return;

    setSaving(true);
    setMessage('');
    
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
      
      setMessage('✅ Обложка обновлена');
      setThumbnailFile(null);
      
      const fileInput = document.getElementById('thumbnail-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error(error);
      setMessage('❌ Ошибка при загрузке обложки');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles['loading-container']}>⏳ Загрузка...</div>;
  if (!video) return <div className={styles['error-container']}>❌ Видео не найдено</div>;

  return (
    <div className={styles['video-edit-page']}>
      <h1>✏️ Редактировать видео</h1>
      
      {message && (
        <div className={`${styles.message} ${message.includes('✅') ? styles.success : styles.error}`}>
          {message}
        </div>
      )}

      <div className={styles['edit-form']}>
        <div className={styles['form-group']}>
          <label>Название видео</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Введите название видео"
            disabled={saving}
          />
        </div>

        <div className={styles['form-group']}>
          <label>Описание</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание видео..."
            rows={6}
            disabled={saving}
          />
        </div>

        <div className={styles['form-group']}>
          <label>Теги</label>
          <div className={styles['tags-input-container']}>
            {tags.map((tag, index) => (
              <div key={index} className={styles['tag-chip']}>
                {tag}
                <span 
                  className={styles['tag-remove']}
                  onClick={() => removeTag(tag)}
                >
                  ✕
                </span>
              </div>
            ))}
            <input
              type="text"
              className={styles['tag-input']}
              placeholder="Новый тег + Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
            />
          </div>
          <small className={styles['tag-hint']}>Нажмите Enter для добавления тега</small>
        </div>

        <div className={styles['form-group']}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              disabled={saving}
            />
            <span>🔒 Приватное видео</span>
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className={styles['save-button']}>
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>

        <h3>Изменить обложку</h3>
        <div className={styles['thumbnail-section']}>
          {video.thumbnail && (
            <div className={styles['current-thumbnail']}>
              <img 
                src={video.custom_thumbnail_path 
                  ? `http://localhost:8000/media/${video.custom_thumbnail_path}`
                  : `http://localhost:8000/media/thumbnails/${video.id}.jpg`
                } 
                alt="Current thumbnail" 
              />
            </div>
          )}
          
          <input
            id="thumbnail-input"
            type="file"
            accept="image/*"
            onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
            disabled={saving}
          />
          
          <button 
            onClick={handleThumbnailUpload} 
            disabled={!thumbnailFile || saving}
            className={styles['upload-button']}
          >
            📸 Загрузить новую обложку
          </button>
        </div>

        <button onClick={handleDelete} disabled={saving} className={styles['delete-button']}>
          🗑️ Удалить видео навсегда
        </button>
      </div>
    </div>
  );
};

export default VideoEditPage;