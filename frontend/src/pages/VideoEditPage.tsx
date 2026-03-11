import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Video {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  thumbnail?: string;
  custom_thumbnail_path?: string;
}

const VideoEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/video/${id}`);
        setVideo(response.data);
        setTitle(response.data.title || '');
        setDescription(response.data.description || '');
        setTags(response.data.tags || '');
        setLoading(false);
      } catch (error) {
        console.error('Error fetching video:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await axios.put(`http://localhost:8000/api/video/${id}/metadata`, {
        title,
        description,
        tags
      });
      setMessage('✅ Изменения сохранены');
    } catch (error) {
      console.error('Error saving video:', error);
      setMessage('❌ Ошибка при сохранении');
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // Обновляем состояние с новой обложкой
    const thumbnailPath = `thumbnails/custom_thumb_${id}.jpg`;
    setVideo(prev => prev ? {
      ...prev,
      custom_thumbnail_path: thumbnailPath,
      thumbnail: `http://localhost:8000/media/${thumbnailPath}`
    } : null);
    
    setMessage('✅ Обложка обновлена');
    setThumbnailFile(null);
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    setMessage('❌ Ошибка при загрузке обложки');
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return <div className="loading-container">Загрузка...</div>;
  }

  if (!video) {
    return <div className="error-container">Видео не найдено</div>;
  }

  return (
    <div className="video-edit-page">
      <h1>Редактировать видео</h1>
      
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="edit-form">
        <div className="form-group">
          <label>Название видео</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Введите название видео"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label>Описание</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание видео (можно использовать ссылки, тайм-коды и т.д.)"
            rows={6}
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label>Теги</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Теги через запятую (python, fastapi, видеоурок)"
            disabled={saving}
          />
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="save-button"
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>

        <h3>Изменить обложку</h3>
        <div className="thumbnail-section">
          {video.thumbnail && (
            <div className="current-thumbnail">
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
            type="file"
            accept="image/*"
            onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
            disabled={saving}
          />
          
          <button 
            onClick={handleThumbnailUpload} 
            disabled={!thumbnailFile || saving}
            className="upload-button"
          >
            Загрузить новую обложку
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoEditPage;