import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UploadForm = () => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [uploadedVideo, setUploadedVideo] = useState<{ id: number; title: string } | null>(null);
    
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
            setFile(null);
            
        } catch (error: any) {
            console.error('Ошибка загрузки:', error);
            setError(error.response?.data?.detail || 'Ошибка при загрузке видео');
        } finally {
            setUploading(false);
        }
    };

    if (!user) {
        return (
            <div className="message error">
                <p>Для загрузки видео необходимо <a href="/login">войти</a> в аккаунт</p>
            </div>
        );
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Название видео"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                />
                
                <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={uploading}
                />
                
                <button type="submit" disabled={uploading}>
                    {uploading ? 'Загрузка...' : 'Загрузить видео'}
                </button>
            </form>

            {message && (
                <div className="message">
                    <p>{message}</p>
                    {uploadedVideo && (
                        <div className="video-info">
                            <p>Видео "{uploadedVideo.title}" загружено!</p>
                            <p>Оно будет доступно после обработки</p>
                            <p>
                                <a href={`/video/${uploadedVideo.id}`}>
                                    Перейти к видео →
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="message error">
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default UploadForm;