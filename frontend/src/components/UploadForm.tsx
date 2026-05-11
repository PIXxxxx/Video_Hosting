import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './UploadForm.module.css';
import { Link } from 'react-router-dom';

// SVG иконки
const VideoIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
  </svg>
);

const VidicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="3" fill="#ff0000"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
  </svg>
);

const UploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [uploadedVideo, setUploadedVideo] = useState<{ id: number; title: string } | null>(null);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const { user } = useAuth();

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Выберите файл для загрузки');
            return;
        }

        setUploading(true);
        setMessage('');
        setError('');
        setUploadedVideo(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('tags', tags.join(', '));

        try {
            const response = await axios.post('http://localhost:8000/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
            });
            
            setMessage('Видео успешно загружено!');
            setUploadedVideo({
                id: response.data.video_id,
                title: response.data.title
            });
            
            setTitle('');
            setDescription('');
            setTags([]);
            setTagInput('');
            setFile(null);
            
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            
        } catch (error: any) {
            console.error('Ошибка загрузки:', error);
            setError(error.response?.data?.detail || 'Ошибка при загрузке видео');
            
            if (error.response?.status === 401) {
                setError('Сессия истекла. Пожалуйста, войдите заново.');
            }
        } finally {
            setUploading(false);
        }
    };

    if (!user) {
        return (
            <div className={styles['auth-message']}>
                <p>Для загрузки видео необходимо <a href="/login">войти</a> в аккаунт</p>
            </div>
        );
    }

    return (
        <div className={styles['upload-container']}>
            <div className={styles['upload-type-selector']}>
                <Link to="/upload" className={styles['upload-link-active']}>
                    <VideoIcon />
                    Обычное видео
                </Link>
                <Link to="/upload/vidic" className={styles['upload-link']}>
                    <VidicIcon />
                    Vidic
                </Link>
            </div>
            
            <div className={styles['upload-form']}>
                <form onSubmit={handleSubmit}>
                    <div className={styles['form-group']}>
                        <label>Название видео</label>
                        <input
                            className={styles['form-input']}
                            type="text"
                            placeholder="Введите название видео..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={uploading}
                            required
                        />
                    </div>
                    
                    <div className={styles['form-group']}>
                        <label>Описание</label>
                        <textarea
                            className={styles['form-textarea']}
                            placeholder="Расскажите о вашем видео..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={6}
                            disabled={uploading}
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
                                        ×
                                    </span>
                                </div>
                            ))}
                            <input
                                type="text"
                                className={styles['tag-input']}
                                placeholder="Добавить тег..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={uploading}
                            />
                        </div>
                        <span className={styles['tag-hint']}>Нажмите Enter для добавления</span>
                    </div>
                    
                    <div className={styles['form-group']}>
                        <label>Видео файл</label>
                        <div className={styles['file-input-wrapper']}>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                disabled={uploading}
                                className={styles['file-input']}
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className={styles['file-input-label']}>
                                <UploadIcon />
                                {file ? 'Файл выбран' : 'Выберите видео для загрузки'}
                            </label>
                        </div>
                        {file && <div className={styles['file-name']}>{file.name}</div>}
                    </div>
                    
                    <button type="submit" disabled={uploading} className={styles['submit-button']}>
                        {uploading ? 'Загрузка...' : 'Загрузить видео'}
                    </button>
                </form>

                {message && (
                    <div className={`${styles.message} ${styles.success}`}>
                        <p>{message}</p>
                        {uploadedVideo && (
                            <div className={styles['video-info']}>
                                <p>Видео "{uploadedVideo.title}" загружено!</p>
                                <p>Оно будет доступно после обработки</p>
                                <a href={`/video/${uploadedVideo.id}`}>Перейти к видео</a>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className={`${styles.message} ${styles.error}`}>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadForm;