import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from './UploadForm.module.css'; // Импорт как модуль

const UploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [uploadedVideo, setUploadedVideo] = useState<{ id: number; title: string } | null>(null);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]); // Изменено на массив
    const [tagInput, setTagInput] = useState(''); // Для ввода нового тега
    const { user } = useAuth();

    // Добавление тега
    const addTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
        }
        setTagInput('');
    };

    // Удаление тега
    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((tag: string) => tag !== tagToRemove));
    };

    // Обработка нажатия клавиш
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
        // Преобразуем массив тегов в строку через запятую
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
            
            // Очищаем форму
            setTitle('');
            setDescription('');
            setTags([]); // Очищаем массив тегов
            setTagInput(''); // Очищаем поле ввода тегов
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
                        />
                    </div>

                    <div className={styles['form-group']}>
                        <label>Описание видео</label>
                        <textarea
                            className={styles['form-textarea']}
                            placeholder="Описание видео (можно использовать ссылки, тайм-коды и т.д.)"
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
                                disabled={uploading}
                            />
                        </div>
                        <small className={styles['tag-hint']}>Нажмите Enter для добавления тега</small>
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
                                📹 {file ? 'Файл выбран' : 'Выберите видео'}
                            </label>
                        </div>
                        {file && <div className={styles['file-name']}>{file.name}</div>}
                    </div>
                    
                    <button type="submit" disabled={uploading} className={styles['submit-button']}>
                        {uploading ? '⏳ Загрузка...' : '🚀 Загрузить видео'}
                    </button>
                </form>

                {message && (
                    <div className={`${styles.message} ${styles.success}`}>
                        <p>✅ {message}</p>
                        {uploadedVideo && (
                            <div className={styles['video-info']}>
                                <p>Видео "{uploadedVideo.title}" загружено!</p>
                                <p>Оно будет доступно после обработки</p>
                                <a href={`/video/${uploadedVideo.id}`}>
                                    Перейти к видео →
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className={`${styles.message} ${styles.error}`}>
                        <p>❌ {error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadForm;