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
    const [tags, setTags] = useState('');
    const { user } = useAuth();

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
        formData.append('tags', tags);

        try {
            const response = await axios.post('http://localhost:8000/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
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
            setTags('');
            setFile(null);
            
            // Очищаем input file
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            
        } catch (error: any) {
            console.error('Ошибка загрузки:', error);
            setError(error.response?.data?.detail || 'Ошибка при загрузке видео');
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
                        <input
                            className={styles['form-tags']}
                            type="text"
                            placeholder="python, fastapi, видеоурок"
                            value={tags}
                            onChange={e => setTags(e.target.value)}
                            disabled={uploading}
                        />
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